'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSocket } from '@/lib/socket-client';
import { Trophy, Medal, Award, Flame, ChevronRight, RefreshCw, GitBranch, Users } from 'lucide-react';
import { GroupStandingItem, MatchData, TeamData } from '@/types';
import { useLanguage } from '@/lib/i18n';

export default function StandingsPage() {
  const { subscribeToScore, subscribeToMatchStatus } = useSocket();
  const { t, locale } = useLanguage();
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
  const [allTeams, setAllTeams] = useState<TeamData[]>([]);
  const [playoffMatches, setPlayoffMatches] = useState<MatchData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStandings = useCallback(async () => {
    try {
      setLoading(true);
      const [standingsRes, matchesRes, teamsRes] = await Promise.all([
        fetch('/api/standings'),
        fetch('/api/matches?roundType=SEMI,BRONZE,FINAL'),
        fetch('/api/teams'),
      ]);

      if (standingsRes.ok) {
        const sData = await standingsRes.json();
        setStandings(sData);
      }

      if (matchesRes.ok) {
        const mData = await matchesRes.json();
        setPlayoffMatches(mData);
      }

      if (teamsRes.ok) {
        const tData = await teamsRes.json();
        setAllTeams(tData.teams || []);
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

  // Filter 8 pairs for the selected category, sorted by team code
  const currentCategoryPairs = allTeams
    .filter((t) => t.category === activeTab)
    .sort((a, b) => a.teamCode.localeCompare(b.teamCode));

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
        <span className="text-[11px] font-bold text-slate-400 bg-slate-800 px-2.5 py-1 rounded-md">
          {t('standings.group.top2')}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider font-bold text-[10px]">
              <th className="py-2.5 px-2 text-center">{t('standings.table.pos')}</th>
              <th className="py-2.5 px-3">{t('standings.table.team')}</th>
              <th className="py-2.5 px-2 text-center">{t('standings.table.played')}</th>
              <th className="py-2.5 px-2 text-center">{t('standings.table.won')}</th>
              <th className="py-2.5 px-2 text-center">{t('standings.table.lost')}</th>
              <th className="py-2.5 px-2 text-center">{t('standings.table.setDiff')}</th>
              <th className="py-2.5 px-2 text-center">{t('standings.table.ptDiff')}</th>
              <th className="py-2.5 px-3 text-center font-black text-sai-cyan">{t('standings.table.points')}</th>
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
                  <td className="py-3 px-2 text-center font-bold">
                    <span
                      className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-black ${
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
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2 mb-0.5">
                      {/* Prominent Player Names */}
                      <span className="font-black text-white text-sm">
                        {item.player1Name} & {item.player2Name}
                      </span>
                      {/* Secondary Team Code Badge */}
                      <span className="rounded bg-slate-800 border border-slate-700/80 px-1.5 py-0.5 text-[10px] font-mono font-bold text-sai-cyan">
                        {item.teamCode}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-2 text-center text-slate-300">{item.played}</td>
                  <td className="py-3 px-2 text-center text-emerald-400 font-bold">{item.won}</td>
                  <td className="py-3 px-2 text-center text-rose-400">{item.lost}</td>
                  <td className="py-3 px-2 text-center font-mono font-semibold">
                    {item.setDiff > 0 ? `+${item.setDiff}` : item.setDiff}
                  </td>
                  <td className="py-3 px-2 text-center font-mono text-slate-400">
                    {item.pointDiff > 0 ? `+${item.pointDiff}` : item.pointDiff}
                  </td>
                  <td className="py-3 px-3 text-center font-mono font-black text-base text-sai-cyan">
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
            <span>{t('standings.title')}</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {t('standings.subtitle')}
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
              🏸 {t('standings.tab.xd')}
            </button>
            <button
              onClick={() => setActiveTab('MD')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'MD'
                  ? 'bg-sai-yellow text-slate-950 shadow-lg shadow-yellow-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🏸 {t('standings.tab.md')}
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

      {/* SECTION 1: BẢNG GHÉP CẶP TOÀN BỘ 8 ĐỘI */}
      <div className="mb-10 rounded-3xl border border-slate-800 bg-slate-900/90 p-5 sm:p-6 shadow-2xl backdrop-blur-md">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-800">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-sai-cyan">
              {activeTab === 'XD' ? (locale === 'vi' ? 'II. Nội dung Đôi Nam Nữ (Mixed Doubles)' : 'II. Mixed Doubles (XD)') : (locale === 'vi' ? 'I. Nội dung Đôi Nam (Men\'s Doubles)' : 'I. Men\'s Doubles (MD)')}
            </span>
            <h2 className="text-lg font-black text-white mt-0.5">
              {t('standings.roster.title')}
            </h2>
          </div>
          <span className="text-xs text-slate-400 bg-slate-800/80 px-3 py-1 rounded-xl font-medium">
            {locale === 'vi' ? 'Tổng cộng: 8 cặp đấu (2 bảng A & B)' : 'Total: 8 pairs (Groups A & B)'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider font-bold text-[11px]">
                <th className="py-3 px-3">{t('standings.roster.code')}</th>
                <th className="py-3 px-4">
                  {activeTab === 'XD' ? t('standings.roster.male1') : t('standings.roster.male1_md')}
                </th>
                <th className="py-3 px-4">
                  {activeTab === 'XD' ? t('standings.roster.female') : t('standings.roster.male2_md')}
                </th>
                <th className="py-3 px-3 text-center">{t('standings.roster.totalPower')}</th>
                <th className="py-3 px-3 text-center">{locale === 'vi' ? 'Bảng đấu' : 'Group'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {currentCategoryPairs.map((pair) => (
                <tr key={pair.id} className="hover:bg-slate-800/40 transition">
                  {/* Mã cặp */}
                  <td className="py-3.5 px-3">
                    <span className="rounded-lg bg-sai-navy-800 border border-slate-700/80 px-2 py-1 font-mono font-black text-xs text-sai-cyan">
                      {pair.teamCode}
                    </span>
                  </td>

                  {/* VĐV Nam (Pool 1) - Tên lớn kèm điểm số (Score) */}
                  <td className="py-3.5 px-4">
                    <span className="font-extrabold text-sm text-white">{pair.player1.name}</span>{' '}
                    <span className="inline-block rounded bg-sai-cyan/15 text-sai-cyan border border-cyan-500/30 px-1.5 py-0.5 text-xs font-mono font-bold">
                      ({pair.player1.powerRating})
                    </span>
                  </td>

                  {/* VĐV 2 (Pool 3 hoặc Pool 2) - Tên lớn kèm điểm số (Score) */}
                  <td className="py-3.5 px-4">
                    <span className="font-extrabold text-sm text-white">{pair.player2.name}</span>{' '}
                    <span className="inline-block rounded bg-sai-yellow/15 text-sai-yellow border border-yellow-500/30 px-1.5 py-0.5 text-xs font-mono font-bold">
                      ({pair.player2.powerRating})
                    </span>
                  </td>

                  {/* Tổng điểm */}
                  <td className="py-3.5 px-3 text-center font-mono font-black text-base text-emerald-400">
                    {pair.totalPower}
                  </td>

                  {/* Bảng đấu */}
                  <td className="py-3.5 px-3 text-center">
                    <span
                      className={`inline-block rounded-lg px-2.5 py-1 font-bold text-xs uppercase ${
                        pair.groupName === 'A'
                          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                      }`}
                    >
                      Bảng {pair.groupName}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 2: BẢNG XẾP HẠNG VÒNG BẢNG (BẢNG A & BẢNG B) */}
      <div className="mb-4">
        <h2 className="text-lg font-black text-white mb-3">
          2. Bảng xếp hạng Vòng Bảng (Bảng A & Bảng B)
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
        {renderStandingsTable(`${activeTab} - Bảng A`, currentGroupA)}
        {renderStandingsTable(`${activeTab} - Bảng B`, currentGroupB)}
      </div>

      {/* SECTION 3: SƠ ĐỒ VÒNG LOẠI TRỰC TIẾP (KNOCKOUT TREE) */}
      <div className="rounded-3xl border border-slate-800 bg-gradient-to-b from-slate-900/90 to-sai-navy-950/90 p-6 sm:p-8 shadow-2xl backdrop-blur-md">
        <div className="flex items-center justify-between mb-8 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <GitBranch className="h-5 w-5 text-sai-cyan" />
              <h2 className="text-xl font-black text-white">
                3. Vòng Playoff Loại Trực Tiếp {activeTab} (Best of 3 Sets)
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Đội Nhất và Nhì của 2 bảng đấu chéo vào Bán kết (A1 vs B2, B1 vs A2), Tranh Hạng Ba và Chung Kết
            </p>
          </div>
          <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 text-xs font-bold text-emerald-400">
            BO3 Luật 21 điểm chuẩn
          </span>
        </div>

        {/* Visual Bracket Tree with prominent player names */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          {/* Column 1: Semifinals */}
          <div className="space-y-6">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 text-center">
              Vòng Bán Kết (Semi-Finals)
            </h3>

            {/* Semi 1: A1 vs B2 */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 shadow-lg hover:border-slate-700 transition">
              <div className="flex items-center justify-between text-[10px] text-slate-500 mb-2">
                <span className="font-mono font-bold text-sai-cyan">{semi1?.matchCode || 'SF1'}</span>
                <span>Court {semi1?.courtNumber || 1}</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                  <div>
                    <div className="font-black text-xs text-white">
                      {semi1?.teamA ? `${semi1.teamA.player1.name} & ${semi1.teamA.player2.name}` : `${activeTab} Nhất Bảng A`}
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">{semi1?.teamA.teamCode}</span>
                  </div>
                  <span className="font-mono font-black text-base text-sai-cyan">
                    {semi1?.sets[0]?.teamAScore ?? 0}
                  </span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                  <div>
                    <div className="font-black text-xs text-white">
                      {semi1?.teamB ? `${semi1.teamB.player1.name} & ${semi1.teamB.player2.name}` : `${activeTab} Nhì Bảng B`}
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">{semi1?.teamB.teamCode}</span>
                  </div>
                  <span className="font-mono font-black text-base text-sai-yellow">
                    {semi1?.sets[0]?.teamBScore ?? 0}
                  </span>
                </div>
              </div>
              <div className="mt-2 text-right">
                <span className="text-[10px] font-bold text-emerald-400">
                  {semi1?.winnerTeam ? `Thắng: ${semi1.winnerTeam.player1.name} & ${semi1.winnerTeam.player2.name}` : 'Đã lên lịch'}
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
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                  <div>
                    <div className="font-black text-xs text-white">
                      {semi2?.teamA ? `${semi2.teamA.player1.name} & ${semi2.teamA.player2.name}` : `${activeTab} Nhất Bảng B`}
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">{semi2?.teamA.teamCode}</span>
                  </div>
                  <span className="font-mono font-black text-base text-sai-cyan">
                    {semi2?.sets[0]?.teamAScore ?? 0}
                  </span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                  <div>
                    <div className="font-black text-xs text-white">
                      {semi2?.teamB ? `${semi2.teamB.player1.name} & ${semi2.teamB.player2.name}` : `${activeTab} Nhì Bảng A`}
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">{semi2?.teamB.teamCode}</span>
                  </div>
                  <span className="font-mono font-black text-base text-sai-yellow">
                    {semi2?.sets[0]?.teamBScore ?? 0}
                  </span>
                </div>
              </div>
              <div className="mt-2 text-right">
                <span className="text-[10px] font-bold text-emerald-400">
                  {semi2?.winnerTeam ? `Thắng: ${semi2.winnerTeam.player1.name} & ${semi2.winnerTeam.player2.name}` : 'Đã lên lịch'}
                </span>
              </div>
            </div>
          </div>

          {/* Column 2: Connectors & Bronze */}
          <div className="space-y-6">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 text-center">
              Tranh Hạng Ba (Bronze Medal)
            </h3>

            <div className="rounded-2xl border border-amber-900/40 bg-amber-950/10 p-4 shadow-lg hover:border-amber-700/50 transition">
              <div className="flex items-center justify-between text-[10px] text-amber-400 mb-2 font-bold">
                <span className="flex items-center gap-1">
                  <Medal className="h-3.5 w-3.5" />
                  HUY CHƯƠNG ĐỒNG
                </span>
                <span>Court {bronze?.courtNumber || 3}</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                  <div>
                    <div className="font-black text-xs text-white">
                      {bronze?.teamA ? `${bronze.teamA.player1.name} & ${bronze.teamA.player2.name}` : 'Thua BK 1'}
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">{bronze?.teamA.teamCode}</span>
                  </div>
                  <span className="font-mono font-black text-base text-sai-cyan">
                    {bronze?.sets[0]?.teamAScore ?? 0}
                  </span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                  <div>
                    <div className="font-black text-xs text-white">
                      {bronze?.teamB ? `${bronze.teamB.player1.name} & ${bronze.teamB.player2.name}` : 'Thua BK 2'}
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">{bronze?.teamB.teamCode}</span>
                  </div>
                  <span className="font-mono font-black text-base text-sai-yellow">
                    {bronze?.sets[0]?.teamBScore ?? 0}
                  </span>
                </div>
              </div>
              <div className="mt-2 text-right">
                <span className="text-[10px] font-bold text-amber-300">
                  {bronze?.winnerTeam ? `Hạng 3: ${bronze.winnerTeam.player1.name} & ${bronze.winnerTeam.player2.name}` : 'Đã lên lịch'}
                </span>
              </div>
            </div>
          </div>

          {/* Column 3: Grand Championship Final */}
          <div className="space-y-6">
            <h3 className="text-xs font-black uppercase tracking-wider text-sai-yellow text-center flex items-center justify-center gap-1.5">
              <Trophy className="h-4 w-4" />
              CHUNG KẾT VÔ ĐỊCH (FINAL)
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
                      {final?.teamA ? `${final.teamA.player1.name} & ${final.teamA.player2.name}` : 'Thắng BK 1'}
                    </span>
                    <span className="block text-[10px] text-slate-400 font-mono">
                      {final?.teamA.teamCode}
                    </span>
                  </div>
                  <span className="font-mono font-black text-2xl text-sai-cyan">
                    {final?.sets[0]?.teamAScore ?? 0}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-900/90 border border-slate-800">
                  <div>
                    <span className="font-black text-sm text-white">
                      {final?.teamB ? `${final.teamB.player1.name} & ${final.teamB.player2.name}` : 'Thắng BK 2'}
                    </span>
                    <span className="block text-[10px] text-slate-400 font-mono">
                      {final?.teamB.teamCode}
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
                    <span>VÔ ĐỊCH: {final.winnerTeam.player1.name} & {final.winnerTeam.player2.name} ({final.winnerTeam.teamCode})</span>
                  </div>
                ) : (
                  <span className="text-xs text-slate-500 font-bold">Chờ thi đấu chung kết</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
