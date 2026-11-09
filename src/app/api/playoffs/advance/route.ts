import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Category, GroupName, MatchStatus, RoundType } from '@prisma/client';
import { publishEvent, CHANNELS } from '@/lib/redis';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { category = 'XD' } = body; // 'XD' or 'MD'

    const cat = category as Category;

    // 1. Fetch group matches to calculate final group standings
    const teams = await prisma.team.findMany({
      where: { category: cat },
      include: { player1: true, player2: true },
    });

    const groupMatches = await prisma.match.findMany({
      where: { category: cat, roundType: RoundType.GROUP, status: MatchStatus.COMPLETED },
      include: { sets: true },
    });

    // Helper to calculate standings
    const calculateTopTwo = (group: GroupName) => {
      const gTeams = teams.filter((t) => t.groupName === group);
      const stats = gTeams.map((t) => ({
        team: t,
        played: 0,
        won: 0,
        lost: 0,
        points: 0,
        setDiff: 0,
        pointDiff: 0,
      }));

      const map = new Map(stats.map((s) => [s.team.id, s]));

      for (const m of groupMatches) {
        const sA = map.get(m.teamAId);
        const sB = map.get(m.teamBId);
        if (!sA || !sB) continue;

        sA.played++;
        sB.played++;

        if (m.winnerTeamId === m.teamAId) {
          sA.won++;
          sA.points += 2;
          sB.lost++;
        } else if (m.winnerTeamId === m.teamBId) {
          sB.won++;
          sB.points += 2;
          sA.lost++;
        }

        for (const s of m.sets) {
          sA.pointDiff += s.teamAScore - s.teamBScore;
          sB.pointDiff += s.teamBScore - s.teamAScore;
          if (s.teamAScore > s.teamBScore) {
            sA.setDiff++;
            sB.setDiff--;
          } else if (s.teamBScore > s.teamAScore) {
            sB.setDiff++;
            sA.setDiff--;
          }
        }
      }

      stats.sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.setDiff !== a.setDiff) return b.setDiff - a.setDiff;
        return b.pointDiff - a.pointDiff;
      });

      return [stats[0]?.team, stats[1]?.team];
    };

    const [a1, a2] = calculateTopTwo(GroupName.A);
    const [b1, b2] = calculateTopTwo(GroupName.B);

    if (!a1 || !b2 || !b1 || !a2) {
      return NextResponse.json({ error: 'Not enough teams to advance playoffs' }, { status: 400 });
    }

    // Update SF1 (A1 vs B2)
    const sf1Code = `M-${cat}-SF1`;
    const sf1 = await prisma.match.findUnique({ where: { matchCode: sf1Code } });
    if (sf1) {
      await prisma.match.update({
        where: { id: sf1.id },
        data: {
          teamAId: a1.id,
          teamBId: b2.id,
        },
      });
    }

    // Update SF2 (B1 vs A2)
    const sf2Code = `M-${cat}-SF2`;
    const sf2 = await prisma.match.findUnique({ where: { matchCode: sf2Code } });
    if (sf2) {
      await prisma.match.update({
        where: { id: sf2.id },
        data: {
          teamAId: b1.id,
          teamBId: a2.id,
        },
      });
    }

    // Check if Semis have finished to advance Finals and Bronze
    if (sf1?.status === MatchStatus.COMPLETED && sf2?.status === MatchStatus.COMPLETED) {
      const sf1WinnerId = sf1.winnerTeamId!;
      const sf1LoserId = sf1.winnerTeamId === sf1.teamAId ? sf1.teamBId : sf1.teamAId;

      const sf2WinnerId = sf2.winnerTeamId!;
      const sf2LoserId = sf2.winnerTeamId === sf2.teamAId ? sf2.teamBId : sf2.teamAId;

      // Update Finals
      const finCode = `M-${cat}-FIN`;
      await prisma.match.update({
        where: { matchCode: finCode },
        data: {
          teamAId: sf1WinnerId,
          teamBId: sf2WinnerId,
        },
      });

      // Update Bronze
      const brzCode = `M-${cat}-BRZ`;
      await prisma.match.update({
        where: { matchCode: brzCode },
        data: {
          teamAId: sf1LoserId,
          teamBId: sf2LoserId,
        },
      });
    }

    // Fetch updated matches and broadcast
    const updatedPlayoffs = await prisma.match.findMany({
      where: { category: cat, roundType: { in: [RoundType.SEMI, RoundType.BRONZE, RoundType.FINAL] } },
      include: {
        teamA: { include: { player1: true, player2: true } },
        teamB: { include: { player1: true, player2: true } },
        winnerTeam: true,
        sets: true,
      },
    });

    await publishEvent(CHANNELS.SCHEDULE_UPDATE, {
      category: cat,
      playoffs: updatedPlayoffs,
    });

    return NextResponse.json({
      success: true,
      message: `Playoffs advanced for ${cat}: SF1 (${a1.teamCode} vs ${b2.teamCode}), SF2 (${b1.teamCode} vs ${a2.teamCode})`,
      playoffs: updatedPlayoffs,
    });
  } catch (error: any) {
    console.error('Error advancing playoffs:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

