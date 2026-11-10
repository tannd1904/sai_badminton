import { prisma } from './prisma';
import { Category, GroupName, MatchStatus, RoundType } from '@prisma/client';
import { publishEvent, CHANNELS } from './redis';

export async function advancePlayoffsForCategory(cat: Category) {
  try {
    const teams = await prisma.team.findMany({
      where: { category: cat },
      include: { player1: true, player2: true },
    });

    const completedGroupMatches = await prisma.match.findMany({
      where: { category: cat, roundType: RoundType.GROUP, status: MatchStatus.COMPLETED },
      include: { sets: true },
    });

    // We have 4 teams per group -> 6 matches per group = 12 matches total
    if (completedGroupMatches.length < 12) {
      console.log(`[Playoff Sync] Category ${cat}: Only ${completedGroupMatches.length}/12 group matches completed. Playoff slots remain TBD.`);
      return { advanced: false, reason: 'Group stage not yet completed' };
    }

    // Helper to calculate standings
    const calculateTopTwo = (group: GroupName) => {
      const gTeams = teams.filter((t) => t.groupName === group);
      const stats = gTeams.map((t) => ({
        team: t,
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
      }));

      const map = new Map(stats.map((s) => [s.team.id, s]));
      const h2hMap = new Map<string, string>();

      for (const m of completedGroupMatches) {
        const sA = map.get(m.teamAId || '');
        const sB = map.get(m.teamBId || '');
        if (!sA || !sB) continue;

        sA.played++;
        sB.played++;

        if (m.winnerTeamId === m.teamAId) {
          sA.won++;
          sA.points += 2;
          sB.lost++;
          h2hMap.set(`${m.teamAId}_vs_${m.teamBId}`, m.teamAId!);
          h2hMap.set(`${m.teamBId}_vs_${m.teamAId}`, m.teamAId!);
        } else if (m.winnerTeamId === m.teamBId) {
          sB.won++;
          sB.points += 2;
          sA.lost++;
          h2hMap.set(`${m.teamAId}_vs_${m.teamBId}`, m.teamBId!);
          h2hMap.set(`${m.teamBId}_vs_${m.teamAId}`, m.teamBId!);
        }

        for (const s of m.sets) {
          sA.pointsScored += s.teamAScore;
          sA.pointsConceded += s.teamBScore;
          sB.pointsScored += s.teamBScore;
          sB.pointsConceded += s.teamAScore;
          if (s.teamAScore > s.teamBScore) {
            sA.setsWon++;
            sB.setsLost++;
          } else if (s.teamBScore > s.teamAScore) {
            sB.setsWon++;
            sA.setsLost++;
          }
        }
      }

      for (const s of stats) {
        s.setDiff = s.setsWon - s.setsLost;
        s.pointDiff = s.pointsScored - s.pointsConceded;
      }

      stats.sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.setDiff !== a.setDiff) return b.setDiff - a.setDiff;
        if (b.pointDiff !== a.pointDiff) return b.pointDiff - a.pointDiff;
        const h2hWinner = h2hMap.get(`${a.team.id}_vs_${b.team.id}`);
        if (h2hWinner) return h2hWinner === a.team.id ? -1 : 1;
        return b.pointsScored - a.pointsScored;
      });

      return [stats[0]?.team, stats[1]?.team];
    };

    const [a1, a2] = calculateTopTwo(GroupName.A);
    const [b1, b2] = calculateTopTwo(GroupName.B);

    if (!a1 || !b2 || !b1 || !a2) {
      return { advanced: false, reason: 'Could not resolve top 2 teams' };
    }

    // Update SF1: A1 vs B2
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

    // Update SF2: B1 vs A2
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
    const updatedSf1 = await prisma.match.findUnique({ where: { matchCode: sf1Code } });
    const updatedSf2 = await prisma.match.findUnique({ where: { matchCode: sf2Code } });

    if (updatedSf1?.status === MatchStatus.COMPLETED && updatedSf2?.status === MatchStatus.COMPLETED && updatedSf1.winnerTeamId && updatedSf2.winnerTeamId) {
      const sf1WinnerId = updatedSf1.winnerTeamId;
      const sf1LoserId = updatedSf1.winnerTeamId === updatedSf1.teamAId ? updatedSf1.teamBId : updatedSf1.teamAId;

      const sf2WinnerId = updatedSf2.winnerTeamId;
      const sf2LoserId = updatedSf2.winnerTeamId === updatedSf2.teamAId ? updatedSf2.teamBId : updatedSf2.teamAId;

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

    // Broadcast updated playoffs
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

    return { advanced: true, playoffs: updatedPlayoffs };
  } catch (error: any) {
    console.error(`[Playoff Sync Error] for ${cat}:`, error);
    return { advanced: false, error: error.message };
  }
}
