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
  UserPlus,
  Download,
  Trophy,
  Search,
  Sliders,
} from 'lucide-react';
import { MatchData, ConflictViolation, TeamData, PlayerData } from '@/types';

export default function AdminPage() {
  const { data: session } = useSession();
  const { subscribeToSchedule } = useSocket();

  const [activeTab, setActiveTab] = useState<'SCHEDULE' | 'ATHLETES' | 'PAIRS' | 'OVERRIDE' | 'WEBHOOK'>('SCHEDULE');
  const [matches, setMatches] = useState<MatchData[]>([]);
  const [conflicts, setConflicts] = useState<ConflictViolation[]>([]);
  const [teams, setTeams] = useState<TeamData[]>([]);
  const [players, setPlayers] = useState<PlayerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Court Configuration & Rebalancing state
  const [activeCourtsCount, setActiveCourtsCount] = useState<number>(3);
  const [isRebalancing, setIsRebalancing] = useState<boolean>(false);

  // Athlete Management states
  const [showAddPlayerModal, setShowAddPlayerModal] = useState<boolean>(false);
  const [newPlayerName, setNewPlayerName] = useState<string>('');
  const [newPlayerGender, setNewPlayerGender] = useState<'MALE' | 'FEMALE'>('MALE');
  const [newPlayerPool, setNewPlayerPool] = useState<number>(1);
  const [newPlayerPower, setNewPlayerPower] = useState<number>(70);
  const [newPlayerDept, setNewPlayerDept] = useState<string>('SAI Digital');
  const [athleteFilterPool, setAthleteFilterPool] = useState<number | 'ALL'>('ALL');
  const [athleteSearchQuery, setAthleteSearchQuery] = useState<string>('');

  // Edit Athlete states
  const [editingPlayer, setEditingPlayer] = useState<PlayerData | null>(null);
  const [editPlayerName, setEditPlayerName] = useState<string>('');
  const [editPlayerGender, setEditPlayerGender] = useState<'MALE' | 'FEMALE'>('MALE');
  const [editPlayerPool, setEditPlayerPool] = useState<number>(1);
  const [editPlayerDept, setEditPlayerDept] = useState<string>('SAI Digital');
  const [showEditPlayerModal, setShowEditPlayerModal] = useState<boolean>(false);

  // Pairs tab category filter
  const [pairsCategoryFilter, setPairsCategoryFilter] = useState<'ALL' | 'XD' | 'MD'>('ALL');

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

  const handleAdvancePlayoffs = async (cat: 'XD' | 'MD') => {
    try {
      const res = await fetch('/api/playoffs/advance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: cat }),
      });
      const data = await res.json();
      if (res.ok) {
        showNotification(`✅ ${data.message}`);
        fetchScheduleAndConflicts();
      } else {
        showNotification(data.error || 'Failed to advance playoffs', 'error');
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

  // Rebalance court schedule for 2 or 3 courts
  const handleRebalanceSchedule = async (courtCount: number) => {
    try {
      setIsRebalancing(true);
      const res = await fetch('/api/schedule/rebalance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ totalCourts: courtCount }),
      });
      const data = await res.json();
      if (res.ok) {
        setActiveCourtsCount(courtCount);
        showNotification(`✅ ${data.message}`);
        fetchScheduleAndConflicts();
      } else {
        showNotification(data.error || 'Rebalance failed', 'error');
      }
    } catch (e: any) {
      showNotification(e.message, 'error');
    } finally {
      setIsRebalancing(false);
    }
  };

  // Add new athlete
  const handleAddPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlayerName.trim()) return;

    try {
      const res = await fetch('/api/players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newPlayerName.trim(),
          gender: newPlayerGender,
          pool: newPlayerPool,
          powerRating: newPlayerPower,
          department: newPlayerDept,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showNotification(`✅ Đã bổ sung VĐV: ${data.player.name} thành công!`);
        setNewPlayerName('');
        setShowAddPlayerModal(false);
        fetchScheduleAndConflicts();
      } else {
        showNotification(data.error || 'Thêm VĐV thất bại', 'error');
      }
    } catch (err: any) {
      showNotification(err.message, 'error');
    }
  };

  // Update existing player
  const handleUpdatePlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlayer) return;
    try {
      const res = await fetch('/api/players', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingPlayer.id,
          name: editPlayerName,
          gender: editPlayerGender,
          pool: editPlayerPool,
          department: editPlayerDept,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showNotification(`✅ Đã cập nhật VĐV: ${editPlayerName} thành công!`);
        setShowEditPlayerModal(false);
        setEditingPlayer(null);
        fetchScheduleAndConflicts();
      } else {
        showNotification(data.error || 'Cập nhật VĐV thất bại', 'error');
      }
    } catch (err: any) {
      showNotification(err.message, 'error');
    }
  };

  // Adjust athlete power rating
  const handleAdjustPower = async (playerId: string, currentPower: number, delta: number) => {
    const newPower = Math.max(0, Math.min(100, currentPower + delta));
    try {
      const res = await fetch('/api/players', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: playerId, powerRating: newPower }),
      });
      if (res.ok) {
        showNotification(`✅ Đã cập nhật điểm đánh giá: ${newPower} pts`);
        fetchScheduleAndConflicts();
      }
    } catch (err: any) {
      showNotification(err.message, 'error');
    }
  };

  // Filter athletes
  const filteredAthletes = players.filter((pl) => {
    const matchPool = athleteFilterPool === 'ALL' || pl.pool === athleteFilterPool;
    const matchSearch =
      athleteSearchQuery === '' ||
      pl.name.toLowerCase().includes(athleteSearchQuery.toLowerCase()) ||
      (pl.department && pl.department.toLowerCase().includes(athleteSearchQuery.toLowerCase()));
    return matchPool && matchSearch;
  });

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

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => window.open('/api/export?format=csv', '_blank')}
            className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2 text-xs font-bold text-slate-300 hover:text-white transition"
            title="Xuất file CSV danh sách kết quả trận đấu"
          >
            <Download className="h-4 w-4 text-sai-cyan" />
            <span>Xuất CSV</span>
          </button>

          <button
            onClick={() => handleAdvancePlayoffs('XD')}
            className="flex items-center gap-1.5 rounded-xl border border-indigo-900/60 bg-indigo-950/40 px-3 py-2 text-xs font-bold text-indigo-300 hover:bg-indigo-900/60 transition"
            title="Tự động xếp cặp Bán kết Đôi Nam Nữ từ BXH Bảng A & B"
          >
            <Trophy className="h-4 w-4 text-sai-cyan" />
            <span>Đẩy BK XD</span>
          </button>

          <button
            onClick={() => handleAdvancePlayoffs('MD')}
            className="flex items-center gap-1.5 rounded-xl border border-amber-900/60 bg-amber-950/40 px-3 py-2 text-xs font-bold text-amber-300 hover:bg-amber-900/60 transition"
            title="Tự động xếp cặp Bán kết Đôi Nam từ BXH Bảng A & B"
          >
            <Trophy className="h-4 w-4 text-sai-yellow" />
            <span>Đẩy BK MD</span>
          </button>

          <button
            onClick={() => fetchScheduleAndConflicts()}
            className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2 text-xs font-bold text-slate-300 hover:text-white transition"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Làm mới</span>
          </button>

          <button
            onClick={handleResetTournament}
            className="flex items-center gap-1.5 rounded-xl border border-rose-900/50 bg-rose-950/40 px-3.5 py-2 text-xs font-bold text-rose-300 hover:bg-rose-900/60 transition"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Đặt lại điểm</span>
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
          { key: 'SCHEDULE', label: 'Sắp xếp Sân & Lịch đấu', icon: Calendar },
          { key: 'ATHLETES', label: 'Quản lý Vận động viên', icon: UserPlus },
          { key: 'PAIRS', label: 'Sắp lại Cặp đấu', icon: Users },
          { key: 'OVERRIDE', label: 'Ghi đè điểm khẩn cấp', icon: Shield },
          { key: 'WEBHOOK', label: 'Thông báo Webhook', icon: Send },
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

      {/* TAB 1: SCHEDULE MANAGER & COURT CONFIGURATION */}
      {activeTab === 'SCHEDULE' && (
        <div className="space-y-6">
          {/* COURT CONFIGURATION & REBALANCE CARD */}
          <div className="rounded-3xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900 to-sai-navy-950 p-5 shadow-xl backdrop-blur-md">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <Sliders className="h-4 w-4 text-sai-cyan" />
                  <span>Cấu hình Sân thi đấu & Sắp xếp tự động</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1 max-w-xl">
                  Lựa chọn số lượng sân thực tế (2 Sân hoặc 3 Sân). Hệ thống sẽ tự động phân bổ lại toàn bộ lịch đấu các vòng, chia đều ca 25 phút/trận và cam kết 100% không trùng lịch cho VĐV Pool 1!
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
                  <button
                    onClick={() => handleRebalanceSchedule(2)}
                    disabled={isRebalancing}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                      activeCourtsCount === 2
                        ? 'bg-sai-cyan text-slate-950 shadow-md shadow-cyan-500/20'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    2 Sân (Court 1 & 2)
                  </button>
                  <button
                    onClick={() => handleRebalanceSchedule(3)}
                    disabled={isRebalancing}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                      activeCourtsCount === 3
                        ? 'bg-sai-cyan text-slate-950 shadow-md shadow-cyan-500/20'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    3 Sân (Court 1, 2 & 3)
                  </button>
                </div>

                <button
                  onClick={() => handleRebalanceSchedule(activeCourtsCount)}
                  disabled={isRebalancing}
                  className="flex items-center gap-1.5 rounded-2xl bg-gradient-to-r from-cyan-600 to-sai-cyan px-4 py-2.5 text-xs font-black text-slate-950 shadow-lg shadow-cyan-500/20 hover:brightness-110 transition disabled:opacity-50"
                >
                  <Shuffle className={`h-4 w-4 ${isRebalancing ? 'animate-spin' : ''}`} />
                  <span>{isRebalancing ? 'Đang sắp xếp...' : 'Sắp xếp lại lịch đấu'}</span>
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 backdrop-blur-md">
            <h2 className="text-sm font-black text-white uppercase tracking-wider mb-3">
              Court Schedule Table & Collision Verifier ({matches.length} Matches across {activeCourtsCount} Courts)
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

      {/* TAB 2: ATHLETE ROSTER & MANAGEMENT */}
      {activeTab === 'ATHLETES' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-4 rounded-3xl backdrop-blur-md">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Lọc theo nhóm:</span>
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                {(['ALL', 1, 2, 3] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setAthleteFilterPool(p)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      athleteFilterPool === p
                        ? 'bg-sai-cyan text-slate-950 shadow-md shadow-cyan-500/20'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {p === 'ALL'
                      ? 'Tất cả (' + players.length + ')'
                      : p === 1
                      ? 'Pool 1 (Nam cao 70-100)'
                      : p === 2
                      ? 'Pool 2 (Nam trung 50-60)'
                      : 'Pool 3 (Nữ 40-45)'}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="h-4 w-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Tìm tên vận động viên..."
                  value={athleteSearchQuery}
                  onChange={(e) => setAthleteSearchQuery(e.target.value)}
                  className="rounded-xl bg-slate-950 border border-slate-800 pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sai-cyan"
                />
              </div>

              <button
                onClick={() => setShowAddPlayerModal(true)}
                className="flex items-center gap-1.5 rounded-xl bg-sai-cyan text-slate-950 px-3.5 py-2 text-xs font-black shadow-md shadow-cyan-500/20 hover:brightness-110 transition"
              >
                <UserPlus className="h-4 w-4" />
                <span>Bổ sung VĐV mới</span>
              </button>
            </div>
          </div>

          {/* Athletes Table */}
          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 backdrop-blur-md">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider font-bold text-[10px]">
                    <th className="py-2.5 px-3">Họ và Tên VĐV</th>
                    <th className="py-2.5 px-3">Giới tính</th>
                    <th className="py-2.5 px-3">Nhóm (Pool)</th>
                    <th className="py-2.5 px-3">Nội dung đủ điều kiện</th>
                    <th className="py-2.5 px-3">Đơn vị / Phòng ban</th>
                    <th className="py-2.5 px-3 text-center">Trạng thái</th>
                    <th className="py-2.5 px-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {filteredAthletes.map((pl) => (
                    <tr key={pl.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-3 font-extrabold text-white text-sm">
                        {pl.name}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold ${
                            pl.gender === 'MALE'
                              ? 'bg-blue-950/80 text-blue-300 border border-blue-800'
                              : 'bg-pink-950/80 text-pink-300 border border-pink-800'
                          }`}
                        >
                          {pl.gender === 'MALE' ? 'Nam' : 'Nữ'}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            pl.pool === 1
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              : pl.pool === 2
                              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                              : 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                          }`}
                        >
                          Pool {pl.pool}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-300">
                        {pl.pool === 1
                          ? 'Đôi Nam (MD) & Đôi Nam Nữ (XD)'
                          : pl.pool === 2
                          ? 'Chỉ chơi Đôi Nam (MD)'
                          : 'Chỉ chơi Đôi Nam Nữ (XD)'}
                      </td>
                      <td className="py-3 px-3 text-slate-400">{pl.department || 'SAI Digital'}</td>
                      <td className="py-3 px-3 text-center">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                          <Check className="h-3 w-3" />
                          <span>Sẵn sàng</span>
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => {
                            setEditingPlayer(pl);
                            setEditPlayerName(pl.name);
                            setEditPlayerGender(pl.gender as 'MALE' | 'FEMALE');
                            setEditPlayerPool(pl.pool);
                            setEditPlayerDept(pl.department || 'SAI Digital');
                            setShowEditPlayerModal(true);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-slate-800 border border-slate-700 px-3 py-1.5 text-xs text-sai-cyan hover:text-white hover:bg-slate-700 font-bold transition shadow-sm"
                        >
                          <Edit className="h-3.5 w-3.5" />
                          <span>Chỉnh sửa</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: TEAM PAIRING MANAGER */}
      {activeTab === 'PAIRS' && (
        <div className="space-y-6">
          {/* Category Filter for Pairs */}
          <div className="flex items-center justify-between bg-slate-900/90 border border-slate-800 p-4 rounded-3xl backdrop-blur-md">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Nội dung:</span>
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                {(['ALL', 'XD', 'MD'] as const).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setPairsCategoryFilter(cat)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      pairsCategoryFilter === cat
                        ? 'bg-sai-cyan text-slate-950 shadow-md shadow-cyan-500/20'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {cat === 'ALL'
                      ? 'Tất cả 16 cặp'
                      : cat === 'XD'
                      ? 'Đôi Nam Nữ (XD - 8 cặp)'
                      : 'Đôi Nam (MD - 8 cặp)'}
                  </button>
                ))}
              </div>
            </div>
            <span className="text-xs text-slate-400">
              Có thể sắp xếp hoặc đổi cặp bất kỳ lúc nào trước khi bắt đầu giải
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {teams
              .filter((t) => pairsCategoryFilter === 'ALL' || t.category === pairsCategoryFilter)
              .map((t) => (
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
                    className="flex items-center gap-1 rounded-xl bg-slate-800 border border-slate-700 px-3 py-1 text-xs text-sai-cyan hover:text-white font-bold transition"
                  >
                    <Edit className="h-3.5 w-3.5" />
                    <span>Sắp lại cặp</span>
                  </button>
                </div>

                <div className="space-y-2 mt-3 text-xs">
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/70 border border-slate-800">
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">
                        VĐV 1 (Pool {t.player1.pool} {t.player1.pool === 1 ? 'Nam Hạt Giống' : ''})
                      </span>
                      <span className="font-extrabold text-white text-sm">{t.player1.name}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/70 border border-slate-800">
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">
                        VĐV 2 (Pool {t.player2.pool} {t.player2.pool === 3 ? 'Nữ' : 'Nam'})
                      </span>
                      <span className="font-extrabold text-white text-sm">{t.player2.name}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Edit Pairing Modal */}
          {editingTeam && (() => {
            return (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
                <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
                  <h3 className="text-base font-bold text-white mb-4">
                    Sắp lại Cặp đấu {editingTeam.teamCode} ({editingTeam.category === 'XD' ? 'Đôi Nam Nữ' : 'Đôi Nam'})
                  </h3>

                  <div className="space-y-4 text-xs">
                    <div>
                      <label className="block text-slate-400 font-bold mb-1">
                        VĐV 1 (Pool 1 Nam Hạt Giống Cao)
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
                              {p.name}
                            </option>
                          ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-400 font-bold mb-1">
                        {editingTeam.category === 'XD' ? 'VĐV 2 (Pool 3 Nữ)' : 'VĐV 2 (Pool 2 Nam Trung Cấp)'}
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
                              {p.name}
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
                      Hủy
                    </button>
                    <button
                      onClick={handleSavePairing}
                      className="px-4 py-2 rounded-xl bg-sai-cyan text-xs font-bold text-slate-950 shadow-md shadow-cyan-500/20"
                    >
                      Lưu Cặp Đấu
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}
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

      {/* Modal Add Player */}
      {showAddPlayerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <h3 className="text-base font-black text-white mb-4 flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-sai-cyan" />
              <span>Bổ sung Vận động viên mới</span>
            </h3>
            <form onSubmit={handleAddPlayer} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-bold mb-1">Họ và Tên VĐV</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Nguyễn Văn An"
                  value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-white focus:outline-none focus:ring-1 focus:ring-sai-cyan"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Giới tính</label>
                  <select
                    value={newPlayerGender}
                    onChange={(e) => setNewPlayerGender(e.target.value as any)}
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-white"
                  >
                    <option value="MALE">Nam (Male)</option>
                    <option value="FEMALE">Nữ (Female)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">Nhóm (Pool)</label>
                  <select
                    value={newPlayerPool}
                    onChange={(e) => setNewPlayerPool(parseInt(e.target.value))}
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-white"
                  >
                    <option value={1}>Pool 1 (Nam hạt giống 70-100)</option>
                    <option value={2}>Pool 2 (Nam trung cấp 50-60)</option>
                    <option value={3}>Pool 3 (Nữ 40-45)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">Phòng ban / Đơn vị</label>
                <input
                  type="text"
                  value={newPlayerDept}
                  onChange={(e) => setNewPlayerDept(e.target.value)}
                  placeholder="Ví dụ: SAI Digital"
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddPlayerModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-bold text-slate-300 hover:text-white"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-sai-cyan text-xs font-black text-slate-950 shadow-md shadow-cyan-500/20 hover:brightness-110"
                >
                  Lưu Vận động viên
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit Player */}
      {showEditPlayerModal && editingPlayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <h3 className="text-base font-black text-white mb-4 flex items-center gap-2">
              <Edit className="h-5 w-5 text-sai-cyan" />
              <span>Chỉnh sửa Thông tin Vận động viên</span>
            </h3>
            <form onSubmit={handleUpdatePlayer} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-bold mb-1">Họ và Tên VĐV</label>
                <input
                  type="text"
                  required
                  placeholder="Họ và tên..."
                  value={editPlayerName}
                  onChange={(e) => setEditPlayerName(e.target.value)}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-white text-sm font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Giới tính</label>
                  <select
                    value={editPlayerGender}
                    onChange={(e) => setEditPlayerGender(e.target.value as 'MALE' | 'FEMALE')}
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-white"
                  >
                    <option value="MALE">Nam (Male)</option>
                    <option value="FEMALE">Nữ (Female)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-bold mb-1">Nhóm (Pool)</label>
                  <select
                    value={editPlayerPool}
                    onChange={(e) => setEditPlayerPool(parseInt(e.target.value))}
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-white"
                  >
                    <option value={1}>Pool 1 (Nam hạt giống - Đấu cả MD & XD)</option>
                    <option value={2}>Pool 2 (Nam trung cấp - Chỉ đấu MD)</option>
                    <option value={3}>Pool 3 (Nữ - Chỉ đấu XD)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">Phòng ban / Đơn vị</label>
                <input
                  type="text"
                  value={editPlayerDept}
                  onChange={(e) => setEditPlayerDept(e.target.value)}
                  placeholder="Ví dụ: SAI Digital"
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditPlayerModal(false);
                    setEditingPlayer(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-bold text-slate-300 hover:text-white"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-sai-cyan text-xs font-black text-slate-950 shadow-md shadow-cyan-500/20 hover:brightness-110"
                >
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

