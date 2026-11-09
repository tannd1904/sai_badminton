'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSocket } from '@/lib/socket-client';
import { CourtCard } from '@/components/CourtCard';
import { MatchData } from '@/types';
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
import { useLanguage } from '@/lib/i18n';

export default function HomePage() {
  const { isConnected, subscribeToScore, subscribeToMatchStatus } = useSocket();
  const { t } = useLanguage();
  const [matches, setMatches] = useState<MatchData[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'XD' | 'MD'>('ALL');

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

    const unsubStatus = subscribeToMatchStatus((payload: any) => {
      fetchMatches();
    });

    return () => {
      unsubScore();
      unsubStatus();
    };
  }, [subscribeToScore, subscribeToMatchStatus, fetchMatches]);

  // Filter matches by category if requested
  const filteredMatches = matches.filter((m) => {
    if (categoryFilter === 'ALL') return true;
    return m.category === categoryFilter;
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

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      {/* Hero Header */}
      <div className="relative mb-8 overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-r from-sai-navy-950 via-slate-900 to-sai-navy-900 p-6 sm:p-8 shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="flex h-2 w-2 rounded-full bg-sai-cyan animate-ping" />
              <span className="text-xs font-extrabold uppercase tracking-widest text-sai-cyan">
                {t('home.broadcastCenter')}
              </span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
              {t('home.title')}
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-400 max-w-xl">
              {t('home.description')}
            </p>
          </div>

          {/* Quick Tournament Metrics */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <div className="flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-950/70 px-3.5 py-2">
              <Flame className="h-4 w-4 text-emerald-400 animate-pulse" />
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-500">{t('home.metric.live')}</div>
                <div className="text-sm font-black text-white">{inProgressCount} {t('home.matches')}</div>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-950/70 px-3.5 py-2">
              <CheckCircle2 className="h-4 w-4 text-amber-400" />
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-500">{t('home.metric.completed')}</div>
                <div className="text-sm font-black text-white">{completedCount} {t('home.matches')}</div>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-950/70 px-3.5 py-2">
              <Clock className="h-4 w-4 text-sai-cyan" />
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-500">{t('home.metric.upcoming')}</div>
                <div className="text-sm font-black text-white">{scheduledCount} {t('home.matches')}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Category Filter and Refresh Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-sai-cyan" />
            {t('home.filter.category')}
          </span>
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
            {(['ALL', 'XD', 'MD'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
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
      <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 backdrop-blur-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-extrabold text-white flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-sai-cyan" />
            <span>Danh sách toàn bộ các trận đấu & Tiến trình thi đấu</span>
          </h2>
          <span className="text-xs text-slate-500 font-mono">{filteredMatches.length} trận đấu</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider font-bold">
                <th className="py-2.5 px-3">Mã Trận</th>
                <th className="py-2.5 px-3">Sân</th>
                <th className="py-2.5 px-3">Nội Dung</th>
                <th className="py-2.5 px-3">Vòng</th>
                <th className="py-2.5 px-3">Đội A (VĐV)</th>
                <th className="py-2.5 px-3 text-center">Tỉ Số</th>
                <th className="py-2.5 px-3">Đội B (VĐV)</th>
                <th className="py-2.5 px-3">Trạng Thái</th>
                <th className="py-2.5 px-3">Đội Thắng</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {filteredMatches.map((m) => {
                const s1 = m.sets[0];
                return (
                  <tr key={m.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-2.5 px-3 font-mono font-bold text-white">{m.matchCode}</td>
                    <td className="py-2.5 px-3">
                      <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[11px] font-bold text-sai-cyan">
                        Sân {m.courtNumber}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-300">{m.category}</td>
                    <td className="py-2.5 px-3 text-slate-400">{m.roundType}</td>
                    <td className="py-2.5 px-3 font-bold text-white">
                      <div className="font-extrabold text-white text-xs">
                        {m.teamA.player1.name} & {m.teamA.player2.name}
                      </div>
                      <span className="inline-block rounded bg-sai-cyan/20 border border-sai-cyan/40 px-1.5 py-0.5 text-[10px] font-mono font-bold text-sai-cyan mt-0.5">
                        {m.teamA.teamCode}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-sm text-sai-yellow">
                      {s1 ? `${s1.teamAScore} - ${s1.teamBScore}` : '0 - 0'}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-white">
                      <div className="font-extrabold text-white text-xs">
                        {m.teamB.player1.name} & {m.teamB.player2.name}
                      </div>
                      <span className="inline-block rounded bg-sai-yellow/20 border border-sai-yellow/40 px-1.5 py-0.5 text-[10px] font-mono font-bold text-sai-yellow mt-0.5">
                        {m.teamB.teamCode}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          m.status === 'IN_PROGRESS'
                            ? 'bg-emerald-500/20 text-emerald-400 animate-pulse'
                            : m.status === 'COMPLETED'
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {m.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-emerald-400 font-bold">
                      {m.winnerTeam ? (
                        <div>
                          <span>{m.winnerTeam.player1.name} & {m.winnerTeam.player2.name}</span>
                          <span className="ml-1 text-[10px] font-mono text-slate-400">({m.winnerTeam.teamCode})</span>
                        </div>
                      ) : (
                        '-'
                      )}
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

