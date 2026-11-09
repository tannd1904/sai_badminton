import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';
import { publishEvent, CHANNELS } from '../../../../../lib/redis';
import { MatchStatus } from '@prisma/client';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const {
      setNumber = 1,
      teamAScore,
      teamBScore,
      status,
      winnerTeamId,
      refereeId,
      courtNumber,
      reason = 'Emergency Organizer Override',
    } = body;

    const match = await prisma.match.findUnique({
      where: { id: params.id },
      include: { sets: true },
    });

    if (!match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    // Update or create set scores
    if (teamAScore !== undefined && teamBScore !== undefined) {
      const existingSet = match.sets.find((s) => s.setNumber === setNumber);
      if (existingSet) {
        await prisma.matchSet.update({
          where: { id: existingSet.id },
          data: {
            teamAScore,
            teamBScore,
            isFinished: status === MatchStatus.COMPLETED,
          },
        });
      } else {
        await prisma.matchSet.create({
          data: {
            matchId: match.id,
            setNumber,
            teamAScore,
            teamBScore,
            isFinished: status === MatchStatus.COMPLETED,
          },
        });
      }

      // Create audit log for emergency override
      await prisma.scoreAuditLog.create({
        data: {
          matchId: match.id,
          setNumber,
          actionType: 'ADD_POINT',
          scoreSnapshotA: teamAScore,
          scoreSnapshotB: teamBScore,
        },
      });
    }

    // Update match record
    const updated = await prisma.match.update({
      where: { id: match.id },
      data: {
        ...(status && { status }),
        ...(winnerTeamId !== undefined && { winnerTeamId }),
        ...(refereeId !== undefined && { refereeId }),
        ...(courtNumber !== undefined && { courtNumber }),
      },
      include: {
        teamA: { include: { player1: true, player2: true } },
        teamB: { include: { player1: true, player2: true } },
        winnerTeam: { include: { player1: true, player2: true } },
        sets: { orderBy: { setNumber: 'asc' } },
        referee: true,
      },
    });

    // Broadcast override immediately
    await publishEvent(CHANNELS.SCORE_UPDATE, {
      matchId: updated.id,
      matchCode: updated.matchCode,
      courtNumber: updated.courtNumber,
      status: updated.status,
      winnerTeamId: updated.winnerTeamId,
      winnerTeam: updated.winnerTeam,
      sets: updated.sets,
      overrideReason: reason,
    });

    return NextResponse.json({ success: true, match: updated });
  } catch (error: any) {
    console.error('Error in override endpoint:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

