import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const format = searchParams.get('format') || 'json';

    const [players, teams, matches, auditLogs] = await Promise.all([
      prisma.player.findMany({ orderBy: [{ pool: 'asc' }, { powerRating: 'desc' }] }),
      prisma.team.findMany({
        include: { player1: true, player2: true },
        orderBy: [{ category: 'asc' }, { teamCode: 'asc' }],
      }),
      prisma.match.findMany({
        include: {
          teamA: true,
          teamB: true,
          winnerTeam: true,
          sets: { orderBy: { setNumber: 'asc' } },
        },
        orderBy: { orderIndex: 'asc' },
      }),
      prisma.scoreAuditLog.findMany({
        take: 200,
        orderBy: { timestamp: 'desc' },
      }),
    ]);

    if (format === 'csv') {
      // Generate clean CSV of all matches
      const headers = ['Match Code', 'Category', 'Round', 'Court', 'Team A', 'Team B', 'Sets Score', 'Status', 'Winner'];
      const rows = matches.map((m) => {
        const setScores = m.sets.map((s) => `${s.teamAScore}-${s.teamBScore}`).join(' | ');
        return [
          m.matchCode,
          m.category,
          m.roundType,
          `Court ${m.courtNumber}`,
          m.teamA.teamCode,
          m.teamB.teamCode,
          `"${setScores}"`,
          m.status,
          m.winnerTeam?.teamCode || 'TBD',
        ].join(',');
      });

      const csvContent = [headers.join(','), ...rows].join('\n');

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="SAI-Badminton-Matches-${Date.now()}.csv"`,
        },
      });
    }

    return NextResponse.json({
      tournament: 'SAI Badminton Championship 2024',
      generatedAt: new Date().toISOString(),
      summary: {
        totalPlayers: players.length,
        totalTeams: teams.length,
        totalMatches: matches.length,
        completedMatches: matches.filter((m) => m.status === 'COMPLETED').length,
      },
      players,
      teams,
      matches,
      recentAuditLogs: auditLogs,
    });
  } catch (error: any) {
    console.error('Error exporting tournament data:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

