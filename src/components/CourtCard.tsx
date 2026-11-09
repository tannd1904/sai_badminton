'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MatchData } from '@/types';
import { Clock, Shield, Users, Trophy } from 'lucide-react';

interface CourtCardProps {
  courtNumber: number;
  activeMatch?: MatchData | null;
  nextMatch?: MatchData | null;
}

export function CourtCard({ courtNumber, activeMatch, nextMatch }: CourtCardProps) {
  const [prevScoreA, setPrevScoreA] = useState(0);
  const [prevScoreB, setPrevScoreB] = useState(0);
  const [scoreBumpingA, setScoreBumpingA] = useState(false);
  const [scoreBumpingB, setScoreBumpingB] = useState(false);

  const currentSetNum = activeMatch?.currentSet || 1;
  const currentSet = activeMatch?.sets?.find((s) => s.setNumber === currentSetNum) || {
    teamAScore: 0,
    teamBScore: 0,
  };

  const isSwitched = activeMatch?.courtSideSwitched ?? false;
  const teamLeft = isSwitched ? activeMatch?.teamB : activeMatch?.teamA;
  const teamRight = isSwitched ? activeMatch?.teamA : activeMatch?.teamB;
  const scoreLeft = isSwitched ? currentSet.teamBScore : currentSet.teamAScore;
  const scoreRight = isSwitched ? currentSet.teamAScore : currentSet.teamBScore;
  const winnerId = activeMatch?.winnerTeamId;

  // Trigger micro-animation on score bump
  useEffect(() => {
    if (currentSet.teamAScore !== prevScoreA) {
      setScoreBumpingA(true);
      const t = setTimeout(() => setScoreBumpingA(false), 300);
      setPrevScoreA(currentSet.teamAScore);
      return () => clearTimeout(t);
    }
  }, [currentSet.teamAScore, prevScoreA]);

  useEffect(() => {
    if (currentSet.teamBScore !== prevScoreB) {
      setScoreBumpingB(true);
      const t = setTimeout(() => setScoreBumpingB(false), 300);
      setPrevScoreB(currentSet.teamBScore);
      return () => clearTimeout(t);
    }
  }, [currentSet.teamBScore, prevScoreB]);

  const formatTimer = (secs: number | null | undefined) => {
    if (secs === null || secs === undefined) return '10:00';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col rounded-3xl border border-slate-800 bg-gradient-to-b from-slate-900/90 to-sai-navy-950/90 p-5 shadow-2xl backdrop-blur-md relative overflow-hidden transition-all hover:border-slate-700">
      {/* Court Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-sai-cyan text-slate-950 font-black text-xs shadow-md shadow-cyan-500/20">
            C{courtNumber}
          </span>
          <div>
            <h3 className="font-extrabold text-white text-sm">Court {courtNumber}</h3>
            <p className="text-[10px] text-slate-400 font-medium">SAI Digital Arena</p>
          </div>
        </div>

        {activeMatch ? (
          <div className="flex items-center gap-2">
            <span className="rounded bg-sai-navy-800 border border-slate-700 px-2 py-0.5 text-[10px] font-bold text-sai-cyan">
              {activeMatch.category} · {activeMatch.roundType}
            </span>
            <span
              className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${
                activeMatch.status === 'IN_PROGRESS'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : activeMatch.status === 'COMPLETED'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {activeMatch.status === 'IN_PROGRESS' && (
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
              )}
              {activeMatch.status}
            </span>
          </div>
        ) : (
          <span className="text-xs text-slate-500">Idle</span>
        )}
      </div>

      {activeMatch ? (
        <div className="flex-1 flex flex-col justify-between py-4">
          {/* Match Code & 10-Min Timer Pill */}
          <div className="flex items-center justify-between text-xs mb-3 text-slate-400">
            <span className="font-mono font-bold text-white text-xs">{activeMatch.matchCode}</span>
            {activeMatch.rulesMode === 'SINGLE_SET_10MIN' && (
              <div className="flex items-center gap-1.5 font-mono text-xs font-bold bg-slate-950/80 px-2.5 py-1 rounded-lg border border-slate-800 text-sai-yellow">
                <Clock className="h-3 w-3 text-sai-yellow" />
                <span>{formatTimer(activeMatch.timerRemainingSeconds)}</span>
              </div>
            )}
          </div>

          {/* Teams & Realtime Scoreboard Display */}
          <div className="grid grid-cols-7 items-center gap-2 my-2">
            {/* Team Left */}
            <div className="col-span-3 text-center">
              <div
                className={`p-3 rounded-2xl border transition-all ${
                  winnerId === teamLeft?.id
                    ? 'border-emerald-500/50 bg-emerald-950/20 shadow-lg shadow-emerald-500/10'
                    : 'border-slate-800 bg-slate-950/40'
                }`}
              >
                <div className="flex items-center justify-center gap-1 mb-1">
                  <h4 className="text-base sm:text-lg font-black text-white">{teamLeft?.teamCode}</h4>
                  {winnerId === teamLeft?.id && (
                    <Trophy className="h-3.5 w-3.5 text-sai-yellow" />
                  )}
                </div>
                <div className="text-[11px] text-slate-400 truncate font-medium">
                  {teamLeft?.player1.name}
                </div>
                <div className="text-[11px] text-slate-400 truncate font-medium">
                  {teamLeft?.player2.name}
                </div>
                <div className="mt-2 text-[10px] font-bold text-slate-500">
                  Power: {teamLeft?.totalPower}
                </div>
              </div>
            </div>

            {/* Score Center Display */}
            <div className="col-span-1 flex flex-col items-center justify-center">
              <div className="flex items-center justify-center gap-1">
                <span
                  className={`text-2xl sm:text-3xl font-black font-mono transition-transform duration-200 ${
                    (isSwitched ? scoreBumpingB : scoreBumpingA) ? 'scale-125 text-sai-cyan' : 'text-white'
                  }`}
                >
                  {scoreLeft}
                </span>
                <span className="text-slate-600 font-bold">:</span>
                <span
                  className={`text-2xl sm:text-3xl font-black font-mono transition-transform duration-200 ${
                    (isSwitched ? scoreBumpingA : scoreBumpingB) ? 'scale-125 text-sai-yellow' : 'text-white'
                  }`}
                >
                  {scoreRight}
                </span>
              </div>
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">
                {activeMatch.rulesMode === 'BO3' ? `Set ${currentSetNum}` : 'Single Set'}
              </span>
            </div>

            {/* Team Right */}
            <div className="col-span-3 text-center">
              <div
                className={`p-3 rounded-2xl border transition-all ${
                  winnerId === teamRight?.id
                    ? 'border-emerald-500/50 bg-emerald-950/20 shadow-lg shadow-emerald-500/10'
                    : 'border-slate-800 bg-slate-950/40'
                }`}
              >
                <div className="flex items-center justify-center gap-1 mb-1">
                  <h4 className="text-base sm:text-lg font-black text-white">{teamRight?.teamCode}</h4>
                  {winnerId === teamRight?.id && (
                    <Trophy className="h-3.5 w-3.5 text-sai-yellow" />
                  )}
                </div>
                <div className="text-[11px] text-slate-400 truncate font-medium">
                  {teamRight?.player1.name}
                </div>
                <div className="text-[11px] text-slate-400 truncate font-medium">
                  {teamRight?.player2.name}
                </div>
                <div className="mt-2 text-[10px] font-bold text-slate-500">
                  Power: {teamRight?.totalPower}
                </div>
              </div>
            </div>
          </div>

          {/* Sets Breakdown (BO3 mode) */}
          {activeMatch.rulesMode === 'BO3' && activeMatch.sets.length > 0 && (
            <div className="mt-3 flex items-center justify-center gap-2 border-t border-slate-800/80 pt-2 text-[11px] font-mono">
              <span className="text-slate-500 text-[10px] uppercase font-bold">Sets:</span>
              {activeMatch.sets.map((s) => (
                <span
                  key={s.id}
                  className={`rounded px-1.5 py-0.5 border ${
                    s.isFinished
                      ? 'bg-slate-800 text-slate-300 border-slate-700'
                      : s.setNumber === currentSetNum
                      ? 'bg-sai-cyan/20 text-sai-cyan border-sai-cyan/40 font-bold'
                      : 'text-slate-600 border-transparent'
                  }`}
                >
                  S{s.setNumber}: {s.teamAScore}-{s.teamBScore}
                </span>
              ))}
            </div>
          )}

          {/* Referee indicator */}
          <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-800/60 pt-2">
            <span>Umpire: {activeMatch.referee?.name || `Assigned Ref C${courtNumber}`}</span>
            {activeMatch.winnerTeam && (
              <span className="text-emerald-400 font-bold">
                Winner: {activeMatch.winnerTeam.teamCode}
              </span>
            )}
          </div>
        </div>
      ) : (
        <div className="py-12 text-center text-slate-500 text-xs">
          No active match currently on Court {courtNumber}.
        </div>
      )}

      {/* On Deck / Upcoming Match Teaser */}
      {nextMatch && (
        <div className="mt-auto border-t border-slate-800 bg-slate-950/60 -mx-5 -mb-5 p-3 rounded-b-3xl">
          <div className="flex items-center justify-between text-[10px] text-slate-400">
            <span className="uppercase font-bold tracking-wider text-slate-500">On Deck Next</span>
            <span className="font-mono text-sai-cyan">{nextMatch.matchCode} ({nextMatch.category})</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-xs font-semibold text-slate-200">
            <span>{nextMatch.teamA.teamCode} vs {nextMatch.teamB.teamCode}</span>
            <span className="text-[10px] text-slate-500">
              {nextMatch.startTime ? new Date(nextMatch.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'TBD'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
