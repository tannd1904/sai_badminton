'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSocket } from '../../lib/socket-client';
import { Trophy, Medal, Award, Flame, ChevronRight, RefreshCw, GitBranch, Users } from 'lucide-react';
import { GroupStandingItem, MatchData, TeamData } from '../../types';
import { useLanguage } from '../../lib/i18n';
import { PageLoader } from '../../components/PageLoader';

export default function StandingsPage() {
  const { isConnected, subscribeToScore, subscribeToMatchStatus, subscribeToSchedule, subscribeToReconnect } = useSocket();
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

  const fetchStandings = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const requests: Promise<Response>[] = [
        fetch('/api/standings'),
        fetch('/api/matches?roundType=SEMI,BRONZE,FINAL'),
      ];
      if (!silent) {
        requests.push(fetch('/api/teams'));
      }

      const [standingsRes, matchesRes, teamsRes] = await Promise.all(requests);

      if (standingsRes.ok) {
        const sData = await standingsRes.json();
        setStandings(sData);
      }

      if (matchesRes.ok) {
        const mData = await matchesRes.json();
        setPlayoffMatches(mData);
      }

      if (teamsRes?.ok) {
        const tData = await teamsRes.json();
        setAllTeams(tData.teams || []);
      }
    } catch (e) {
      console.error('Failed to load standings:', e);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStandings(false);
  }, [fetchStandings]);

  // Subscribe to live score/match status updates without flashing full-page spinner
  useEffect(() => {
    const unsubScore = subscribeToScore((payload: any) => {
      if (!payload) return;
      // Update live playoff match scores immediately in memory
      setPlayoffMatches((prev) =>
        prev.map((m) =>
          m.id === payload.matchId
            ? {
                ...m,
                status: payload.status ?? m.status,
                winnerTeamId: payload.winnerTeamId ?? m.winnerTeamId,
                winnerTeam: payload.winnerTeam ?? m.winnerTeam,
                sets: payload.sets ?? m.sets,
              }
            : m
        )
      );
      if (payload.overrideReason) {
        fetchStandings(true);
      }
    });
    const unsubStatus = subscribeToMatchStatus(() => {
      fetchStandings(true);
    });
    const unsubSchedule = subscribeToSchedule(() => {
      fetchStandings(true);
    });
    const unsubReconnect = subscribeToReconnect(() => {
      fetchStandings(true);
    });

    return () => {
      unsubScore();
      unsubStatus();
      unsubSchedule();
      unsubReconnect();
    };
  }, [subscribeToScore, subscribeToMatchStatus, subscribeToSchedule, subscribeToReconnect, fetchStandings]);

  // Safety-net polling only if WebSocket is disconnected
  useEffect(() => {
    if (isConnected) return;
    const fallbackTimer = setInterval(() => {
      fetchStandings(true);
    }, 5000);
    return () => clearInterval(fallbackTimer);
  }, [isConnected, fetchStandings]);

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

  // Check if group stage has completed all matches (4 teams * 3 matches / 2 = 6 matches each group -> 12 matches total)
  const isGroupACompleted = currentGroupA.length === 4 && currentGroupA.every((t) => t.played >= 3);
  const isGroupBCompleted = currentGroupB.length === 4 && currentGroupB.every((t) => t.played >= 3);
  const isGroupStageCompleted = isGroupACompleted && isGroupBCompleted;

  // Resolve team display for playoff slots
  // If match already has team in DB -> use it!
  // If not, but group stage is completed -> dynamically pick top 2 teams from standings!
  // Otherwise -> null (shows "Chưa xác định" with badge A1 vs B2, etc.)
  const getSemiTeam = (matchTeam?: any | null, defaultFromGroup?: GroupStandingItem | null) => {
    if (matchTeam && matchTeam.id) return matchTeam;
    if (isGroupStageCompleted && defaultFromGroup) {
      return {
        id: defaultFromGroup.teamId,
        teamCode: defaultFromGroup.teamCode,
        player1: { name: defaultFromGroup.player1Name },
        player2: { name: defaultFromGroup.player2Name },
      };
    }
    return null;
  };

  const sf1TeamA = getSemiTeam(semi1?.teamA, currentGroupA[0]);
  const sf1TeamB = getSemiTeam(semi1?.teamB, currentGroupB[1]);
  const sf2TeamA = getSemiTeam(semi2?.teamA, currentGroupB[0]);
  const sf2TeamB = getSemiTeam(semi2?.teamB, currentGroupA[1]);

  const bronzeTeamA = bronze?.teamA || null;
  const bronzeTeamB = bronze?.teamB || null;
  const finalTeamA = final?.teamA || null;
  const finalTeamB = final?.teamB || null;

  const renderPlayoffSlot = (
    team: any | null,
    placeholderNote: string,
    score: number = 0,
    scoreColor: string = 'text-sai-cyan'
  ) => {
    const isDetermined = !!team && (team.player1?.name || team.player1Name);
    const p1 = team?.player1?.name || team?.player1Name;
    const p2 = team?.player2?.name || team?.player2Name;
    const code = team?.teamCode;

    return (
      <div
        className={`flex items-center justify-between p-2.5 rounded-xl border transition ${
          isDetermined
            ? 'bg-slate-900 border-slate-800'
            : 'bg-slate-950/60 border-dashed border-slate-800/90'
        }`}
      >
        <div className="flex-1 min-w-0 pr-2">
          {isDetermined ? (
            <div>
              <div className="font-black text-xs text-white truncate">
                {p1} & {p2}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="rounded bg-sai-cyan/10 border border-sai-cyan/30 px-1 py-0.2 text-[9px] font-mono font-bold text-sai-cyan">
                  {code}
                </span>
                <span className="text-[9px] text-slate-400 font-medium truncate">
                  ({placeholderNote})
                </span>
              </div>
            </div>
          ) : (
            <div>
              <div className="font-extrabold text-xs text-slate-400 flex items-center gap-1.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-slate-600 animate-pulse" />
                <span>Chưa xác định</span>
              </div>
              <span className="inline-block text-[10px] text-sai-cyan font-bold font-mono mt-0.5">
                {placeholderNote}
              </span>
            </div>
          )}
        </div>
        <span className={`font-mono font-black text-base shrink-0 ${isDetermined ? scoreColor : 'text-slate-600'}`}>
          {isDetermined ? score : '-'}
        </span>
      </div>
    );
  };

  const renderFinalSlot = (
    team: any | null,
    placeholderNote: string,
    score: number = 0,
    scoreColor: string = 'text-sai-yellow'
  ) => {
    const isDetermined = !!team && (team.player1?.name || team.player1Name);
    const p1 = team?.player1?.name || team?.player1Name;
    const p2 = team?.player2?.name || team?.player2Name;
    const code = team?.teamCode;

    return (
      <div
        className={`flex items-center justify-between p-3 rounded-2xl border transition ${
          isDetermined
            ? 'bg-slate-900/90 border-slate-800'
            : 'bg-slate-950/70 border-dashed border-slate-800'
        }`}
      >
        <div className="flex-1 min-w-0 pr-2">
          {isDetermined ? (
            <div>
              <span className="font-black text-sm text-white block truncate">
                {p1} & {p2}
              </span>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="rounded bg-sai-yellow/20 border border-sai-yellow/40 px-1.5 py-0.5 text-[10px] font-mono font-bold text-sai-yellow">
                  {code}
                </span>
                <span className="text-[10px] text-slate-400 font-medium">({placeholderNote})</span>
              </div>
            </div>
          ) : (
            <div>
              <span className="font-extrabold text-sm text-slate-400 flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-slate-600 animate-pulse" />
                Chưa xác định
              </span>
              <span className="block text-[11px] text-sai-yellow font-bold font-mono mt-1">
                {placeholderNote}
              </span>
            </div>
          )}
        </div>
        <span className={`font-mono font-black text-2xl shrink-0 ${isDetermined ? scoreColor : 'text-slate-600'}`}>
          {isDetermined ? score : '-'}
        </span>
      </div>
    );
  };

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
              <th className="py-2 px-1.5 sm:px-2 text-center">{t('standings.table.pos')}</th>
              <th className="py-2 px-2 sm:px-3">{t('standings.table.team')}</th>
              <th className="py-2 px-1.5 sm:px-2 text-center">{t('standings.table.played')}</th>
              <th className="py-2 px-1.5 sm:px-2 text-center">{t('standings.table.won')}</th>
              <th className="py-2 px-1.5 sm:px-2 text-center">{t('standings.table.lost')}</th>
              <th className="py-2 px-1.5 sm:px-2 text-center">{t('standings.table.setDiff')}</th>
              <th className="py-2 px-1.5 sm:px-2 text-center">{t('standings.table.ptDiff')}</th>
              <th className="py-2 px-2 sm:px-3 text-center font-black text-sai-cyan">{t('standings.table.points')}</th>
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
                  <td className="py-2.5 sm:py-3 px-1.5 sm:px-2 text-center font-bold">
                    <span
                      className={`inline-flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full text-[11px] sm:text-xs font-black ${
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
                  <td className="py-2.5 sm:py-3 px-2 sm:px-3">
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-0.5">
                      {/* Prominent Player Names */}
                      <span className="font-black text-white text-xs sm:text-sm leading-snug">
                        {item.player1Name} & {item.player2Name}
                      </span>
                      {/* Secondary Team Code Badge */}
                      <span className="rounded bg-slate-800 border border-slate-700/80 px-1.5 py-0.5 text-[9px] sm:text-[10px] font-mono font-bold text-sai-cyan">
                        {item.teamCode}
                      </span>
                    </div>
                  </td>
                  <td className="py-2.5 sm:py-3 px-1.5 sm:px-2 text-center text-slate-300">{item.played}</td>
                  <td className="py-2.5 sm:py-3 px-1.5 sm:px-2 text-center text-emerald-400 font-bold">{item.won}</td>
                  <td className="py-2.5 sm:py-3 px-1.5 sm:px-2 text-center text-rose-400">{item.lost}</td>
                  <td className="py-2.5 sm:py-3 px-1.5 sm:px-2 text-center font-mono font-semibold">
                    {item.setDiff > 0 ? `+${item.setDiff}` : item.setDiff}
                  </td>
                  <td className="py-2.5 sm:py-3 px-1.5 sm:px-2 text-center font-mono text-slate-400">
                    {item.pointDiff > 0 ? `+${item.pointDiff}` : item.pointDiff}
                  </td>
                  <td className="py-2.5 sm:py-3 px-2 sm:px-3 text-center font-mono font-black text-sm sm:text-base text-sai-cyan">
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

  if (loading) {
    return (
      <PageLoader
        title={locale === 'vi' ? 'Đang tải Bảng Xếp Hạng & Nhánh Đấu...' : 'Loading Standings & Playoff Brackets...'}
        subtitle={
          locale === 'vi'
            ? 'Đang tổng hợp điểm số vòng bảng, hiệu số và sơ đồ Playoff...'
            : 'Calculating group standings, point diffs, and playoff brackets...'
        }
      />
    );
  }

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

                  {/* VĐV Nam (Pool 1) - Tên VĐV */}
                  <td className="py-3.5 px-4">
                    <span className="font-extrabold text-sm text-white">{pair.player1.name}</span>
                  </td>

                  {/* VĐV 2 (Pool 3 hoặc Pool 2) - Tên VĐV */}
                  <td className="py-3.5 px-4">
                    <span className="font-extrabold text-sm text-white">{pair.player2.name}</span>
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
      <div className="rounded-2xl sm:rounded-3xl border border-slate-800 bg-gradient-to-b from-slate-900/90 to-sai-navy-950/90 p-4 sm:p-8 shadow-2xl backdrop-blur-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-6 sm:mb-8 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <GitBranch className="h-5 w-5 text-sai-cyan shrink-0" />
              <h2 className="text-lg sm:text-xl font-black text-white">
                3. Vòng Playoff Loại Trực Tiếp {activeTab} (Best of 3 Sets)
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Đội Nhất và Nhì của 2 bảng đấu chéo vào Bán kết (A1 vs B2, B1 vs A2), Tranh Hạng Ba và Chung Kết
            </p>
          </div>
          <span className="self-start sm:self-auto shrink-0 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 text-xs font-bold text-emerald-400">
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
                <span className="font-mono font-bold text-sai-cyan">{semi1?.matchCode || `M-${activeTab}-SF1`}</span>
                <span>Court {semi1?.courtNumber || 1}</span>
              </div>
              <div className="space-y-2">
                {renderPlayoffSlot(sf1TeamA, `${activeTab} Nhất Bảng A (A1)`, semi1?.sets[0]?.teamAScore ?? 0, 'text-sai-cyan')}
                {renderPlayoffSlot(sf1TeamB, `${activeTab} Nhì Bảng B (B2)`, semi1?.sets[0]?.teamBScore ?? 0, 'text-sai-yellow')}
              </div>
              <div className="mt-2 text-right">
                <span className="text-[10px] font-bold text-emerald-400">
                  {semi1?.winnerTeam
                    ? `Thắng: ${semi1.winnerTeam.player1.name} & ${semi1.winnerTeam.player2.name}`
                    : sf1TeamA && sf1TeamB
                    ? 'Đã xác định cặp đấu'
                    : 'Chờ kết quả Vòng Bảng'}
                </span>
              </div>
            </div>

            {/* Semi 2: B1 vs A2 */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 shadow-lg hover:border-slate-700 transition">
              <div className="flex items-center justify-between text-[10px] text-slate-500 mb-2">
                <span className="font-mono font-bold text-sai-cyan">{semi2?.matchCode || `M-${activeTab}-SF2`}</span>
                <span>Court {semi2?.courtNumber || 2}</span>
              </div>
              <div className="space-y-2">
                {renderPlayoffSlot(sf2TeamA, `${activeTab} Nhất Bảng B (B1)`, semi2?.sets[0]?.teamAScore ?? 0, 'text-sai-cyan')}
                {renderPlayoffSlot(sf2TeamB, `${activeTab} Nhì Bảng A (A2)`, semi2?.sets[0]?.teamBScore ?? 0, 'text-sai-yellow')}
              </div>
              <div className="mt-2 text-right">
                <span className="text-[10px] font-bold text-emerald-400">
                  {semi2?.winnerTeam
                    ? `Thắng: ${semi2.winnerTeam.player1.name} & ${semi2.winnerTeam.player2.name}`
                    : sf2TeamA && sf2TeamB
                    ? 'Đã xác định cặp đấu'
                    : 'Chờ kết quả Vòng Bảng'}
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
                {renderPlayoffSlot(bronzeTeamA, 'Thua Bán Kết 1 (Loser SF1)', bronze?.sets[0]?.teamAScore ?? 0, 'text-sai-cyan')}
                {renderPlayoffSlot(bronzeTeamB, 'Thua Bán Kết 2 (Loser SF2)', bronze?.sets[0]?.teamBScore ?? 0, 'text-sai-yellow')}
              </div>
              <div className="mt-2 text-right">
                <span className="text-[10px] font-bold text-amber-300">
                  {bronze?.winnerTeam
                    ? `Hạng 3: ${bronze.winnerTeam.player1.name} & ${bronze.winnerTeam.player2.name}`
                    : bronzeTeamA && bronzeTeamB
                    ? 'Đã xác định cặp đấu'
                    : 'Chờ kết quả Bán Kết'}
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
                  {final?.matchCode || `M-${activeTab}-FIN`}
                </span>
                <span>Court {final?.courtNumber || 1}</span>
              </div>

              <div className="space-y-3">
                {renderFinalSlot(finalTeamA, 'Thắng Bán Kết 1 (Winner SF1)', final?.sets[0]?.teamAScore ?? 0, 'text-sai-cyan')}
                {renderFinalSlot(finalTeamB, 'Thắng Bán Kết 2 (Winner SF2)', final?.sets[0]?.teamBScore ?? 0, 'text-sai-yellow')}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800 text-center">
                {final?.winnerTeam ? (
                  <div className="text-sm font-black text-sai-yellow flex items-center justify-center gap-1.5 animate-bounce">
                    <Trophy className="h-4 w-4" />
                    <span>VÔ ĐỊCH: {final.winnerTeam.player1.name} & {final.winnerTeam.player2.name} ({final.winnerTeam.teamCode})</span>
                  </div>
                ) : (
                  <span className="text-xs text-slate-500 font-bold">
                    {finalTeamA && finalTeamB ? 'Chờ thi đấu Chung Kết' : 'Chờ xác định hai đội vào Chung Kết'}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
