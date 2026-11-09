'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useSocket } from '@/lib/socket-client';
import {
  Calendar,
  AlertTriangle,
  Users,
  Shield,
  Send,
  RotateCcw,
  CheckCircle2,
  Clock,
  Shuffle,
  RefreshCw,
  ExternalLink,
  Edit,
  Save,
  Check,
} from 'lucide-react';
import { MatchData, ConflictViolation, TeamData, PlayerData } from '@/types';

export default function AdminPage() {
  const { data: session } = useSession();
  const { subscribeToSchedule } = useSocket();

  const [activeTab, setActiveTab] = useState<'SCHEDULE' | 'PAIRS' | 'OVERRIDE' | 'WEBHOOK'>('SCHEDULE');
  const [matches, setMatches] = useState<MatchData[]>([]);
  const [conflicts, setConflicts] = useState<ConflictViolation[]>([]);
  const [teams, setTeams] = useState<TeamData[]>([]);
  const [players, setPlayers] = useState<PlayerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Override Form states
  const [selectedOverrideMatchId, setSelectedOverrideMatchId] = useState<string>('');
  const [overrideSetNum, setOverrideSetNum] = useState<number>(1);
  const [overrideScoreA, setOverrideScoreA] = useState<number>(0);
  const [overrideScoreB, setOverrideScoreB] = useState<number>(0);
  const [overrideStatus, setOverrideStatus] = useState<string>('IN_PROGRESS');
  const [overrideWinnerId, setOverrideWinnerId] = useState<string>('');
  const [overrideCourt, setOverrideCourt] = useState<number>(1);

  // Webhook form states
  const [webhookMatchCode, setWebhookMatchCode] = useState<string>('XD2');
  const [webhookCourt, setWebhookCourt] = useState<number>(1);
  const [webhookCategory, setWebhookCategory] = useState<string>('XD');
  const [webhookTeamA, setWebhookTeamA] = useState<string>('XD2 (Duy Tân & Thảo Trúc)');
  const [webhookTeamB, setWebhookTeamB] = useState<string>('XD4 (Tuấn Kiên & Diễm Thúy)');
  const [webhookCustomMsg, setWebhookCustomMsg] = useState<string>('');
  const [webhookResult, setWebhookResult] = useState<string | null>(null);

  // Pairing edit modal / states
  const [editingTeam, setEditingTeam] = useState<TeamData | null>(null);
  const [selectedP1, setSelectedP1] = useState<string>('');
  const [selectedP2, setSelectedP2] = useState<string>('');

  const fetchScheduleAndConflicts = useCallback(async () => {
    try {
      setLoading(true);
      const [schedRes, teamRes] = await Promise.all([
        fetch('/api/schedule'),
        fetch('/api/teams'),
      ]);

      if (schedRes.ok) {
        const sData = await schedRes.json();
        setMatches(sData.matches || []);
        setConflicts(sData.conflicts || []);
        if (sData.matches && sData.matches.length > 0 && !selectedOverrideMatchId) {
          setSelectedOverrideMatchId(sData.matches[0].id);
          const first = sData.matches[0];
          setOverrideScoreA(first.sets[0]?.teamAScore ?? 0);
          setOverrideScoreB(first.sets[0]?.teamBScore ?? 0);
          setOverrideCourt(first.courtNumber);
          setOverrideStatus(first.status);
        }
      }

      if (teamRes.ok) {
        const tData = await teamRes.json();
        setTeams(tData.teams || []);
        setPlayers(tData.players || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [selectedOverrideMatchId]);

  useEffect(() => {
    fetchScheduleAndConflicts();
  }, [fetchScheduleAndConflicts]);

  // Real-time schedule updates
  useEffect(() => {
    const unsub = subscribeToSchedule(() => {
      fetchScheduleAndConflicts();
    });
    return () => unsub();
  }, [subscribeToSchedule, fetchScheduleAndConflicts]);

  const showNotification = (text: string, type: 'success' | 'error' = 'success') => {
    setStatusMessage({ text, type });
    setTimeout(() => setStatusMessage(null), 5000);
  };

  // Reschedule match (change court or time)
  const handleReschedule = async (matchId: string, courtNumber: number, minutesOffset: number) => {
    const match = matches.find((m) => m.id === matchId);
    if (!match) return;

    const currentStart = match.startTime ? new Date(match.startTime) : new Date();
    const newStart = new Date(currentStart.getTime() + minutesOffset * 60 * 1000);

    try {
      const res = await fetch('/api/schedule', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          updates: [
            {
              id: matchId,
              courtNumber,
              startTime: newStart.toISOString(),
            },
          ],
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setMatches(data.matches);
        setConflicts(data.conflicts);
        showNotification(
          data.conflicts.length > 0
            ? `⚠️ Rescheduled with ${data.conflicts.length} athlete conflict(s) detected!`
            : '✅ Match rescheduled successfully! Schedule is 100% collision-free.'
        );
      }
    } catch (err: any) {
      showNotification(err.message, 'error');
    }
  };

  // Submit emergency score override
  const handleEmergencyOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOverrideMatchId) return;

    try {
      const res = await fetch(`/api/matches/${selectedOverrideMatchId}/override`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          setNumber: overrideSetNum,
          teamAScore: overrideScoreA,
          teamBScore: overrideScoreB,
          status: overrideStatus,
          winnerTeamId: overrideWinnerId || null,
          courtNumber: overrideCourt,
          reason: 'Emergency Organizer Intervention via Control Center',
        }),
      });

      if (res.ok) {
        showNotification('✅ Emergency score override successfully applied and broadcast!');
        fetchScheduleAndConflicts();
      } else {
        showNotification('Failed to apply override', 'error');
      }
    } catch (err: any) {
      showNotification(err.message, 'error');
    }
  };

  // Submit Webhook announcement
  const handleSendWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    setWebhookResult(null);

    try {
      const res = await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchCode: webhookMatchCode,
          courtNumber: webhookCourt,
          category: webhookCategory,
          teamA: webhookTeamA,
          teamB: webhookTeamB,
          customMessage: webhookCustomMsg,
        }),
      });

      const data = await res.json();
      setWebhookResult(data.message || 'Webhook sent!');
      showNotification('✅ Webhook announcement broadcast to Slack/Telegram and live web banner!');
    } catch (err: any) {
      showNotification(err.message, 'error');
    }
  };

  // Reset Tournament
  const handleResetTournament = async () => {
    if (!confirm('Are you sure you want to reset all match scores to 0-0? This will clear audit logs and reset the scoreboard.')) {
      return;
    }

    try {
      const res = await fetch('/api/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'RESET_SCORES' }),
      });

      if (res.ok) {
        showNotification('✅ All tournament scores reset to 0-0!');
        fetchScheduleAndConflicts();
      }
    } catch (e: any) {
      showNotification(e.message, 'error');
    }
  };

  // Save pair editing
  const handleSavePairing = async () => {
    if (!editingTeam) return;

    try {
      const res = await fetch('/api/teams', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamId: editingTeam.id,
          player1Id: selectedP1,
          player2Id: selectedP2,
        }),
      });

      if (res.ok) {
        showNotification('✅ Team pairing updated successfully!');
        setEditingTeam(null);
        fetchScheduleAndConflicts();
      }
    } catch (e: any) {
      showNotification(e.message, 'error');
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      {/* Title & Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2.5">
            <Shield className="h-7 w-7 text-sai-cyan" />
            <span>Tournament Operations Control Center</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Automated collision detection, roster manager, emergency score override & notification webhooks
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchScheduleAndConflicts()}
            className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2 text-xs font-bold text-slate-300 hover:text-white transition"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleResetTournament}
            className="flex items-center gap-1.5 rounded-xl border border-rose-900/50 bg-rose-950/40 px-3.5 py-2 text-xs font-bold text-rose-300 hover:bg-rose-900/60 transition"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Reset Scores</span>
          </button>
        </div>
      </div>

      {statusMessage && (
        <div
          className={`mb-6 p-4 rounded-2xl text-xs font-bold flex items-center justify-between border ${
            statusMessage.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
              : 'bg-rose-950/60 border-rose-500/50 text-rose-300'
          }`}
        >
          <span>{statusMessage.text}</span>
          <button onClick={() => setStatusMessage(null)}>✕</button>
        </div>
      )}

      {/* Critical Conflict Alert Banner */}
      {conflicts.length > 0 ? (
        <div className="mb-8 rounded-3xl border-2 border-rose-500/60 bg-rose-950/30 p-5 shadow-2xl backdrop-blur-md animate-pulse-subtle">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-600 text-white font-bold">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-black text-rose-300 uppercase tracking-wide">
                Critical Scheduling Collision Alert ({conflicts.length} Violations Detected)
              </h3>
              <p className="text-xs text-rose-200 mt-1">
                Conflict Prevention Rule violated: Pool 1 athletes competing in both XD & MD must never play overlapping matches and require a minimum buffer of 10 minutes.
              </p>

              <div className="mt-3 space-y-2">
                {conflicts.map((c, i) => (
                  <div
                    key={i}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-950/70 border border-rose-900 text-xs text-rose-200 font-mono"
                  >
                    <span>{c.message}</span>
                    <span className="shrink-0 px-2 py-0.5 rounded bg-rose-900/60 font-bold text-[10px] uppercase">
                      {c.type}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-8 rounded-2xl border border-emerald-500/40 bg-emerald-950/20 p-4 flex items-center gap-3 text-emerald-400 text-xs font-semibold">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span>
            Collision Prevention Engine Active: 0 conflicts detected across Court 1, Court 2 & Court 3. All Pool 1 athlete rest buffers (≥10m) respected.
          </span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3 mb-6 overflow-x-auto">
        {[
          { key: 'SCHEDULE', label: 'Schedule & Collision Manager', icon: Calendar },
          { key: 'PAIRS', label: 'Team Pairing Manager', icon: Users },
          { key: 'OVERRIDE', label: 'Emergency Score Override', icon: Shield },
          { key: 'WEBHOOK', label: 'Notification Webhooks', icon: Send },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                isActive
                  ? 'bg-sai-cyan text-slate-950 shadow-lg shadow-cyan-500/20'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: SCHEDULE MANAGER */}
      {activeTab === 'SCHEDULE' && (
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 backdrop-blur-md">
            <h2 className="text-sm font-black text-white uppercase tracking-wider mb-3">
              Court Schedule Table & Collision Verifier
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider font-bold text-[10px]">
                    <th className="py-2.5 px-3">Match</th>
                    <th className="py-2.5 px-3">Court</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Start Time</th>
                    <th className="py-2.5 px-3">Team A (Roster)</th>
                    <th className="py-2.5 px-3">Team B (Roster)</th>
                    <th className="py-2.5 px-3">Pool 1 Athletes</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {matches.map((m) => {
                    const pool1A = m.teamA.player1.pool === 1 ? m.teamA.player1.name : null;
                    const pool1B = m.teamB.player1.pool === 1 ? m.teamB.player1.name : null;
                    const hasConflict = conflicts.some(
                      (c) => c.matchA.id === m.id || c.matchB.id === m.id
                    );

                    return (
                      <tr
                        key={m.id}
                        className={`transition ${
                          hasConflict ? 'bg-rose-950/30 text-rose-200' : 'hover:bg-slate-800/40'
                        }`}
                      >
                        <td className="py-2.5 px-3 font-mono font-bold text-white">{m.matchCode}</td>
                        <td className="py-2.5 px-3">
                          <select
                            value={m.courtNumber}
                            onChange={(e) => handleReschedule(m.id, parseInt(e.target.value), 0)}
                            className="rounded-lg bg-slate-950 border border-slate-800 px-2 py-1 text-xs text-sai-cyan font-bold"
                          >
                            <option value={1}>Court 1</option>
                            <option value={2}>Court 2</option>
                            <option value={3}>Court 3</option>
                          </select>
                        </td>
                        <td className="py-2.5 px-3 font-bold">{m.category}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-400">
                          {m.startTime
                            ? new Date(m.startTime).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : 'TBD'}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-white">{m.teamA.teamCode}</div>
                          <div className="text-[10px] text-slate-400 truncate max-w-[120px]">
                            {m.teamA.player1.name} & {m.teamA.player2.name}
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-white">{m.teamB.teamCode}</div>
                          <div className="text-[10px] text-slate-400 truncate max-w-[120px]">
                            {m.teamB.player1.name} & {m.teamB.player2.name}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-sai-yellow">
                          {[pool1A, pool1B].filter(Boolean).join(', ') || '-'}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="inline-flex gap-1">
                            <button
                              onClick={() => handleReschedule(m.id, m.courtNumber, -15)}
                              className="px-2 py-1 rounded bg-slate-800 text-[10px] text-slate-300 hover:text-white"
                              title="Shift earlier by 15 mins"
                            >
                              -15m
                            </button>
                            <button
                              onClick={() => handleReschedule(m.id, m.courtNumber, 15)}
                              className="px-2 py-1 rounded bg-slate-800 text-[10px] text-slate-300 hover:text-white"
                              title="Shift later by 15 mins"
                            >
                              +15m
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TEAM PAIRING MANAGER */}
      {activeTab === 'PAIRS' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {teams.map((t) => (
              <div
                key={t.id}
                className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl backdrop-blur-md"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-sai-cyan text-slate-950 font-black text-xs">
                      {t.teamCode}
                    </span>
                    <div>
                      <h4 className="font-extrabold text-white text-sm">{t.teamCode}</h4>
                      <span className="text-[10px] text-slate-400 font-bold uppercase">
                        {t.category} · Group {t.groupName}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setEditingTeam(t);
                      setSelectedP1(t.player1Id);
                      setSelectedP2(t.player2Id);
                    }}
                    className="flex items-center gap-1 text-xs text-sai-cyan hover:underline font-bold"
                  >
                    <Edit className="h-3.5 w-3.5" />
                    <span>Edit Pair</span>
                  </button>
                </div>

                <div className="space-y-2 mt-3 text-xs">
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/70 border border-slate-800">
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">
                        Player 1 (Pool {t.player1.pool})
                      </span>
                      <span className="font-bold text-white">{t.player1.name}</span>
                    </div>
                    <span className="font-mono font-bold text-sai-cyan">
                      Power: {t.player1.powerRating}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/70 border border-slate-800">
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">
                        Player 2 (Pool {t.player2.pool})
                      </span>
                      <span className="font-bold text-white">{t.player2.name}</span>
                    </div>
                    <span className="font-mono font-bold text-sai-yellow">
                      Power: {t.player2.powerRating}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800 font-bold text-xs">
                    <span className="text-slate-400">Total Pair Power:</span>
                    <span className="font-mono text-emerald-400">{t.totalPower}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Edit Pairing Modal */}
          {editingTeam && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
              <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
                <h3 className="text-base font-bold text-white mb-4">
                  Edit Roster for {editingTeam.teamCode} ({editingTeam.category})
                </h3>

                <div className="space-y-4 text-xs">
                  <div>
                    <label className="block text-slate-400 font-bold mb-1">
                      Player 1 (Pool 1 Male Seed)
                    </label>
                    <select
                      value={selectedP1}
                      onChange={(e) => setSelectedP1(e.target.value)}
                      className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-white"
                    >
                      {players
                        .filter((p) => p.pool === 1)
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} (Power: {p.powerRating})
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-400 font-bold mb-1">
                      {editingTeam.category === 'XD' ? 'Player 2 (Pool 3 Female)' : 'Player 2 (Pool 2 Male)'}
                    </label>
                    <select
                      value={selectedP2}
                      onChange={(e) => setSelectedP2(e.target.value)}
                      className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-white"
                    >
                      {players
                        .filter((p) => (editingTeam.category === 'XD' ? p.pool === 3 : p.pool === 2))
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} (Power: {p.powerRating})
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 mt-6">
                  <button
                    onClick={() => setEditingTeam(null)}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-bold text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSavePairing}
                    className="px-4 py-2 rounded-xl bg-sai-cyan text-xs font-bold text-slate-950 shadow-md shadow-cyan-500/20"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: EMERGENCY SCORE OVERRIDE */}
      {activeTab === 'OVERRIDE' && (
        <div className="max-w-2xl bg-slate-900/90 border border-slate-800 p-6 rounded-3xl shadow-xl backdrop-blur-md">
          <h2 className="text-base font-bold text-white mb-2 flex items-center gap-2">
            <Shield className="h-4 w-4 text-sai-cyan" />
            <span>Emergency Match Score Override</span>
          </h2>
          <p className="text-xs text-slate-400 mb-6">
            Authorized for Tournament Director and Ops Lead to correct scores, assign referees, or force match state.
          </p>

          <form onSubmit={handleEmergencyOverride} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-300 mb-1">Target Match</label>
              <select
                value={selectedOverrideMatchId}
                onChange={(e) => {
                  setSelectedOverrideMatchId(e.target.value);
                  const m = matches.find((item) => item.id === e.target.value);
                  if (m) {
                    setOverrideScoreA(m.sets[0]?.teamAScore ?? 0);
                    setOverrideScoreB(m.sets[0]?.teamBScore ?? 0);
                    setOverrideCourt(m.courtNumber);
                    setOverrideStatus(m.status);
                  }
                }}
                className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-white font-mono"
              >
                {matches.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.matchCode} ({m.category}) - {m.teamA.teamCode} vs {m.teamB.teamCode} [Court {m.courtNumber}]
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-300 mb-1">Team A Score</label>
                <input
                  type="number"
                  min="0"
                  max="30"
                  value={overrideScoreA}
                  onChange={(e) => setOverrideScoreA(parseInt(e.target.value) || 0)}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-white font-mono text-base font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Team B Score</label>
                <input
                  type="number"
                  min="0"
                  max="30"
                  value={overrideScoreB}
                  onChange={(e) => setOverrideScoreB(parseInt(e.target.value) || 0)}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-white font-mono text-base font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-300 mb-1">Match Status</label>
                <select
                  value={overrideStatus}
                  onChange={(e) => setOverrideStatus(e.target.value)}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-white font-bold"
                >
                  <option value="SCHEDULED">SCHEDULED</option>
                  <option value="IN_PROGRESS">IN_PROGRESS</option>
                  <option value="COMPLETED">COMPLETED</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Court Assignment</label>
                <select
                  value={overrideCourt}
                  onChange={(e) => setOverrideCourt(parseInt(e.target.value))}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-white font-bold"
                >
                  <option value={1}>Court 1</option>
                  <option value={2}>Court 2</option>
                  <option value={3}>Court 3</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="w-full mt-4 rounded-xl bg-gradient-to-r from-sai-cyan to-blue-600 py-3 font-bold text-slate-950 shadow-lg shadow-cyan-500/20 hover:brightness-110 transition"
            >
              Apply Score Override & Broadcast
            </button>
          </form>
        </div>
      )}

      {/* TAB 4: WEBHOOK DISPATCHER */}
      {activeTab === 'WEBHOOK' && (
        <div className="max-w-2xl bg-slate-900/90 border border-slate-800 p-6 rounded-3xl shadow-xl backdrop-blur-md">
          <div className="flex items-center gap-2 mb-2">
            <Send className="h-5 w-5 text-sai-cyan" />
            <h2 className="text-base font-bold text-white">
              Webhook Trigger Integration (Slack / Telegram / Discord)
            </h2>
          </div>
          <p className="text-xs text-slate-400 mb-6">
            Announce upcoming matches to spectator channels or referee radios: &quot;Match XD2 on Court 1 in 5 minutes!&quot;
          </p>

          <form onSubmit={handleSendWebhook} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-300 mb-1">Match Code</label>
                <input
                  type="text"
                  value={webhookMatchCode}
                  onChange={(e) => setWebhookMatchCode(e.target.value)}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-white font-mono"
                  placeholder="M-XD-02"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Court Number</label>
                <select
                  value={webhookCourt}
                  onChange={(e) => setWebhookCourt(parseInt(e.target.value))}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-white font-bold"
                >
                  <option value={1}>Court 1</option>
                  <option value={2}>Court 2</option>
                  <option value={3}>Court 3</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-300 mb-1">Team A Description</label>
              <input
                type="text"
                value={webhookTeamA}
                onChange={(e) => setWebhookTeamA(e.target.value)}
                className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-white"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-300 mb-1">Team B Description</label>
              <input
                type="text"
                value={webhookTeamB}
                onChange={(e) => setWebhookTeamB(e.target.value)}
                className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-white"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-300 mb-1">
                Custom Message (Optional)
              </label>
              <input
                type="text"
                value={webhookCustomMsg}
                onChange={(e) => setWebhookCustomMsg(e.target.value)}
                placeholder="🏸 Match XD2 on Court 1 starts in 5 minutes! Players please report to umpire."
                className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-white placeholder:text-slate-600"
              />
            </div>

            <button
              type="submit"
              className="w-full mt-4 rounded-xl bg-gradient-to-r from-sai-yellow to-amber-500 py-3 font-bold text-slate-950 shadow-lg shadow-yellow-500/20 hover:brightness-110 transition"
            >
              Trigger Webhook Announcement
            </button>
          </form>

          {webhookResult && (
            <div className="mt-4 p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-emerald-400">
              {webhookResult}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

