import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { Category, GroupName, MatchStatus, RoundType } from '@prisma/client';
import { GroupStandingItem } from '../../../types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const teams = await prisma.team.findMany({
      include: {
        player1: true,
        player2: true,
      },
    });

    const groupMatches = await prisma.match.findMany({
      where: {
        roundType: RoundType.GROUP,
        status: MatchStatus.COMPLETED,
      },
      include: {
        sets: true,
      },
    });

    // Helper to calculate standings for a category + group
    const calculateGroup = (cat: Category, grp: GroupName): GroupStandingItem[] => {
      const groupTeams = teams.filter((t) => t.category === cat && t.groupName === grp);
      const items: GroupStandingItem[] = groupTeams.map((t) => ({
        teamId: t.id,
        teamCode: t.teamCode,
        category: t.category,
        groupName: t.groupName,
        player1Name: t.player1.name,
        player2Name: t.player2.name,
        played: 0,
        won: 0,
        lost: 0,
        points: 0,
        setsWon: 0,
        setsLost: 0,
        setDiff: 0,
        pointsScored: 0,
        pointsConceded: 0,
        pointDiff: 0,
        rank: 0,
      }));

      const teamMap = new Map<string, GroupStandingItem>();
      items.forEach((it) => teamMap.set(it.teamId, it));

      // Head-to-head tracking map: `${teamAId}_vs_${teamBId}` -> winnerId
      const h2hMap = new Map<string, string>();

      for (const m of groupMatches) {
        if (m.category !== cat) continue;
        const entryA = teamMap.get(m.teamAId);
        const entryB = teamMap.get(m.teamBId);
        if (!entryA || !entryB) continue;

        entryA.played += 1;
        entryB.played += 1;

        if (m.winnerTeamId === m.teamAId) {
          entryA.won += 1;
          entryA.points += 2;
          entryB.lost += 1;
          h2hMap.set(`${m.teamAId}_vs_${m.teamBId}`, m.teamAId);
          h2hMap.set(`${m.teamBId}_vs_${m.teamAId}`, m.teamAId);
        } else if (m.winnerTeamId === m.teamBId) {
          entryB.won += 1;
          entryB.points += 2;
          entryA.lost += 1;
          h2hMap.set(`${m.teamAId}_vs_${m.teamBId}`, m.teamBId);
          h2hMap.set(`${m.teamBId}_vs_${m.teamAId}`, m.teamBId);
        }

        for (const s of m.sets) {
          entryA.pointsScored += s.teamAScore;
          entryA.pointsConceded += s.teamBScore;
          entryB.pointsScored += s.teamBScore;
          entryB.pointsConceded += s.teamAScore;

          if (s.teamAScore > s.teamBScore) {
            entryA.setsWon += 1;
            entryB.setsLost += 1;
          } else if (s.teamBScore > s.teamAScore) {
            entryB.setsWon += 1;
            entryA.setsLost += 1;
          }
        }
      }

      // Calculate diffs
      for (const it of items) {
        it.setDiff = it.setsWon - it.setsLost;
        it.pointDiff = it.pointsScored - it.pointsConceded;
      }

      // Sort with Badminton Federation rules:
      // 1. Points
      // 2. Set Diff
      // 3. Point Diff
      // 4. Head-to-head if 2 teams are tied
      items.sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.setDiff !== a.setDiff) return b.setDiff - a.setDiff;
        if (b.pointDiff !== a.pointDiff) return b.pointDiff - a.pointDiff;

        // Head-to-head check
        const h2hWinner = h2hMap.get(`${a.teamId}_vs_${b.teamId}`);
        if (h2hWinner) {
          return h2hWinner === a.teamId ? -1 : 1;
        }

        return b.pointsScored - a.pointsScored;
      });

      items.forEach((it, idx) => {
        it.rank = idx + 1;
      });

      return items;
    };

    return NextResponse.json({
      xdGroupA: calculateGroup(Category.XD, GroupName.A),
      xdGroupB: calculateGroup(Category.XD, GroupName.B),
      mdGroupA: calculateGroup(Category.MD, GroupName.A),
      mdGroupB: calculateGroup(Category.MD, GroupName.B),
    });
  } catch (error: any) {
    console.error('Error calculating standings:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
