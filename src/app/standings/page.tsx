'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSocket } from '@/lib/socket-client';
import { Trophy, Medal, Award, Flame, ChevronRight, RefreshCw, GitBranch } from 'lucide-react';
import { GroupStandingItem, MatchData } from '@/types';

export default function StandingsPage() {
  const { subscribeToScore, subscribeToMatchStatus } = useSocket();
  const [activeTab, setActiveTab] = useState<'XD' | 'MD'>('XD');
  const [standings, setStandings] = useState<{
    xdGroupA: GroupStandingItem[];
    xdGroupB: GroupStandingItem[];
    mdGroupA: GroupStandingItem[];
    mdGroupB: GroupStandingItem[];
  }>({
    xdGroupA: [],
    xdGroupB: [],
    mdGroupA: [],
    mdGroupB: [],
  });
  const [playoffMatches, setPlayoffMatches] = useState<MatchData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStandings = useCallback(async () => {
    try {
      setLoading(true);
      const [standingsRes, matchesRes] = await Promise.all([
        fetch('/api/standings'),
        fetch('/api/matches?roundType=SEMI,BRONZE,FINAL'),
      ]);

      if (standingsRes.ok) {
        const sData = await standingsRes.json();
        setStandings(sData);
      }

      if (matchesRes.ok) {
        const mData = await matchesRes.json();
        setPlayoffMatches(mData);
      }
    } catch (e) {
      console.error('Failed to load standings:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStandings();
  }, [fetchStandings]);

  // Subscribe to live score/match status updates
  useEffect(() => {
    const unsubScore = subscribeToScore(() => {
      fetchStandings();
    });
    const unsubStatus = subscribeToMatchStatus(() => {
      fetchStandings();
    });

    return () => {
      unsubScore();
      unsubStatus();
    };
  }, [subscribeToScore, subscribeToMatchStatus, fetchStandings]);

  const currentGroupA = activeTab === 'XD' ? standings.xdGroupA : standings.mdGroupA;
  const currentGroupB = activeTab === 'XD' ? standings.xdGroupB : standings.mdGroupB;

  // Filter playoff matches for the active category
  const activePlayoffs = playoffMatches.filter((m) => m.category === activeTab);
  const semi1 = activePlayoffs.find((m) => m.matchCode.includes('SF1'));
  const semi2 = activePlayoffs.find((m) => m.matchCode.includes('SF2'));
  const bronze = activePlayoffs.find((m) => m.matchCode.includes('BRZ'));
  const final = activePlayoffs.find((m) => m.matchCode.includes('FIN'));

  const renderStandingsTable = (title: string, groupItems: GroupStandingItem[]) => (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl backdrop-blur-md">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-extrabold text-white flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-sai-cyan text-slate-950 font-black text-xs">
            {title.slice(-1)}
          </span>
          <span>{title}</span>
        </h3>
        <span className="text-[11px] font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md">
          Top 2 Advance to Semis
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider font-bold text-[10px]">
              <th className="py-2.5 px-2 text-center">Pos</th>
              <th className="py-2.5 px-3">Team & Roster</th>
              <th className="py-2.5 px-2 text-center">P</th>
              <th className="py-2.5 px-2 text-center">W</th>
              <th className="py-2.5 px-2 text-center">L</th>
              <th className="py-2.5 px-2 text-center">Set Diff</th>
              <th className="py-2.5 px-2 text-center">Pt Diff</th>
              <th className="py-2.5 px-3 text-center font-black text-sai-cyan">PTS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-medium">
            {groupItems.map((item, idx) => {
              const isAdvancing = idx < 2;
              return (
                <tr
                  key={item.teamId}
                  className={`transition-colors ${
                    isAdvancing
                      ? 'bg-sai-cyan/5 hover:bg-sai-cyan/10'
                      : 'hover:bg-slate-800/40'
                  }`}
                >
                  <td className="py-2.5 px-2 text-center font-bold">
                    <span
                      className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-black ${
                        idx === 0
                          ? 'bg-sai-yellow text-slate-950 shadow-sm shadow-yellow-500/30'
                          : idx === 1
                          ? 'bg-slate-300 text-slate-950'
                          : 'text-slate-500 bg-slate-800'
                      }`}
                    >
                      {item.rank || idx + 1}
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="font-extrabold text-white text-xs">{item.teamCode}</div>
                    <div className="text-[10px] text-slate-400 truncate">
                      {item.player1Name} · {item.player2Name}
                    </div>
                  </td>
                  <td className="py-2.5 px-2 text-center text-slate-300">{item.played}</td>
                  <td className="py-2.5 px-2 text-center text-emerald-400 font-bold">{item.won}</td>
                  <td className="py-2.5 px-2 text-center text-rose-400">{item.lost}</td>
                  <td className="py-2.5 px-2 text-center font-mono">
                    {item.setDiff > 0 ? `+${item.setDiff}` : item.setDiff}
                  </td>
                  <td className="py-2.5 px-2 text-center font-mono text-slate-400">
                    {item.pointDiff > 0 ? `+${item.pointDiff}` : item.pointDiff}
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono font-black text-sm text-sai-cyan">
                    {item.points}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      {/* Category Navigation Pills */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2.5">
            <Trophy className="h-7 w-7 text-sai-yellow" />
            <span>Tournament Standings & Playoffs</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time automated group standings with official tie-breaking rules and interactive knockout tree
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-900 p-1.5 rounded-2xl border border-slate-800">
            <button
              onClick={() => setActiveTab('XD')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'XD'
                  ? 'bg-sai-cyan text-slate-950 shadow-lg shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🏸 Mixed Doubles (XD)
            </button>
            <button
              onClick={() => setActiveTab('MD')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'MD'
                  ? 'bg-sai-yellow text-slate-950 shadow-lg shadow-yellow-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🏸 Men&apos;s Doubles (MD)
            </button>
          </div>

          <button
            onClick={() => fetchStandings()}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 text-slate-400 hover:text-white transition"
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Group Stage Tables (Group A and Group B) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
        {renderStandingsTable(`${activeTab} - Group A`, currentGroupA)}
        {renderStandingsTable(`${activeTab} - Group B`, currentGroupB)}
      </div>

      {/* Interactive Knockout Bracket Section */}
      <div className="rounded-3xl border border-slate-800 bg-gradient-to-b from-slate-900/90 to-sai-navy-950/90 p-6 sm:p-8 shadow-2xl backdrop-blur-md">
        <div className="flex items-center justify-between mb-8 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <GitBranch className="h-5 w-5 text-sai-cyan" />
              <h2 className="text-xl font-black text-white">
                {activeTab} Knockout Stage (Best of 3 Sets)
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Top 2 teams from Group A & B cross-pair into Semifinals, Bronze Medal, and Championship Final
            </p>
          </div>
          <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 text-xs font-bold text-emerald-400">
            BO3 Standard Rules
          </span>
        </div>

        {/* Visual Bracket Tree */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          {/* Column 1: Semifinals */}
          <div className="space-y-6">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 text-center">
              Semifinals (BO3)
            </h3>

            {/* Semi 1: A1 vs B2 */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 shadow-lg hover:border-slate-700 transition">
              <div className="flex items-center justify-between text-[10px] text-slate-500 mb-2">
                <span className="font-mono font-bold text-sai-cyan">{semi1?.matchCode || 'SF1'}</span>
                <span>Court {semi1?.courtNumber || 1}</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="font-bold text-xs text-white">
                    {semi1?.teamA.teamCode || `${activeTab} A1`}
                  </span>
                  <span className="font-mono font-black text-sai-cyan">
                    {semi1?.sets[0]?.teamAScore ?? 0}
                  </span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="font-bold text-xs text-white">
                    {semi1?.teamB.teamCode || `${activeTab} B2`}
                  </span>
                  <span className="font-mono font-black text-sai-yellow">
                    {semi1?.sets[0]?.teamBScore ?? 0}
                  </span>
                </div>
              </div>
              <div className="mt-2 text-right">
                <span className="text-[10px] font-bold text-emerald-400">
                  {semi1?.winnerTeam ? `Winner: ${semi1.winnerTeam.teamCode}` : 'Scheduled'}
                </span>
              </div>
            </div>

            {/* Semi 2: B1 vs A2 */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 shadow-lg hover:border-slate-700 transition">
              <div className="flex items-center justify-between text-[10px] text-slate-500 mb-2">
                <span className="font-mono font-bold text-sai-cyan">{semi2?.matchCode || 'SF2'}</span>
                <span>Court {semi2?.courtNumber || 2}</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="font-bold text-xs text-white">
                    {semi2?.teamA.teamCode || `${activeTab} B1`}
                  </span>
                  <span className="font-mono font-black text-sai-cyan">
                    {semi2?.sets[0]?.teamAScore ?? 0}
                  </span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="font-bold text-xs text-white">
                    {semi2?.teamB.teamCode || `${activeTab} A2`}
                  </span>
                  <span className="font-mono font-black text-sai-yellow">
                    {semi2?.sets[0]?.teamBScore ?? 0}
                  </span>
                </div>
              </div>
              <div className="mt-2 text-right">
                <span className="text-[10px] font-bold text-emerald-400">
                  {semi2?.winnerTeam ? `Winner: ${semi2.winnerTeam.teamCode}` : 'Scheduled'}
                </span>
              </div>
            </div>
          </div>

          {/* Column 2: Connectors & Bronze */}
          <div className="space-y-6">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 text-center">
              Bronze Match (3rd Place)
            </h3>

            <div className="rounded-2xl border border-amber-900/40 bg-amber-950/10 p-4 shadow-lg hover:border-amber-700/50 transition">
              <div className="flex items-center justify-between text-[10px] text-amber-400 mb-2 font-bold">
                <span className="flex items-center gap-1">
                  <Medal className="h-3.5 w-3.5" />
                  BRONZE MEDAL
                </span>
                <span>Court {bronze?.courtNumber || 3}</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="font-bold text-xs text-white">
                    {bronze?.teamA.teamCode || 'Loser SF1'}
                  </span>
                  <span className="font-mono font-black text-sai-cyan">
                    {bronze?.sets[0]?.teamAScore ?? 0}
                  </span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="font-bold text-xs text-white">
                    {bronze?.teamB.teamCode || 'Loser SF2'}
                  </span>
                  <span className="font-mono font-black text-sai-yellow">
                    {bronze?.sets[0]?.teamBScore ?? 0}
                  </span>
                </div>
              </div>
              <div className="mt-2 text-right">
                <span className="text-[10px] font-bold text-amber-300">
                  {bronze?.winnerTeam ? `Bronze Winner: ${bronze.winnerTeam.teamCode}` : 'Scheduled'}
                </span>
              </div>
            </div>
          </div>

          {/* Column 3: Grand Championship Final */}
          <div className="space-y-6">
            <h3 className="text-xs font-black uppercase tracking-wider text-sai-yellow text-center flex items-center justify-center gap-1.5">
              <Trophy className="h-4 w-4" />
              CHAMPIONSHIP FINAL
            </h3>

            <div className="rounded-3xl border-2 border-sai-yellow/50 bg-gradient-to-b from-yellow-950/20 via-slate-900 to-sai-navy-950 p-6 shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 transform translate-x-4 -translate-y-4 w-24 h-24 bg-sai-yellow/10 rounded-full blur-xl pointer-events-none" />

              <div className="flex items-center justify-between text-[11px] text-sai-yellow mb-3 font-bold">
                <span className="flex items-center gap-1.5 font-mono">
                  <Trophy className="h-4 w-4" />
                  {final?.matchCode || 'FINAL'}
                </span>
                <span>Court {final?.courtNumber || 1}</span>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-900/90 border border-slate-800">
                  <div>
                    <span className="font-black text-sm text-white">
                      {final?.teamA.teamCode || 'Winner SF1'}
                    </span>
                    <span className="block text-[10px] text-slate-400">
                      {final?.teamA.player1.name} & {final?.teamA.player2.name}
                    </span>
                  </div>
                  <span className="font-mono font-black text-2xl text-sai-cyan">
                    {final?.sets[0]?.teamAScore ?? 0}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-900/90 border border-slate-800">
                  <div>
                    <span className="font-black text-sm text-white">
                      {final?.teamB.teamCode || 'Winner SF2'}
                    </span>
                    <span className="block text-[10px] text-slate-400">
                      {final?.teamB.player1.name} & {final?.teamB.player2.name}
                    </span>
                  </div>
                  <span className="font-mono font-black text-2xl text-sai-yellow">
                    {final?.sets[0]?.teamBScore ?? 0}
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800 text-center">
                {final?.winnerTeam ? (
                  <div className="text-sm font-black text-sai-yellow flex items-center justify-center gap-1.5 animate-bounce">
                    <Trophy className="h-4 w-4" />
                    <span>CHAMPION: {final.winnerTeam.teamCode}</span>
                  </div>
                ) : (
                  <span className="text-xs text-slate-500 font-bold">Scheduled for Grand Finals</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
