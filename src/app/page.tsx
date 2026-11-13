'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSocket } from '../lib/socket-client';
import { CourtCard } from '../components/CourtCard';
import { MatchData } from '../types';
import {
  Activity,
  Flame,
  Clock,
  CheckCircle2,
  CalendarDays,
  Filter,
  RefreshCw,
  Trophy,
} from 'lucide-react';
import Link from 'next/link';
import { useLanguage } from '../lib/i18n';
import { getPlayoffSlotInfo } from '../lib/playoff-utils';
import { PageLoader } from '../components/PageLoader';

export default function HomePage() {
  const { isConnected, subscribeToScore, subscribeToMatchStatus, subscribeToSchedule, subscribeToReconnect } = useSocket();
  const { t, locale } = useLanguage();
  const [matches, setMatches] = useState<MatchData[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'XD' | 'MD'>('ALL');
  const [courtFilter, setCourtFilter] = useState<'ALL' | 1 | 2 | 3>('ALL');

  const fetchMatches = useCallback(async () => {
    try {
      const res = await fetch('/api/matches');
      if (res.ok) {
        const data: MatchData[] = await res.json();
        setMatches(data);
      }
    } catch (err) {
      console.error('Failed to load matches:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  // Real-time subscription to score and match status
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

    const unsubSchedule = subscribeToSchedule(() => {
      fetchMatches();
    });

    const unsubReconnect = subscribeToReconnect(() => {
      fetchMatches();
    });

    return () => {
      unsubScore();
      unsubStatus();
      unsubSchedule();
      unsubReconnect();
    };
  }, [subscribeToScore, subscribeToMatchStatus, subscribeToSchedule, subscribeToReconnect, fetchMatches]);

  // Safety-net polling only if WebSocket is disconnected
  useEffect(() => {
    if (isConnected) return;
    const fallbackTimer = setInterval(() => {
      fetchMatches();
    }, 4000);
    return () => clearInterval(fallbackTimer);
  }, [isConnected, fetchMatches]);

  // Sort matches chronologically (startTime asc, courtNumber asc, orderIndex asc)
  const sortedMatches = [...matches].sort((a, b) => {
    const tA = a.startTime ? new Date(a.startTime).getTime() : 0;
    const tB = b.startTime ? new Date(b.startTime).getTime() : 0;
    if (tA !== tB) return tA - tB;
    if (a.courtNumber !== b.courtNumber) return a.courtNumber - b.courtNumber;
    return (a.orderIndex ?? 0) - (b.orderIndex ?? 0);
  });

  // Compute round slot number ("Lượt 1", "Lượt 2", ...) based on distinct group startTimes
  const groupStartTimes = Array.from(
    new Set(
      sortedMatches
        .filter((m) => m.roundType === 'GROUP' && m.startTime)
        .map((m) => new Date(m.startTime!).getTime())
    )
  ).sort((a, b) => a - b);

  // Filter matches by category if requested
  const filteredMatches = sortedMatches.filter((m) => {
    if (categoryFilter === 'ALL') return true;
    return m.category === categoryFilter;
  });

  const tableMatches = filteredMatches.filter((m) => {
    if (courtFilter === 'ALL') return true;
    return m.courtNumber === courtFilter;
  });

  // For each court (1, 2, 3), find current active match and next match
  const getCourtMatches = (courtNum: number) => {
    const courtMatches = filteredMatches.filter((m) => m.courtNumber === courtNum);
    const active =
      courtMatches.find((m) => m.status === 'IN_PROGRESS') ||
      courtMatches.find((m) => m.status === 'SCHEDULED') ||
      courtMatches.find((m) => m.status === 'COMPLETED');

    const next = courtMatches.find((m) => m.status === 'SCHEDULED' && m.id !== active?.id);

    return { active, next };
  };

  const inProgressCount = matches.filter((m) => m.status === 'IN_PROGRESS').length;
  const completedCount = matches.filter((m) => m.status === 'COMPLETED').length;
  const scheduledCount = matches.filter((m) => m.status === 'SCHEDULED').length;

  // Dynamically resolve active courts from current schedule (supports 2 courts or 3 courts)
  const courtNumbers = Array.from(new Set(matches.map((m) => m.courtNumber))).sort((a, b) => a - b);
  const activeCourtsList = courtNumbers.length > 0 ? courtNumbers : [1, 2, 3];

  if (loading) {
    return (
      <PageLoader
        title={locale === 'vi' ? 'Đang tải Trực Tiếp Sân & Lịch Thi Đấu...' : 'Loading Live Courts & Match Schedule...'}
        subtitle={
          locale === 'vi'
            ? 'Đang đồng bộ điểm số trực tiếp trên các sân và danh sách cặp đấu...'
            : 'Syncing live court scores and tournament schedule...'
        }
      />
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-3 py-4 sm:px-6 sm:py-6">
      {/* Hero Header */}
      <div className="relative mb-6 sm:mb-8 overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-800 bg-gradient-to-r from-sai-navy-950 via-slate-900 to-sai-navy-900 p-4 sm:p-8 shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 sm:gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="flex h-2 w-2 rounded-full bg-sai-cyan animate-ping" />
              <span className="text-[11px] sm:text-xs font-extrabold uppercase tracking-widest text-sai-cyan">
                {t('home.broadcastCenter')}
              </span>
              <span className="rounded-full bg-sai-cyan/10 border border-sai-cyan/30 px-2.5 py-0.5 text-[10px] sm:text-[11px] font-bold text-sai-cyan">
                📅 14/11/2026
              </span>
            </div>
            <h1 className="text-xl sm:text-4xl font-black tracking-tight text-white">
              {t('home.title')}
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-400 max-w-xl">
              {t('home.description')}
            </p>
          </div>

          {/* Quick Tournament Metrics */}
          <div className="grid grid-cols-3 sm:flex items-center gap-2 sm:gap-3 w-full md:w-auto">
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 rounded-xl sm:rounded-2xl border border-slate-800 bg-slate-950/70 px-2.5 sm:px-3.5 py-2">
              <Flame className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-400 animate-pulse shrink-0" />
              <div>
                <div className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-500">{t('home.metric.live')}</div>
                <div className="text-xs sm:text-sm font-black text-white">{inProgressCount} <span className="hidden sm:inline">{t('home.matches')}</span></div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 rounded-xl sm:rounded-2xl border border-slate-800 bg-slate-950/70 px-2.5 sm:px-3.5 py-2">
              <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-400 shrink-0" />
              <div>
                <div className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-500">{t('home.metric.completed')}</div>
                <div className="text-xs sm:text-sm font-black text-white">{completedCount} <span className="hidden sm:inline">{t('home.matches')}</span></div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 rounded-xl sm:rounded-2xl border border-slate-800 bg-slate-950/70 px-2.5 sm:px-3.5 py-2">
              <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-sai-cyan shrink-0" />
              <div>
                <div className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-500">{t('home.metric.upcoming')}</div>
                <div className="text-xs sm:text-sm font-black text-white">{scheduledCount} <span className="hidden sm:inline">{t('home.matches')}</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Category Filter and Refresh Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 sm:gap-3 mb-5 sm:mb-6">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar max-w-full">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 hidden sm:flex items-center gap-1.5 shrink-0">
            <Filter className="h-3.5 w-3.5 text-sai-cyan" />
            {t('home.filter.category')}
          </span>
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
            {(['ALL', 'XD', 'MD'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 sm:py-1 rounded-lg text-xs font-bold transition-all shrink-0 ${
                  categoryFilter === cat
                    ? 'bg-sai-cyan text-slate-950 shadow-md shadow-cyan-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {cat === 'ALL' ? t('home.filter.all') : cat === 'XD' ? t('home.filter.xd') : t('home.filter.md')}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/standings"
            className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2 text-xs font-bold text-sai-yellow hover:bg-slate-800 transition"
          >
            <Trophy className="h-3.5 w-3.5" />
            <span>{t('home.btn.viewStandings')}</span>
          </Link>
          <button
            onClick={() => fetchMatches()}
            className="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-900 p-2 text-slate-400 hover:text-white transition"
            title={t('home.btn.refresh')}
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Real-time Courts View (Supports 2 or 3 active courts) */}
      <div className={`grid grid-cols-1 ${activeCourtsList.length === 2 ? 'md:grid-cols-2' : 'lg:grid-cols-3'} gap-6 mb-10`}>
        {activeCourtsList.map((courtNum) => {
          const { active, next } = getCourtMatches(courtNum);
          return (
            <CourtCard
              key={courtNum}
              courtNumber={courtNum}
              activeMatch={active}
              nextMatch={next}
            />
          );
        })}
      </div>

      {/* All Scheduled & Recent Matches Stream */}
      <div className="rounded-2xl sm:rounded-3xl border border-slate-800 bg-slate-900/80 p-3.5 sm:p-6 backdrop-blur-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h2 className="text-base font-extrabold text-white flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-sai-cyan" />
            <span>Lịch Thi Đấu & Tiến Trình Các Trận Đấu</span>
          </h2>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs overflow-x-auto no-scrollbar">
              {(['ALL', 1, 2, 3] as const).map((c) => (
                <button
                  key={c}
                  onClick={() => setCourtFilter(c)}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all shrink-0 ${
                    courtFilter === c
                      ? 'bg-sai-cyan text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {c === 'ALL' ? 'Tất cả sân' : `Sân ${c}`}
                </button>
              ))}
            </div>
            <span className="text-xs text-slate-500 font-mono">{tableMatches.length} trận đấu</span>
          </div>
        </div>

        {/* Mobile Cards View for Spectator Schedule */}
        <div className="space-y-3 md:hidden">
          {tableMatches.map((m) => {
            const s1 = m.sets[0];
            const luotIdx =
              m.roundType === 'GROUP' && m.startTime
                ? groupStartTimes.indexOf(new Date(m.startTime).getTime()) + 1
                : 0;
            const roundLabel =
              luotIdx > 0
                ? `Lượt ${luotIdx}`
                : m.roundType === 'SEMI'
                ? `Bán kết ${m.category}`
                : m.roundType === 'BRONZE'
                ? `Hạng 3 ${m.category}`
                : `Chung kết ${m.category}`;
            const isWinnerA = Boolean(m.winnerTeamId && m.teamAId && m.winnerTeamId === m.teamAId);
            const isWinnerB = Boolean(m.winnerTeamId && m.teamBId && m.winnerTeamId === m.teamBId);
            return (
              <div
                key={m.id}
                className="rounded-2xl border border-slate-800 bg-slate-950/80 p-3.5 space-y-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`inline-block rounded-lg px-2 py-0.5 text-[11px] font-bold ${
                        luotIdx > 0
                          ? 'bg-slate-800 text-sai-yellow border border-slate-700'
                          : 'bg-amber-950/60 text-amber-300 border border-amber-800/60'
                      }`}
                    >
                      {roundLabel}
                    </span>
                    <span
                      className={`inline-block rounded-lg px-2 py-0.5 text-[11px] font-bold ${
                        m.courtNumber === 1
                          ? 'bg-cyan-950/70 text-cyan-300 border border-cyan-800/50'
                          : m.courtNumber === 2
                          ? 'bg-amber-950/70 text-amber-300 border border-amber-800/50'
                          : 'bg-emerald-950/70 text-emerald-300 border border-emerald-800/50'
                      }`}
                    >
                      Sân {m.courtNumber}
                    </span>
                  </div>

                  <span
                    className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      m.status === 'IN_PROGRESS'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse'
                        : m.status === 'COMPLETED'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {m.status === 'IN_PROGRESS'
                      ? 'Đang đấu'
                      : m.status === 'COMPLETED'
                      ? 'Đã xong'
                      : 'Chưa đấu'}
                  </span>
                </div>

                {/* Matchup Rows */}
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className={`font-extrabold truncate ${isWinnerA ? 'text-emerald-300' : 'text-white'}`}>
                        {m.teamA ? `${m.teamA.player1.name} & ${m.teamA.player2.name}` : getPlayoffSlotInfo(m.matchCode, 'A', locale).note}
                      </div>
                      {m.teamA && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="rounded bg-sai-cyan/20 border border-sai-cyan/40 px-1.5 py-0.5 text-[10px] font-mono font-bold text-sai-cyan">
                            {m.teamA.teamCode}
                          </span>
                          {isWinnerA && (
                            <span className="rounded bg-emerald-500/20 border border-emerald-500/40 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300">
                              Thắng
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="shrink-0 font-mono font-black text-base text-sai-cyan">
                      {m.teamA && m.teamB
                        ? m.sets.length > 1
                          ? m.sets.map((s) => s.teamAScore).join(' / ')
                          : s1?.teamAScore ?? 0
                        : '--'}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-slate-800/70">
                    <div className="min-w-0">
                      <div className={`font-extrabold truncate ${isWinnerB ? 'text-emerald-300' : 'text-white'}`}>
                        {m.teamB ? `${m.teamB.player1.name} & ${m.teamB.player2.name}` : getPlayoffSlotInfo(m.matchCode, 'B', locale).note}
                      </div>
                      {m.teamB && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="rounded bg-sai-yellow/20 border border-sai-yellow/40 px-1.5 py-0.5 text-[10px] font-mono font-bold text-sai-yellow">
                            {m.teamB.teamCode}
                          </span>
                          {isWinnerB && (
                            <span className="rounded bg-emerald-500/20 border border-emerald-500/40 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300">
                              Thắng
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="shrink-0 font-mono font-black text-base text-sai-yellow">
                      {m.teamA && m.teamB
                        ? m.sets.length > 1
                          ? m.sets.map((s) => s.teamBScore).join(' / ')
                          : s1?.teamBScore ?? 0
                        : '--'}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider font-bold">
                <th className="py-2.5 px-3 whitespace-nowrap">Lượt</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Sân</th>
                <th className="py-2.5 px-3">Đội A (VĐV)</th>
                <th className="py-2.5 px-3 text-center whitespace-nowrap">Tỉ Số</th>
                <th className="py-2.5 px-3">Đội B (VĐV)</th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap">Trạng Thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {tableMatches.map((m) => {
                const s1 = m.sets[0];
                const luotIdx =
                  m.roundType === 'GROUP' && m.startTime
                    ? groupStartTimes.indexOf(new Date(m.startTime).getTime()) + 1
                    : 0;
                const roundLabel =
                  luotIdx > 0
                    ? `Lượt ${luotIdx}`
                    : m.roundType === 'SEMI'
                    ? `Bán kết ${m.category}`
                    : m.roundType === 'BRONZE'
                    ? `Hạng 3 ${m.category}`
                    : `Chung kết ${m.category}`;
                const isWinnerA = Boolean(m.winnerTeamId && m.teamAId && m.winnerTeamId === m.teamAId);
                const isWinnerB = Boolean(m.winnerTeamId && m.teamBId && m.winnerTeamId === m.teamBId);
                return (
                  <tr key={m.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span
                        className={`inline-block rounded-lg px-2 py-1 text-[11px] font-bold ${
                          luotIdx > 0
                            ? 'bg-slate-800 text-sai-yellow border border-slate-700'
                            : 'bg-amber-950/60 text-amber-300 border border-amber-800/60'
                        }`}
                      >
                        {roundLabel}
                      </span>
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span
                        className={`inline-block rounded-lg px-2 py-1 text-[11px] font-bold ${
                          m.courtNumber === 1
                            ? 'bg-cyan-950/70 text-cyan-300 border border-cyan-800/50'
                            : m.courtNumber === 2
                            ? 'bg-amber-950/70 text-amber-300 border border-amber-800/50'
                            : 'bg-emerald-950/70 text-emerald-300 border border-emerald-800/50'
                        }`}
                      >
                        Sân {m.courtNumber}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-bold text-white">
                      {m.teamA ? (
                        <div>
                          <div className={`font-extrabold text-xs sm:text-sm ${isWinnerA ? 'text-emerald-300' : 'text-white'}`}>
                            {m.teamA.player1.name} & {m.teamA.player2.name}
                          </div>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="inline-block rounded bg-sai-cyan/20 border border-sai-cyan/40 px-1.5 py-0.5 text-[10px] font-mono font-bold text-sai-cyan">
                              {m.teamA.teamCode}
                            </span>
                            {isWinnerA && (
                              <span className="inline-block rounded bg-emerald-500/20 border border-emerald-500/40 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300">
                                Thắng
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="font-bold text-slate-400 text-xs flex items-center gap-1.5">
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-slate-600" />
                            <span>Chưa xác định</span>
                          </div>
                          <span className="inline-block text-[10px] font-mono text-sai-cyan mt-0.5">
                            {getPlayoffSlotInfo(m.matchCode, 'A', locale).note}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-black text-sm sm:text-base text-sai-yellow whitespace-nowrap">
                      {m.teamA && m.teamB ? (
                        m.sets.length > 1 ? (
                          <div className="flex flex-col items-center gap-0.5">
                            {m.sets.map((s) => (
                              <span key={s.id} className="text-xs leading-tight">
                                {s.teamAScore} - {s.teamBScore}
                              </span>
                            ))}
                          </div>
                        ) : s1 ? (
                          `${s1.teamAScore} - ${s1.teamBScore}`
                        ) : (
                          '0 - 0'
                        )
                      ) : (
                        <span className="text-slate-600">--</span>
                      )}
                    </td>
                    <td className="py-3 px-3 font-bold text-white">
                      {m.teamB ? (
                        <div>
                          <div className={`font-extrabold text-xs sm:text-sm ${isWinnerB ? 'text-emerald-300' : 'text-white'}`}>
                            {m.teamB.player1.name} & {m.teamB.player2.name}
                          </div>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="inline-block rounded bg-sai-yellow/20 border border-sai-yellow/40 px-1.5 py-0.5 text-[10px] font-mono font-bold text-sai-yellow">
                              {m.teamB.teamCode}
                            </span>
                            {isWinnerB && (
                              <span className="inline-block rounded bg-emerald-500/20 border border-emerald-500/40 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300">
                                Thắng
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="font-bold text-slate-400 text-xs flex items-center gap-1.5">
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-slate-600" />
                            <span>Chưa xác định</span>
                          </div>
                          <span className="inline-block text-[10px] font-mono text-sai-yellow mt-0.5">
                            {getPlayoffSlotInfo(m.matchCode, 'B', locale).note}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      <span
                        className={`inline-block rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                          m.status === 'IN_PROGRESS'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse'
                            : m.status === 'COMPLETED'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {m.status === 'IN_PROGRESS'
                          ? 'Đang đấu'
                          : m.status === 'COMPLETED'
                          ? 'Đã xong'
                          : 'Chưa đấu'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

