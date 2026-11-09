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

export default function HomePage() {
  const { isConnected, subscribeToScore, subscribeToMatchStatus } = useSocket();
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

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      {/* Hero Header */}
      <div className="relative mb-8 overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-r from-sai-navy-950 via-slate-900 to-sai-navy-900 p-6 sm:p-8 shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="flex h-2 w-2 rounded-full bg-sai-cyan animate-ping" />
              <span className="text-xs font-extrabold uppercase tracking-widest text-sai-cyan">
                Live Broadcast Center
              </span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
              SAI Badminton Championship 2024
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-400 max-w-xl">
              24 Players across 3 Pools competing in Mixed Doubles (XD) & Men&apos;s Doubles (MD) across Courts 1, 2 & 3.
            </p>
          </div>

          {/* Quick Tournament Metrics */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <div className="flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-950/70 px-3.5 py-2">
              <Flame className="h-4 w-4 text-emerald-400 animate-pulse" />
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-500">Live Playing</div>
                <div className="text-sm font-black text-white">{inProgressCount} Matches</div>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-950/70 px-3.5 py-2">
              <CheckCircle2 className="h-4 w-4 text-amber-400" />
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-500">Completed</div>
                <div className="text-sm font-black text-white">{completedCount} Matches</div>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-950/70 px-3.5 py-2">
              <Clock className="h-4 w-4 text-sai-cyan" />
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-500">Upcoming</div>
                <div className="text-sm font-black text-white">{scheduledCount} Matches</div>
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
            Category:
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
                {cat === 'ALL' ? 'All Categories' : cat === 'XD' ? 'Mixed Doubles (XD)' : "Men's Doubles (MD)"}
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
            <span>View Standings & Brackets</span>
          </Link>
          <button
            onClick={() => fetchMatches()}
            className="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-900 p-2 text-slate-400 hover:text-white transition"
            title="Refresh Scores"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Real-time 3-Court View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
        {[1, 2, 3].map((courtNum) => {
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
            <span>All Matches Fixture & Live Progress</span>
          </h2>
          <span className="text-xs text-slate-500 font-mono">{filteredMatches.length} matches registered</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider font-bold">
                <th className="py-2.5 px-3">Code</th>
                <th className="py-2.5 px-3">Court</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3">Stage</th>
                <th className="py-2.5 px-3">Team A</th>
                <th className="py-2.5 px-3 text-center">Score</th>
                <th className="py-2.5 px-3">Team B</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Winner</th>
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
                        Court {m.courtNumber}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-300">{m.category}</td>
                    <td className="py-2.5 px-3 text-slate-400">{m.roundType}</td>
                    <td className="py-2.5 px-3 font-bold text-white">
                      {m.teamA.teamCode}
                      <span className="block text-[10px] text-slate-400 font-normal truncate max-w-[120px]">
                        {m.teamA.player1.name} / {m.teamA.player2.name}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-sm text-sai-yellow">
                      {s1 ? `${s1.teamAScore} - ${s1.teamBScore}` : '0 - 0'}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-white">
                      {m.teamB.teamCode}
                      <span className="block text-[10px] text-slate-400 font-normal truncate max-w-[120px]">
                        {m.teamB.player1.name} / {m.teamB.player2.name}
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
                      {m.winnerTeam?.teamCode || '-'}
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
