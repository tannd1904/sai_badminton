'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useSocket } from '../../lib/socket-client';
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
  GripVertical,
  ArrowUp,
  ArrowDown,
  Filter,
} from 'lucide-react';
import { MatchData, ConflictViolation, TeamData, PlayerData } from '../../types';
import { checkScheduleConflicts } from '../../lib/conflict-checker';

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

  // Schedule filtering, drag-and-drop & conflict modal states
  const [courtFilter, setCourtFilter] = useState<'ALL' | 1 | 2 | 3>('ALL');
  const [scheduleCategoryFilter, setScheduleCategoryFilter] = useState<'ALL' | 'XD' | 'MD'>('ALL');
  const [scheduleRoundFilter, setScheduleRoundFilter] = useState<'ALL' | 'GROUP' | 'PLAYOFF'>('ALL');
  const [scheduleSearchQuery, setScheduleSearchQuery] = useState<string>('');
  const [draggedMatchId, setDraggedMatchId] = useState<string | null>(null);
  const [dragOverMatchId, setDragOverMatchId] = useState<string | null>(null);
  const [showConflictModal, setShowConflictModal] = useState<boolean>(false);
  const [pendingConflictAction, setPendingConflictAction] = useState<{
    description: string;
    updates: Array<{ id: string; courtNumber?: number; startTime?: string; orderIndex?: number }>;
    conflicts: ConflictViolation[];
  } | null>(null);

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

  // Helper to format ISO time to 'HH:mm' for input[type="time"]
  const formatTimeForInput = (dateVal: string | Date | null | undefined): string => {
    if (!dateVal) return '';
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return '';
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  // Helper to parse 'HH:mm' into ISO date on tournament date (14/11/2026)
  const parseTimeToTournamentDate = (timeStr: string, existingDate?: string | Date | null): string => {
    const parts = timeStr.split(':');
    if (parts.length < 2) return new Date().toISOString();
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    const d = existingDate ? new Date(existingDate) : new Date('2026-11-14T08:30:00+07:00');
    d.setHours(hours, minutes, 0, 0);
    return d.toISOString();
  };

  // Sorted and filtered matches: Chronological sorting (earliest startTime at the top)
  const sortedAndFilteredMatches = React.useMemo(() => {
    let list = [...matches];

    // Filter by court
    if (courtFilter !== 'ALL') {
      list = list.filter((m) => m.courtNumber === courtFilter);
    }

    // Filter by category
    if (scheduleCategoryFilter !== 'ALL') {
      list = list.filter((m) => m.category === scheduleCategoryFilter);
    }

    // Filter by round
    if (scheduleRoundFilter === 'GROUP') {
      list = list.filter((m) => m.roundType === 'GROUP');
    } else if (scheduleRoundFilter === 'PLAYOFF') {
      list = list.filter((m) => m.roundType !== 'GROUP');
    }

    // Filter by search query
    if (scheduleSearchQuery.trim()) {
      const q = scheduleSearchQuery.toLowerCase().trim();
      list = list.filter(
        (m) =>
          m.matchCode.toLowerCase().includes(q) ||
          (m.teamA?.teamCode && m.teamA.teamCode.toLowerCase().includes(q)) ||
          (m.teamB?.teamCode && m.teamB.teamCode.toLowerCase().includes(q)) ||
          (m.teamA?.player1?.name && m.teamA.player1.name.toLowerCase().includes(q)) ||
          (m.teamA?.player2?.name && m.teamA.player2.name.toLowerCase().includes(q)) ||
          (m.teamB?.player1?.name && m.teamB.player1.name.toLowerCase().includes(q)) ||
          (m.teamB?.player2?.name && m.teamB.player2.name.toLowerCase().includes(q))
      );
    }

    // Sort strictly chronologically: earliest startTime first, then court, then orderIndex
    list.sort((a, b) => {
      const timeA = a.startTime ? new Date(a.startTime).getTime() : 0;
      const timeB = b.startTime ? new Date(b.startTime).getTime() : 0;
      if (timeA !== timeB) return timeA - timeB;
      if (a.courtNumber !== b.courtNumber) return a.courtNumber - b.courtNumber;
      return (a.orderIndex ?? 0) - (b.orderIndex ?? 0);
    });

    return list;
  }, [matches, courtFilter, scheduleCategoryFilter, scheduleRoundFilter, scheduleSearchQuery]);

  // Apply updates to API
  const applyScheduleUpdates = async (
    updates: Array<{ id: string; courtNumber?: number; startTime?: string; orderIndex?: number }>,
    ignoreConflicts: boolean = false
  ) => {
    try {
      const res = await fetch('/api/schedule', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates, ignoreConflicts }),
      });

      const data = await res.json();
      if (res.ok) {
        setMatches(data.matches || []);
        setConflicts(data.conflicts || []);
        if (data.conflicts && data.conflicts.length > 0) {
          showNotification(
            `⚠️ Đã lưu lịch thi đấu (ghi nhận ${data.conflicts.length} cảnh báo xung đột từ BTC)`,
            'success'
          );
        } else {
          showNotification('✅ Đã cập nhật lịch thi đấu thành công! Không có xung đột.', 'success');
        }
        return true;
      } else if (res.status === 409 && data.conflicts) {
        setPendingConflictAction({
          description: data.error || 'Cảnh báo xung đột lịch',
          updates,
          conflicts: data.conflicts,
        });
        setShowConflictModal(true);
        return false;
      } else {
        showNotification(data.error || 'Lỗi khi cập nhật lịch thi đấu', 'error');
        return false;
      }
    } catch (err: any) {
      showNotification(err.message, 'error');
      return false;
    }
  };

  // Request schedule change with client-side simulation & verification
  const requestScheduleChange = async (
    updates: Array<{ id: string; courtNumber?: number; startTime?: string; orderIndex?: number }>,
    description: string
  ) => {
    // Simulate on current matches
    const simulated = matches.map((m) => {
      const up = updates.find((u) => u.id === m.id);
      if (!up) return m;
      return {
        ...m,
        ...(up.courtNumber !== undefined ? { courtNumber: up.courtNumber } : {}),
        ...(up.startTime !== undefined ? { startTime: up.startTime } : {}),
        ...(up.orderIndex !== undefined ? { orderIndex: up.orderIndex } : {}),
      };
    });

    const detectedConflicts = checkScheduleConflicts(simulated as any);
    if (detectedConflicts.length > 0) {
      setPendingConflictAction({
        description,
        updates,
        conflicts: detectedConflicts,
      });
      setShowConflictModal(true);
    } else {
      await applyScheduleUpdates(updates, false);
    }
  };

  // Swap matches (from drag & drop or move buttons)
  const handleSwapMatches = async (idA: string, idB: string) => {
    if (!idA || !idB || idA === idB) return;
    const matchA = matches.find((m) => m.id === idA);
    const matchB = matches.find((m) => m.id === idB);
    if (!matchA || !matchB) return;

    const timeA = matchA.startTime ? new Date(matchA.startTime).toISOString() : undefined;
    const timeB = matchB.startTime ? new Date(matchB.startTime).toISOString() : undefined;

    const updates = [
      {
        id: matchA.id,
        startTime: timeB,
        courtNumber: matchB.courtNumber,
        orderIndex: matchB.orderIndex,
      },
      {
        id: matchB.id,
        startTime: timeA,
        courtNumber: matchA.courtNumber,
        orderIndex: matchA.orderIndex,
      },
    ];

    await requestScheduleChange(
      updates,
      `Đổi vị trí & giờ đấu giữa trận ${matchA.matchCode} và ${matchB.matchCode}`
    );
  };

  // Move step up or down in current list
  const handleMoveStep = async (id: string, direction: -1 | 1) => {
    const currentIndex = sortedAndFilteredMatches.findIndex((m) => m.id === id);
    if (currentIndex < 0) return;
    const targetIndex = currentIndex + direction;
    if (targetIndex < 0 || targetIndex >= sortedAndFilteredMatches.length) return;

    const targetMatch = sortedAndFilteredMatches[targetIndex];
    await handleSwapMatches(id, targetMatch.id);
  };

  // Inline Court change
  const handleCourtChange = async (matchId: string, courtNumber: number) => {
    const match = matches.find((m) => m.id === matchId);
    if (!match || match.courtNumber === courtNumber) return;

    await requestScheduleChange(
      [{ id: matchId, courtNumber }],
      `Chuyển trận ${match.matchCode} sang Sân ${courtNumber}`
    );
  };

  // Inline Time change
  const handleTimeChange = async (matchId: string, timeStr: string) => {
    const match = matches.find((m) => m.id === matchId);
    if (!match || !timeStr) return;

    const newIso = parseTimeToTournamentDate(timeStr, match.startTime);
    await requestScheduleChange(
      [{ id: matchId, startTime: newIso }],
      `Đổi giờ trận ${match.matchCode} sang ${timeStr}`
    );
  };

  // Quick offset minutes
  const handleQuickOffset = async (matchId: string, offsetMinutes: number) => {
    const match = matches.find((m) => m.id === matchId);
    if (!match) return;

    const cur = match.startTime ? new Date(match.startTime) : new Date('2026-11-14T08:30:00+07:00');
    const newDate = new Date(cur.getTime() + offsetMinutes * 60 * 1000);
    await requestScheduleChange(
      [{ id: matchId, startTime: newDate.toISOString() }],
      `Dịch giờ trận ${match.matchCode} ${offsetMinutes > 0 ? '+' : ''}${offsetMinutes} phút`
    );
  };

  // Reschedule match alias for compatibility
  const handleReschedule = async (matchId: string, courtNumber: number, minutesOffset: number) => {
    if (minutesOffset !== 0) {
      await handleQuickOffset(matchId, minutesOffset);
    } else {
      await handleCourtChange(matchId, courtNumber);
    }
  };

  // Force Save confirmed by BTC/admin
  const handleConfirmForceSave = async () => {
    if (!pendingConflictAction) return;
    await applyScheduleUpdates(pendingConflictAction.updates, true);
    setShowConflictModal(false);
    setPendingConflictAction(null);
  };

  const handleCancelConflictModal = () => {
    setShowConflictModal(false);
    setPendingConflictAction(null);
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

          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 backdrop-blur-md space-y-4">
            {/* Filter and Control Toolbar */}
            <div className="flex flex-col gap-4">
              {/* Row 1: Court Filter Tabs */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Filter className="h-3.5 w-3.5 text-sai-cyan" />
                    <span>Lọc Sân đấu:</span>
                  </span>
                  <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-2xl border border-slate-800">
                    <button
                      onClick={() => setCourtFilter('ALL')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                        courtFilter === 'ALL'
                          ? 'bg-sai-cyan text-slate-950 shadow-md shadow-cyan-500/20'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <span>Tất cả các sân</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                        courtFilter === 'ALL' ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {matches.length}
                      </span>
                    </button>

                    {[1, 2, 3].map((c) => {
                      const count = matches.filter((m) => m.courtNumber === c).length;
                      return (
                        <button
                          key={c}
                          onClick={() => setCourtFilter(c as any)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                            courtFilter === c
                              ? 'bg-sai-cyan text-slate-950 shadow-md shadow-cyan-500/20'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          <span className={`h-2 w-2 rounded-full ${c === 1 ? 'bg-cyan-400' : c === 2 ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                          <span>Sân {c}</span>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                            courtFilter === c ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-800 text-slate-400'
                          }`}>
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Right Info: Total and sorting note */}
                <div className="text-xs text-slate-400 flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-sai-yellow" />
                  <span>Sắp xếp tự động: <strong className="text-white">Thời gian tăng dần (08:30 → 17:00)</strong></span>
                </div>
              </div>

              {/* Row 2: Category, Round filter & Search */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Category Filter */}
                  <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                    {(['ALL', 'XD', 'MD'] as const).map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setScheduleCategoryFilter(cat)}
                        className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                          scheduleCategoryFilter === cat
                            ? 'bg-slate-800 text-white shadow'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {cat === 'ALL' ? 'Tất cả ND' : cat === 'XD' ? 'Đôi Nam Nữ (XD)' : 'Đôi Nam (MD)'}
                      </button>
                    ))}
                  </div>

                  {/* Round Filter */}
                  <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                    {(['ALL', 'GROUP', 'PLAYOFF'] as const).map((rnd) => (
                      <button
                        key={rnd}
                        onClick={() => setScheduleRoundFilter(rnd)}
                        className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                          scheduleRoundFilter === rnd
                            ? 'bg-slate-800 text-white shadow'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {rnd === 'ALL' ? 'Tất cả vòng' : rnd === 'GROUP' ? 'Vòng Bảng' : 'Vòng Playoff'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Search Box */}
                <div className="relative min-w-[240px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                  <input
                    type="text"
                    value={scheduleSearchQuery}
                    onChange={(e) => setScheduleSearchQuery(e.target.value)}
                    placeholder="Tìm mã trận, đội, tên VĐV..."
                    className="w-full pl-9 pr-7 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sai-cyan"
                  />
                  {scheduleSearchQuery && (
                    <button
                      onClick={() => setScheduleSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {/* Helpful Tips banner */}
              <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-slate-950/60 border border-slate-800/80 text-[11px] text-slate-400">
                <span className="flex items-center gap-1.5">
                  <span className="text-sai-cyan font-bold">💡 Thao tác nhanh:</span>
                  <span>Kéo thả hàng (hoặc bấm nút ▲ / ▼) để hoán đổi lịch. Có thể đổi trực tiếp Sân (Court 1, 2, 3) hoặc chỉnh giờ thi đấu. Nếu trùng lịch VĐV Pool 1, hệ thống sẽ hỏi xác nhận để bạn ép lưu theo ý muốn.</span>
                </span>
                <span className="shrink-0 font-bold text-slate-300">
                  Hiển thị: <strong className="text-sai-cyan">{sortedAndFilteredMatches.length}</strong> / {matches.length} trận
                </span>
              </div>
            </div>

            {/* Interactive Schedule Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider font-bold text-[10px]">
                    <th className="py-2.5 px-2.5 w-16 text-center">STT / Xếp</th>
                    <th className="py-2.5 px-3">Mã trận</th>
                    <th className="py-2.5 px-3">Sân đấu</th>
                    <th className="py-2.5 px-3">Giờ thi đấu</th>
                    <th className="py-2.5 px-3">Nội dung</th>
                    <th className="py-2.5 px-3">Đội A (Roster)</th>
                    <th className="py-2.5 px-3">Đội B (Roster)</th>
                    <th className="py-2.5 px-3">VĐV Pool 1</th>
                    <th className="py-2.5 px-3">Trạng thái</th>
                    <th className="py-2.5 px-3 text-right">Dịch giờ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {sortedAndFilteredMatches.map((m, idx) => {
                    const pool1A = m.teamA?.player1?.pool === 1 ? m.teamA.player1.name : null;
                    const pool1B = m.teamB?.player1?.pool === 1 ? m.teamB.player1.name : null;
                    const hasConflict = conflicts.some(
                      (c) => c.matchA.id === m.id || c.matchB.id === m.id
                    );
                    const isDragging = draggedMatchId === m.id;
                    const isDragOver = dragOverMatchId === m.id;

                    return (
                      <tr
                        key={m.id}
                        draggable={true}
                        onDragStart={(e) => {
                          e.dataTransfer.setData('text/plain', m.id);
                          setDraggedMatchId(m.id);
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = 'move';
                          if (dragOverMatchId !== m.id) setDragOverMatchId(m.id);
                        }}
                        onDragLeave={() => {
                          if (dragOverMatchId === m.id) setDragOverMatchId(null);
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          setDragOverMatchId(null);
                          const sourceId = e.dataTransfer.getData('text/plain') || draggedMatchId;
                          if (sourceId && sourceId !== m.id) {
                            handleSwapMatches(sourceId, m.id);
                          }
                          setDraggedMatchId(null);
                        }}
                        onDragEnd={() => {
                          setDraggedMatchId(null);
                          setDragOverMatchId(null);
                        }}
                        className={`transition-all duration-150 ${
                          isDragging
                            ? 'opacity-30 border-2 border-dashed border-cyan-400 bg-slate-900/60'
                            : isDragOver
                            ? 'border-t-2 border-cyan-400 bg-cyan-950/40 shadow-lg scale-[1.005]'
                            : hasConflict
                            ? 'bg-rose-950/35 border-l-4 border-rose-500 text-rose-100 hover:bg-rose-950/50'
                            : 'hover:bg-slate-800/40'
                        }`}
                      >
                        {/* 1. STT / Reorder Controls */}
                        <td className="py-2.5 px-2 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <span
                              title="Kéo thả hàng để hoán đổi thứ tự"
                              className="cursor-grab active:cursor-grabbing text-slate-500 hover:text-sai-cyan p-0.5"
                            >
                              <GripVertical className="h-3.5 w-3.5" />
                            </span>
                            <div className="flex flex-col">
                              <button
                                onClick={() => handleMoveStep(m.id, -1)}
                                disabled={idx === 0}
                                title="Đẩy trận lên sớm hơn"
                                className="p-0.5 hover:bg-slate-800 rounded disabled:opacity-20 text-slate-400 hover:text-sai-cyan"
                              >
                                <ArrowUp className="h-2.5 w-2.5" />
                              </button>
                              <button
                                onClick={() => handleMoveStep(m.id, 1)}
                                disabled={idx === sortedAndFilteredMatches.length - 1}
                                title="Đẩy trận xuống muộn hơn"
                                className="p-0.5 hover:bg-slate-800 rounded disabled:opacity-20 text-slate-400 hover:text-sai-cyan"
                              >
                                <ArrowDown className="h-2.5 w-2.5" />
                              </button>
                            </div>
                            <span className="font-mono text-[10px] text-slate-500 font-bold ml-0.5">
                              #{idx + 1}
                            </span>
                          </div>
                        </td>

                        {/* 2. Match Code & Round */}
                        <td className="py-2.5 px-3">
                          <div className="flex flex-col">
                            <span className="font-mono font-black text-white text-xs flex items-center gap-1">
                              {m.matchCode}
                              {hasConflict && (
                                <span title="Có xung đột lịch VĐV!">
                                  <AlertTriangle className="h-3.5 w-3.5 text-rose-400 inline" />
                                </span>
                              )}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {m.roundType === 'GROUP' ? 'Vòng Bảng' : m.roundType === 'SEMI' ? 'Bán Kết' : m.roundType === 'BRONZE' ? 'Tranh Hạng 3' : 'Chung Kết'}
                            </span>
                          </div>
                        </td>

                        {/* 3. Court Selection (Court 1, 2, or 3) */}
                        <td className="py-2.5 px-3">
                          <select
                            value={m.courtNumber}
                            onChange={(e) => handleCourtChange(m.id, parseInt(e.target.value))}
                            className={`rounded-lg bg-slate-950 border px-2 py-1 text-xs font-bold transition focus:outline-none focus:ring-1 focus:ring-cyan-500 ${
                              m.courtNumber === 1
                                ? 'text-cyan-300 border-cyan-800/60'
                                : m.courtNumber === 2
                                ? 'text-amber-300 border-amber-800/60'
                                : 'text-emerald-300 border-emerald-800/60'
                            }`}
                          >
                            <option value={1}>Sân 1 (Court 1)</option>
                            <option value={2}>Sân 2 (Court 2)</option>
                            <option value={3}>Sân 3 (Court 3)</option>
                          </select>
                        </td>

                        {/* 4. Start Time (Inline editable) */}
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1.5">
                            <input
                              type="time"
                              value={formatTimeForInput(m.startTime)}
                              onChange={(e) => handleTimeChange(m.id, e.target.value)}
                              className="rounded-lg bg-slate-950 border border-slate-700 px-2 py-1 text-xs font-mono text-white focus:outline-none focus:border-sai-cyan"
                              title="Click để sửa giờ thi đấu chính xác"
                            />
                          </div>
                        </td>

                        {/* 5. Category */}
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                              m.category === 'XD'
                                ? 'bg-cyan-950 text-cyan-300 border border-cyan-800/60'
                                : 'bg-amber-950 text-amber-300 border border-amber-800/60'
                            }`}
                          >
                            {m.category === 'XD' ? 'Đôi Nữ Nữ / XD' : 'Đôi Nam / MD'}
                          </span>
                        </td>

                        {/* 6. Team A (Roster) */}
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-white">{m.teamA?.teamCode || 'Chưa XĐ'}</div>
                          <div className="text-[10px] text-slate-400 truncate max-w-[130px]">
                            {m.teamA ? `${m.teamA.player1.name} & ${m.teamA.player2.name}` : 'Chờ kết quả BXH'}
                          </div>
                        </td>

                        {/* 7. Team B (Roster) */}
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-white">{m.teamB?.teamCode || 'Chưa XĐ'}</div>
                          <div className="text-[10px] text-slate-400 truncate max-w-[130px]">
                            {m.teamB ? `${m.teamB.player1.name} & ${m.teamB.player2.name}` : 'Chờ kết quả BXH'}
                          </div>
                        </td>

                        {/* 8. Pool 1 Athletes */}
                        <td className="py-2.5 px-3 font-mono text-[11px] text-sai-yellow">
                          {[pool1A, pool1B].filter(Boolean).join(', ') || '-'}
                        </td>

                        {/* 9. Match Status */}
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                              m.status === 'COMPLETED'
                                ? 'bg-slate-800 text-slate-300'
                                : m.status === 'IN_PROGRESS'
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/50 animate-pulse'
                                : 'bg-slate-900 text-slate-400'
                            }`}
                          >
                            {m.status === 'COMPLETED' ? 'Đã xong' : m.status === 'IN_PROGRESS' ? 'Đang đấu' : 'Chờ đấu'}
                          </span>
                        </td>

                        {/* 10. Actions (Quick Offset) */}
                        <td className="py-2.5 px-3 text-right">
                          <div className="inline-flex gap-1">
                            <button
                              onClick={() => handleQuickOffset(m.id, -10)}
                              className="px-1.5 py-1 rounded bg-slate-800 text-[10px] text-slate-300 hover:text-white hover:bg-slate-700"
                              title="Dịch sớm lại 10 phút"
                            >
                              -10m
                            </button>
                            <button
                              onClick={() => handleQuickOffset(m.id, 10)}
                              className="px-1.5 py-1 rounded bg-slate-800 text-[10px] text-slate-300 hover:text-white hover:bg-slate-700"
                              title="Dịch muộn đi 10 phút"
                            >
                              +10m
                            </button>
                            <button
                              onClick={() => handleQuickOffset(m.id, -15)}
                              className="px-1.5 py-1 rounded bg-slate-800 text-[10px] text-slate-300 hover:text-white hover:bg-slate-700"
                              title="Dịch sớm lại 15 phút"
                            >
                              -15m
                            </button>
                            <button
                              onClick={() => handleQuickOffset(m.id, 15)}
                              className="px-1.5 py-1 rounded bg-slate-800 text-[10px] text-slate-300 hover:text-white hover:bg-slate-700"
                              title="Dịch muộn đi 15 phút"
                            >
                              +15m
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {sortedAndFilteredMatches.length === 0 && (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-slate-500 text-xs">
                        Không tìm thấy trận đấu nào phù hợp với bộ lọc hiện tại.
                      </td>
                    </tr>
                  )}
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
                    {m.matchCode} ({m.category}) - {m.teamA?.teamCode || 'Chưa XĐ'} vs {m.teamB?.teamCode || 'Chưa XĐ'} [Court {m.courtNumber}]
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

      {/* FORCE SAVE / CONFLICT OVERRIDE CONFIRMATION MODAL */}
      {showConflictModal && pendingConflictAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl rounded-3xl border-2 border-rose-500/80 bg-slate-900 p-6 shadow-2xl shadow-rose-950/50">
            {/* Modal Header */}
            <div className="flex items-start gap-4 mb-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-600/30 text-rose-400 border border-rose-500/50">
                <AlertTriangle className="h-7 w-7 text-rose-400 animate-pulse" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-black text-rose-200 uppercase tracking-wide">
                  Cảnh Báo Xung Đột Lịch Thi Đấu ({pendingConflictAction.conflicts.length} vi phạm)
                </h3>
                <p className="text-xs text-slate-300 mt-1">
                  Thao tác: <span className="font-bold text-white">{pendingConflictAction.description}</span>
                </p>
              </div>
              <button
                onClick={handleCancelConflictModal}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                ✕
              </button>
            </div>

            {/* List of Detected Violations */}
            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1 my-4">
              {pendingConflictAction.conflicts.map((c, idx) => (
                <div key={idx} className="p-3 rounded-2xl bg-rose-950/40 border border-rose-800/80 text-xs">
                  <div className="flex items-center justify-between font-bold text-rose-300 mb-1">
                    <span className="flex items-center gap-1.5">
                      <span>👤 VĐV Pool 1: <strong className="text-white underline">{c.playerName}</strong></span>
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-900 text-rose-100">
                      {c.type === 'SIMULTANEOUS_MATCH' ? 'Trùng giờ cùng lúc' : 'Nghỉ < 10 phút'}
                    </span>
                  </div>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    {c.message}
                  </p>
                </div>
              ))}
            </div>

            {/* Rules Note */}
            <div className="rounded-2xl bg-amber-950/30 border border-amber-800/60 p-3.5 text-[11px] text-amber-200 mb-6">
              <div className="font-bold text-amber-300 mb-1 flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5 text-sai-yellow" />
                <span>Quy tắc bảo vệ thể lực VĐV (Collision Prevention Engine):</span>
              </div>
              Vận động viên Nhóm 1 (Pool 1) thi đấu cả 2 nội dung Đôi Nam Nữ & Đôi Nam không được phép thi đấu trên 2 sân cùng một thời điểm và cần tối thiểu <strong>10 phút nghỉ ngơi</strong> giữa 2 trận liên tiếp.
              <div className="mt-2 text-slate-300">
                Nếu BTC/Admin đã tính toán thực tế tại sân (ví dụ trận trước kết thúc sớm hơn dự kiến, hoặc VĐV đồng ý đánh tiếp để giải chạy nhanh) và <strong>chắc chắn muốn sắp xếp cứng (Hard Schedule)</strong>, hãy nhấn <em>"Đồng ý ép lưu"</em>.
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={handleCancelConflictModal}
                className="px-5 py-2.5 rounded-xl border border-slate-700 bg-slate-800 text-xs font-bold text-slate-300 hover:bg-slate-700 hover:text-white transition"
              >
                Hủy bỏ & Giữ nguyên lịch cũ
              </button>
              <button
                type="button"
                onClick={handleConfirmForceSave}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 via-rose-500 to-amber-600 text-xs font-black text-white shadow-lg shadow-rose-950/60 hover:brightness-110 active:scale-95 transition"
              >
                <AlertTriangle className="h-4 w-4" />
                <span>Đồng ý ép lưu (Force Save)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

