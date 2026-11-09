'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useSocket } from '@/lib/socket-client';
import { soundManager } from '@/lib/sound';
import {
  RotateCcw,
  ArrowLeftRight,
  Play,
  Pause,
  AlertTriangle,
  CheckCircle,
  Volume2,
  VolumeX,
  Clock,
  Award,
  ChevronDown,
  RefreshCw,
  History,
} from 'lucide-react';
import { MatchData, AuditActionType } from '@/types';

export default function RefereePage() {
  const { data: session } = useSession();
  const { isConnected, subscribeToScore } = useSocket();

  const [selectedCourt, setSelectedCourt] = useState<number>(1);
  const [matches, setMatches] = useState<MatchData[]>([]);
  const [activeMatch, setActiveMatch] = useState<MatchData | null>(null);
  const [loading, setLoading] = useState(true);
  const [optimisticUpdatePending, setOptimisticUpdatePending] = useState(false);

  // Verification Modals
  const [showEndSetModal, setShowEndSetModal] = useState(false);
  const [showEndMatchModal, setShowEndMatchModal] = useState(false);
  const [matchWinnerCandidate, setMatchWinnerCandidate] = useState<string | null>(null);

  // Timer states (Stopwatch count-up)
  const [timerSeconds, setTimerSeconds] = useState<number>(0);
  const [timerRunning, setTimerRunning] = useState<boolean>(false);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Audit history dropdown
  const [showAuditDrawer, setShowAuditDrawer] = useState(false);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // Fetch matches for the chosen court
  const fetchMatches = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/matches?court=${selectedCourt}`);
      if (res.ok) {
        const data: MatchData[] = await res.json();
        setMatches(data);
        // Find match that is IN_PROGRESS first, or first SCHEDULED match
        const inProgress = data.find((m) => m.status === 'IN_PROGRESS');
        const candidate = inProgress || data.find((m) => m.status === 'SCHEDULED') || data[0] || null;
        setActiveMatch(candidate);

        if (candidate) {
          // If candidate has a saved timer value (<600), use it; otherwise start from 0
          const initialSecs = candidate.timerRemainingSeconds && candidate.timerRemainingSeconds < 600 ? candidate.timerRemainingSeconds : 0;
          setTimerSeconds(initialSecs);
          setTimerRunning(candidate.timerIsRunning ?? false);
          // fetch full match audit log
          fetchMatchDetails(candidate.id);
        }
      }
    } catch (err) {
      console.error('Error fetching matches:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedCourt]);

  const fetchMatchDetails = async (matchId: string) => {
    try {
      const res = await fetch(`/api/matches/${matchId}`);
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data.auditLogs || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  // Subscribe to real-time score updates to stay 100% in sync
  useEffect(() => {
    const unsubscribe = subscribeToScore((payload: any) => {
      if (activeMatch && payload.matchId === activeMatch.id) {
        setActiveMatch((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            status: payload.status,
            winnerTeamId: payload.winnerTeamId,
            winnerTeam: payload.winnerTeam,
            courtSideSwitched: payload.courtSideSwitched,
            currentSet: payload.currentSet,
            sets: payload.sets,
          };
        });

        if (payload.auditLog) {
          setAuditLogs((prev) => [payload.auditLog, ...prev]);
        }
      }
    });

    return () => unsubscribe();
  }, [activeMatch, subscribeToScore]);

  // Stopwatch timer logic (counts UP from 00:00 to track match duration)
  useEffect(() => {
    if (timerRunning) {
      timerIntervalRef.current = setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    }

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [timerRunning]);

  const toggleTimer = async () => {
    const nextRunning = !timerRunning;
    setTimerRunning(nextRunning);
    if (activeMatch) {
      fetch(`/api/matches/${activeMatch.id}/score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'UPDATE_TIMER',
          timerRemainingSeconds: timerSeconds,
          timerIsRunning: nextRunning,
        }),
      }).catch(console.error);
    }
  };

  const resetTimer = () => {
    setTimerRunning(false);
    setTimerSeconds(0);
    if (activeMatch) {
      fetch(`/api/matches/${activeMatch.id}/score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'UPDATE_TIMER',
          timerRemainingSeconds: 0,
          timerIsRunning: false,
        }),
      }).catch(console.error);
    }
  };

  // Perform score mutations with optimistic UI update
  const mutateScore = async (action: string, team?: 'A' | 'B') => {
    if (!activeMatch) return;

    // Trigger local tactile sound
    if (action === 'ADD_POINT') soundManager.playPointBeep();
    if (action === 'UNDO' || action === 'SUBTRACT_POINT') soundManager.playUndoSound();

    // Optimistic local state update
    const currentSetNum = activeMatch.currentSet || 1;
    const currentSet = activeMatch.sets.find((s) => s.setNumber === currentSetNum) || {
      id: 'opt',
      matchId: activeMatch.id,
      setNumber: currentSetNum,
      teamAScore: 0,
      teamBScore: 0,
      isFinished: false,
    };

    let optA = currentSet.teamAScore;
    let optB = currentSet.teamBScore;
    let optSwitched = activeMatch.courtSideSwitched;

    if (action === 'ADD_POINT') {
      if (team === 'A') optA += 1;
      if (team === 'B') optB += 1;
    } else if (action === 'UNDO' || action === 'SUBTRACT_POINT') {
      if (team === 'A' && optA > 0) optA -= 1;
      else if (team === 'B' && optB > 0) optB -= 1;
      else if (!team) {
        // Rollback last team who scored if known
        if (optA > 0) optA -= 1;
        else if (optB > 0) optB -= 1;
      }
    } else if (action === 'SWITCH_COURT') {
      optSwitched = !optSwitched;
    }

    // Apply optimistic update immediately
    const updatedSets = activeMatch.sets.map((s) =>
      s.setNumber === currentSetNum ? { ...s, teamAScore: optA, teamBScore: optB } : s
    );

    setActiveMatch({
      ...activeMatch,
      status: 'IN_PROGRESS',
      courtSideSwitched: optSwitched,
      sets: updatedSets,
    });

    setOptimisticUpdatePending(true);

    try {
      const res = await fetch(`/api/matches/${activeMatch.id}/score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          team,
          timerRemainingSeconds: timerSeconds,
          timerIsRunning: timerRunning,
        }),
      });

      if (res.ok) {
        const result = await res.json();
        setActiveMatch(result.match);
        if (result.auditLog) {
          setAuditLogs((prev) => [result.auditLog, ...prev]);
        }

        // Check if match completed
        if (result.match.status === 'COMPLETED') {
          soundManager.playVictoryFanfare();
          setShowEndMatchModal(true);
        }
      }
    } catch (err) {
      console.error('Score mutation error:', err);
      // Revert on error
      fetchMatchDetails(activeMatch.id);
    } finally {
      setOptimisticUpdatePending(false);
    }
  };

  const handleConfirmFinishMatch = async (winnerId?: string) => {
    if (!activeMatch) return;
    try {
      const res = await fetch(`/api/matches/${activeMatch.id}/score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'FINISH_MATCH',
          winnerTeamId: winnerId,
        }),
      });
      if (res.ok) {
        const result = await res.json();
        setActiveMatch(result.match);
        setShowEndMatchModal(false);
        soundManager.playVictoryFanfare();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Format timer as MM:SS
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (loading && !activeMatch) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-sai-cyan mx-auto mb-2" />
          <p className="text-sm text-slate-400">Loading Referee Scoreboard...</p>
        </div>
      </div>
    );
  }

  const currentSetNum = activeMatch?.currentSet || 1;
  const currentSet = activeMatch?.sets.find((s) => s.setNumber === currentSetNum) || {
    teamAScore: 0,
    teamBScore: 0,
  };

  const isSwitched = activeMatch?.courtSideSwitched ?? false;
  // Left and Right representations based on court side switch
  const leftTeam = isSwitched ? activeMatch?.teamB : activeMatch?.teamA;
  const rightTeam = isSwitched ? activeMatch?.teamA : activeMatch?.teamB;
  const leftScore = isSwitched ? currentSet.teamBScore : currentSet.teamAScore;
  const rightScore = isSwitched ? currentSet.teamAScore : currentSet.teamBScore;
  const leftTeamLetter = isSwitched ? 'B' : 'A';
  const rightTeamLetter = isSwitched ? 'A' : 'B';

  return (
    <div className="mx-auto max-w-4xl px-3 sm:px-4 py-3 sm:py-6 select-none">
      {/* Top Bar: Court Picker & Quick Match Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 p-3 rounded-2xl mb-4 backdrop-blur-md">
        {/* Court Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
          {[1, 2, 3].map((cNum) => (
            <button
              key={cNum}
              onClick={() => setSelectedCourt(cNum)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedCourt === cNum
                  ? 'bg-sai-cyan text-slate-950 shadow-md shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Court {cNum}
            </button>
          ))}
        </div>

        {/* Match selector dropdown */}
        <div className="flex items-center gap-2">
          <select
            value={activeMatch?.id || ''}
            onChange={(e) => {
              const selected = matches.find((m) => m.id === e.target.value);
              if (selected) {
                setActiveMatch(selected);
                const initialSecs = selected.timerRemainingSeconds && selected.timerRemainingSeconds < 600 ? selected.timerRemainingSeconds : 0;
                setTimerSeconds(initialSecs);
                setTimerRunning(selected.timerIsRunning ?? false);
                fetchMatchDetails(selected.id);
              }
            }}
            className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white focus:outline-none focus:ring-1 focus:ring-sai-cyan max-w-[320px] truncate"
          >
            {matches.map((m) => (
              <option key={m.id} value={m.id}>
                {m.matchCode} ({m.category}): {m.teamA.player1.name} & {m.teamA.player2.name} ({m.teamA.teamCode}) vs {m.teamB.player1.name} & {m.teamB.player2.name} ({m.teamB.teamCode}) [{m.status}]
              </option>
            ))}
          </select>

          <button
            onClick={() => setShowAuditDrawer(!showAuditDrawer)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:text-white"
            title="Score Audit Log"
          >
            <History className="h-4 w-4" />
          </button>
        </div>
      </div>

      {activeMatch ? (
        <div className="space-y-4">
          {/* Match Banner & Rules Info */}
          <div className="flex items-center justify-between px-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-white text-sm">{activeMatch.matchCode}</span>
              <span className="rounded bg-sai-cyan/20 px-2 py-0.5 text-[10px] font-bold text-sai-cyan uppercase">
                {activeMatch.category} - {activeMatch.roundType}
              </span>
              <span className="text-slate-400">
                {activeMatch.rulesMode === 'SINGLE_SET_10MIN' ? '1 Set Sudden Death (21 pts / 10 min)' : 'Best of 3 Sets (21 pts deuce max 30)'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                  activeMatch.status === 'IN_PROGRESS'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 animate-pulse'
                    : activeMatch.status === 'COMPLETED'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {activeMatch.status}
              </span>
              {activeMatch.rulesMode === 'BO3' && (
                <span className="rounded bg-slate-800 px-2 py-0.5 text-[11px] font-bold text-slate-300">
                  Set {currentSetNum} of 3
                </span>
              )}
            </div>
          </div>

          {/* Match Elapsed Duration Stopwatch Widget */}
          <div className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/90 p-3.5 shadow-lg">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-xl font-mono text-xl font-black transition-all ${
                  timerRunning
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-500 animate-pulse shadow-md shadow-emerald-500/20'
                    : 'bg-slate-950 text-sai-cyan border border-slate-800'
                }`}
              >
                <Clock className="h-6 w-6" />
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                  Thời gian thi đấu (Match Stopwatch)
                </div>
                <div className="font-mono text-2xl font-black text-white">
                  {formatTime(timerSeconds)}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={toggleTimer}
                className={`flex items-center gap-1.5 rounded-xl px-4 py-2 font-black text-xs uppercase tracking-wider transition ${
                  timerRunning
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                    : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400 shadow-lg shadow-emerald-500/20'
                }`}
              >
                {timerRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                <span>{timerRunning ? 'Tạm dừng' : 'Bắt đầu'}</span>
              </button>

              <button
                onClick={resetTimer}
                className="rounded-xl border border-slate-700 bg-slate-800 p-2 text-slate-400 hover:text-white"
                title="Đặt lại đồng hồ về 00:00"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* MASSIVE TOUCH SCOREBOARD (Referee Main Canvas) */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {/* LEFT TEAM TOUCH TARGET */}
            <div className="flex flex-col rounded-3xl border-2 border-slate-800 bg-gradient-to-b from-slate-900 via-slate-900 to-sai-navy-950 p-4 shadow-2xl relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="rounded-lg bg-slate-800 px-2 py-0.5 text-xs font-bold text-slate-300">
                  {isSwitched ? 'Sân Phải' : 'Sân Trái'}
                </span>
                <span className="font-extrabold text-xs text-sai-cyan tracking-wider">
                  TEAM {leftTeamLetter}
                </span>
              </div>

              {/* Team Name and Players - Athlete Names Large & Prominent */}
              <div className="text-center mb-3 min-h-[64px] flex flex-col justify-center">
                <h3 className="text-xl sm:text-2xl font-black text-white leading-tight">
                  <div>{leftTeam?.player1.name}</div>
                  <div className="text-slate-300 font-bold">{leftTeam?.player2.name}</div>
                </h3>
                <div className="mt-1.5 flex items-center justify-center gap-1.5">
                  <span className="rounded-full bg-sai-cyan/20 border border-sai-cyan/40 px-2.5 py-0.5 text-xs font-mono font-black text-sai-cyan">
                    {leftTeam?.teamCode}
                  </span>
                  <span className="text-[11px] text-slate-400 font-bold">
                    ({leftTeam?.totalPower} điểm)
                  </span>
                </div>
              </div>

              {/* MASSIVE SCORE BUTTON (+1 POINT) */}
              <button
                onClick={() => mutateScore('ADD_POINT', leftTeamLetter)}
                className="group relative flex-1 flex flex-col items-center justify-center rounded-2xl bg-gradient-to-tr from-cyan-600 to-sai-cyan py-10 sm:py-14 text-white shadow-xl shadow-cyan-500/20 active:scale-95 transition-all hover:brightness-110"
              >
                <span className="text-6xl sm:text-8xl font-black tracking-tight font-mono drop-shadow-md">
                  {leftScore}
                </span>
                <span className="mt-2 text-xs font-black uppercase tracking-widest text-slate-950 bg-white/80 px-3 py-1 rounded-full group-hover:scale-105 transition-transform">
                  +1 ĐIỂM
                </span>
              </button>

              {/* Individual Undo for Left Team */}
              <div className="mt-3 flex justify-center">
                <button
                  onClick={() => mutateScore('SUBTRACT_POINT', leftTeamLetter)}
                  disabled={leftScore <= 0}
                  className="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-white disabled:opacity-30 transition"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Undo (-1)</span>
                </button>
              </div>
            </div>

            {/* RIGHT TEAM TOUCH TARGET */}
            <div className="flex flex-col rounded-3xl border-2 border-slate-800 bg-gradient-to-b from-slate-900 via-slate-900 to-sai-navy-950 p-4 shadow-2xl relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="rounded-lg bg-slate-800 px-2 py-0.5 text-xs font-bold text-slate-300">
                  {isSwitched ? 'Sân Trái' : 'Sân Phải'}
                </span>
                <span className="font-extrabold text-xs text-sai-yellow tracking-wider">
                  TEAM {rightTeamLetter}
                </span>
              </div>

              {/* Team Name and Players - Athlete Names Large & Prominent */}
              <div className="text-center mb-3 min-h-[64px] flex flex-col justify-center">
                <h3 className="text-xl sm:text-2xl font-black text-white leading-tight">
                  <div>{rightTeam?.player1.name}</div>
                  <div className="text-slate-300 font-bold">{rightTeam?.player2.name}</div>
                </h3>
                <div className="mt-1.5 flex items-center justify-center gap-1.5">
                  <span className="rounded-full bg-sai-yellow/20 border border-sai-yellow/40 px-2.5 py-0.5 text-xs font-mono font-black text-sai-yellow">
                    {rightTeam?.teamCode}
                  </span>
                  <span className="text-[11px] text-slate-400 font-bold">
                    ({rightTeam?.totalPower} điểm)
                  </span>
                </div>
              </div>

              {/* MASSIVE SCORE BUTTON (+1 POINT) */}
              <button
                onClick={() => mutateScore('ADD_POINT', rightTeamLetter)}
                className="group relative flex-1 flex flex-col items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-600 to-sai-yellow py-10 sm:py-14 text-white shadow-xl shadow-yellow-500/20 active:scale-95 transition-all hover:brightness-110"
              >
                <span className="text-6xl sm:text-8xl font-black tracking-tight font-mono drop-shadow-md text-slate-950">
                  {rightScore}
                </span>
                <span className="mt-2 text-xs font-black uppercase tracking-widest text-slate-950 bg-white/80 px-3 py-1 rounded-full group-hover:scale-105 transition-transform">
                  +1 ĐIỂM
                </span>
              </button>

              {/* Individual Undo for Right Team */}
              <div className="mt-3 flex justify-center">
                <button
                  onClick={() => mutateScore('SUBTRACT_POINT', rightTeamLetter)}
                  disabled={rightScore <= 0}
                  className="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-white disabled:opacity-30 transition"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Undo (-1)</span>
                </button>
              </div>
            </div>
          </div>

          {/* UMPIRE ACTION CONTROLS */}
          <div className="grid grid-cols-3 gap-3">
            {/* Global Undo Button */}
            <button
              onClick={() => mutateScore('UNDO')}
              className="flex items-center justify-center gap-2 rounded-2xl border border-slate-800 bg-slate-900 py-3.5 px-4 font-bold text-xs uppercase tracking-wider text-slate-300 hover:text-white hover:bg-slate-800 transition active:scale-98 shadow"
            >
              <RotateCcw className="h-4 w-4 text-rose-400" />
              <span>Instant Undo</span>
            </button>

            {/* Switch Court Side Button */}
            <button
              onClick={() => mutateScore('SWITCH_COURT')}
              className="flex items-center justify-center gap-2 rounded-2xl border border-slate-800 bg-slate-900 py-3.5 px-4 font-bold text-xs uppercase tracking-wider text-slate-300 hover:text-white hover:bg-slate-800 transition active:scale-98 shadow"
            >
              <ArrowLeftRight className="h-4 w-4 text-sai-cyan" />
              <span>Switch Court</span>
            </button>

            {/* End Set / End Match Button */}
            <button
              onClick={() => setShowEndMatchModal(true)}
              className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 py-3.5 px-4 font-bold text-xs uppercase tracking-wider text-slate-950 hover:brightness-110 transition active:scale-98 shadow-lg shadow-emerald-500/20"
            >
              <CheckCircle className="h-4 w-4" />
              <span>Finish Match</span>
            </button>
          </div>

          {/* Audit Log Drawer */}
          {showAuditDrawer && (
            <div className="rounded-2xl border border-slate-800 bg-slate-950/90 p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <History className="h-3.5 w-3.5 text-sai-cyan" />
                  Score Audit Trail ({auditLogs.length} events)
                </h4>
                <button
                  onClick={() => setShowAuditDrawer(false)}
                  className="text-xs text-slate-500 hover:text-white"
                >
                  Close
                </button>
              </div>

              <div className="max-h-48 overflow-y-auto space-y-1.5 text-xs font-mono">
                {auditLogs.length === 0 ? (
                  <p className="text-slate-600 italic">No points scored yet.</p>
                ) : (
                  auditLogs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800/80"
                    >
                      <span className="text-slate-400">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                      <span
                        className={`font-bold ${
                          log.actionType === 'ADD_POINT'
                            ? 'text-emerald-400'
                            : log.actionType === 'SUBTRACT_POINT'
                            ? 'text-rose-400'
                            : 'text-sai-cyan'
                        }`}
                      >
                        {log.actionType}
                      </span>
                      <span className="font-bold text-white">
                        {log.scoreSnapshotA} - {log.scoreSnapshotB}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-12 text-center">
          <p className="text-slate-400 text-sm">No matches scheduled for Court {selectedCourt}.</p>
        </div>
      )}

      {/* END OF MATCH VERIFICATION MODAL */}
      {showEndMatchModal && activeMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sai-cyan/20 text-sai-cyan">
                <Award className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Verify Match Completion</h3>
                <p className="text-xs text-slate-400">Confirm winner for {activeMatch.matchCode}</p>
              </div>
            </div>

            {/* Recorded Match Duration */}
            <div className="flex items-center justify-between p-3 mb-4 rounded-2xl bg-slate-950/80 border border-slate-800">
              <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-sai-cyan" />
                Thời lượng trận đấu (Duration):
              </span>
              <span className="font-mono text-base font-black text-sai-yellow">
                {formatTime(timerSeconds)}
              </span>
            </div>

            <p className="text-xs text-slate-300 mb-4">
              Vui lòng xác minh tỉ số và chọn cặp vận động viên chiến thắng để lưu thời gian và phát trực tiếp kết quả:
            </p>

            <div className="grid grid-cols-2 gap-3 mb-6">
              <button
                onClick={() => handleConfirmFinishMatch(activeMatch.teamAId)}
                className="p-4 rounded-2xl border-2 border-sai-cyan/40 bg-sai-cyan/10 hover:bg-sai-cyan/20 text-center transition group"
              >
                <div className="font-black text-sm text-white leading-tight">
                  <div>{activeMatch.teamA.player1.name}</div>
                  <div className="text-slate-300">{activeMatch.teamA.player2.name}</div>
                </div>
                <div className="mt-1.5 inline-block rounded-md bg-sai-cyan/20 border border-sai-cyan/40 px-2 py-0.5 text-[11px] font-mono font-bold text-sai-cyan">
                  {activeMatch.teamA.teamCode}
                </div>
                <div className="text-3xl font-black text-sai-cyan font-mono mt-2">
                  {currentSet.teamAScore}
                </div>
                <div className="mt-2 text-[10px] font-black text-slate-400 uppercase tracking-wider group-hover:text-sai-cyan transition">
                  Xác nhận Thắng
                </div>
              </button>

              <button
                onClick={() => handleConfirmFinishMatch(activeMatch.teamBId)}
                className="p-4 rounded-2xl border-2 border-sai-yellow/40 bg-sai-yellow/10 hover:bg-sai-yellow/20 text-center transition group"
              >
                <div className="font-black text-sm text-white leading-tight">
                  <div>{activeMatch.teamB.player1.name}</div>
                  <div className="text-slate-300">{activeMatch.teamB.player2.name}</div>
                </div>
                <div className="mt-1.5 inline-block rounded-md bg-sai-yellow/20 border border-sai-yellow/40 px-2 py-0.5 text-[11px] font-mono font-bold text-sai-yellow">
                  {activeMatch.teamB.teamCode}
                </div>
                <div className="text-3xl font-black text-sai-yellow font-mono mt-2">
                  {currentSet.teamBScore}
                </div>
                <div className="mt-2 text-[10px] font-black text-slate-400 uppercase tracking-wider group-hover:text-sai-yellow transition">
                  Xác nhận Thắng
                </div>
              </button>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowEndMatchModal(false)}
                className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-bold text-slate-300 hover:text-white"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

