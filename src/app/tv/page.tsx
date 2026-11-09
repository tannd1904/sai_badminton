'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSocket } from '../../lib/socket-client';
import { MatchData } from '../../types';
import { Maximize2, Minimize2, Tv, Clock, Trophy } from 'lucide-react';
import { useLanguage } from '../../lib/i18n';

export default function TVScoreboardPage() {
  const { t, locale } = useLanguage();
  const { subscribeToScore, subscribeToMatchStatus } = useSocket();
  const [selectedCourt, setSelectedCourt] = useState<number | 'ALL'>('ALL');
  const [matches, setMatches] = useState<MatchData[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const fetchMatches = useCallback(async () => {
    try {
      const res = await fetch('/api/matches');
      if (res.ok) {
        const data: MatchData[] = await res.json();
        setMatches(data);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  useEffect(() => {
    const unsubScore = subscribeToScore((payload: any) => {
      setMatches((prev) =>
        prev.map((m) => {
          if (m.id === payload.matchId) {
            return {
              ...m,
              status: payload.status,
              winnerTeamId: payload.winnerTeamId,
              winnerTeam: payload.winnerTeam,
              courtSideSwitched: payload.courtSideSwitched,
              currentSet: payload.currentSet,
              sets: payload.sets,
              timerRemainingSeconds: payload.timerRemainingSeconds,
              timerIsRunning: payload.timerIsRunning,
            };
          }
          return m;
        })
      );
    });

    const unsubStatus = subscribeToMatchStatus(() => {
      fetchMatches();
    });

    return () => {
      unsubScore();
      unsubStatus();
    };
  }, [subscribeToScore, subscribeToMatchStatus, fetchMatches]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const formatTimer = (secs: number | null | undefined) => {
    if (secs === null || secs === undefined) return '10:00';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getCourtMatch = (courtNum: number) => {
    const courtMatches = matches.filter((m) => m.courtNumber === courtNum);
    return (
      courtMatches.find((m) => m.status === 'IN_PROGRESS') ||
      courtMatches.find((m) => m.status === 'SCHEDULED') ||
      courtMatches.find((m) => m.status === 'COMPLETED')
    );
  };

  const renderSingleCourtTV = (match: MatchData | undefined, courtNum: number) => {
    if (!match) {
      return (
        <div className="flex flex-col items-center justify-center p-12 bg-slate-900/60 rounded-3xl border border-slate-800 text-slate-500">
          <p className="text-xl font-bold">
            {locale === 'vi' ? `Sân ${courtNum} hiện đang trống` : `Court ${courtNum} Currently Idle`}
          </p>
        </div>
      );
    }

    const currentSetNum = match.currentSet || 1;
    const currentSet = match.sets.find((s) => s.setNumber === currentSetNum) || {
      teamAScore: 0,
      teamBScore: 0,
    };

    const isSwitched = match.courtSideSwitched;
    const leftTeam = isSwitched ? match.teamB : match.teamA;
    const rightTeam = isSwitched ? match.teamA : match.teamB;
    const leftScore = isSwitched ? currentSet.teamBScore : currentSet.teamAScore;
    const rightScore = isSwitched ? currentSet.teamAScore : currentSet.teamBScore;

    return (
      <div className="flex flex-col rounded-3xl border-2 border-slate-800 bg-gradient-to-b from-slate-900 via-slate-950 to-sai-navy-950 p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-sai-cyan to-blue-600 text-slate-950 font-black text-xl shadow-lg shadow-cyan-500/20">
              C{courtNum}
            </span>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white">
                {locale === 'vi' ? `Sân ${courtNum} Trực Tiếp` : `Court ${courtNum} Live`}
              </h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="font-mono text-xs font-bold text-sai-cyan">{match.matchCode}</span>
                <span className="text-xs text-slate-400">·</span>
                <span className="text-xs font-bold text-slate-300">{match.category} ({match.roundType})</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 px-4 py-2 rounded-2xl">
              <Clock className="h-5 w-5 text-sai-yellow" />
              <span className="font-mono text-2xl font-black text-white">
                {formatTimer(match.timerRemainingSeconds)}
              </span>
            </div>
            <span
              className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider ${
                match.status === 'IN_PROGRESS'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 animate-pulse'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {match.status}
            </span>
          </div>
        </div>

        {/* Score Board Display */}
        <div className="grid grid-cols-7 items-center gap-4 my-8">
          {/* Left Team - Athlete Names Prominent */}
          <div className="col-span-3 text-center">
            <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl">
              <h3 className="text-2xl sm:text-4xl font-black text-white mb-2 leading-tight">
                <div>{leftTeam.player1.name}</div>
                <div className="text-slate-200">{leftTeam.player2.name}</div>
              </h3>
              <div className="inline-flex items-center gap-2 rounded-xl bg-sai-cyan/20 border border-sai-cyan/40 px-3.5 py-1 text-sm font-mono font-black text-sai-cyan mt-1">
                <span>{leftTeam.teamCode}</span>
              </div>
            </div>
          </div>

          {/* Scores */}
          <div className="col-span-1 text-center">
            <div className="text-6xl sm:text-8xl font-black font-mono tracking-tight text-white flex items-center justify-center gap-2 drop-shadow-lg">
              <span className="text-sai-cyan">{leftScore}</span>
              <span className="text-slate-600">:</span>
              <span className="text-sai-yellow">{rightScore}</span>
            </div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-2 block">
              {match.rulesMode === 'BO3' ? `Set ${currentSetNum} of 3` : 'Single Set Sudden-Death'}
            </span>
          </div>

          {/* Right Team - Athlete Names Prominent */}
          <div className="col-span-3 text-center">
            <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl">
              <h3 className="text-2xl sm:text-4xl font-black text-white mb-2 leading-tight">
                <div>{rightTeam.player1.name}</div>
                <div className="text-slate-200">{rightTeam.player2.name}</div>
              </h3>
              <div className="inline-flex items-center gap-2 rounded-xl bg-sai-yellow/20 border border-sai-yellow/40 px-3.5 py-1 text-sm font-mono font-black text-sai-yellow mt-1">
                <span>{rightTeam.teamCode}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer with Sets Breakdown */}
        {match.rulesMode === 'BO3' && match.sets.length > 0 && (
          <div className="flex items-center justify-center gap-3 pt-4 border-t border-slate-800 text-sm font-mono">
            <span className="text-xs uppercase font-bold text-slate-500">Sets History:</span>
            {match.sets.map((s) => (
              <span
                key={s.id}
                className={`px-3 py-1 rounded-xl border ${
                  s.isFinished
                    ? 'bg-slate-900 text-slate-300 border-slate-800'
                    : s.setNumber === currentSetNum
                    ? 'bg-sai-cyan/20 text-sai-cyan border-sai-cyan/50 font-bold'
                    : 'text-slate-600 border-transparent'
                }`}
              >
                Set {s.setNumber}: {s.teamAScore}-{s.teamBScore}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 p-4 sm:p-8">
      {/* Top Floating Controls */}
      <div className="flex items-center justify-between mb-6 bg-slate-900/90 border border-slate-800 p-3 rounded-2xl backdrop-blur-md">
        <div className="flex items-center gap-2">
          <Tv className="h-5 w-5 text-sai-cyan" />
          <span className="text-sm font-extrabold text-white">
            {locale === 'vi' ? 'Bảng Điểm Màn Hình TV - Nhà Thi Đấu SAI' : 'SAI Arena Big-Screen TV Scoreboard'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Court Filter */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            {(['ALL', 1, 2, 3] as const).map((c) => (
              <button
                key={c}
                onClick={() => setSelectedCourt(c)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                  selectedCourt === c
                    ? 'bg-sai-cyan text-slate-950 shadow-md shadow-cyan-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {c === 'ALL'
                  ? locale === 'vi'
                    ? 'Tất cả các sân'
                    : 'All 3 Courts'
                  : locale === 'vi'
                  ? `Sân ${c}`
                  : `Court ${c}`}
              </button>
            ))}
          </div>

          <button
            onClick={toggleFullscreen}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-800 text-xs font-bold text-white hover:bg-slate-700 transition"
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            <span>{isFullscreen ? t('tv.exitFullscreen') : t('tv.fullscreen')}</span>
          </button>
        </div>
      </div>

      {/* Main TV Views */}
      {selectedCourt === 'ALL' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((cNum) => (
            <div key={cNum}>{renderSingleCourtTV(getCourtMatch(cNum), cNum)}</div>
          ))}
        </div>
      ) : (
        <div>{renderSingleCourtTV(getCourtMatch(selectedCourt), selectedCourt)}</div>
      )}
    </div>
  );
}

