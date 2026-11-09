import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { publishEvent, CHANNELS } from '../../../../lib/redis';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const match = await prisma.match.findUnique({
      where: { id: params.id },
      include: {
        teamA: {
          include: {
            player1: true,
            player2: true,
          },
        },
        teamB: {
          include: {
            player1: true,
            player2: true,
          },
        },
        winnerTeam: {
          include: {
            player1: true,
            player2: true,
          },
        },
        referee: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        sets: {
          orderBy: { setNumber: 'asc' },
        },
        auditLogs: {
          orderBy: { timestamp: 'desc' },
          take: 50,
        },
      },
    });

    if (!match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    return NextResponse.json(match);
  } catch (error: any) {
    console.error('Error fetching match:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const { status, courtNumber, refereeId, startTime, rulesMode } = body;

    const updated = await prisma.match.update({
      where: { id: params.id },
      data: {
        ...(status && { status }),
        ...(courtNumber && { courtNumber }),
        ...(refereeId !== undefined && { refereeId }),
        ...(startTime && { startTime: new Date(startTime) }),
        ...(rulesMode && { rulesMode }),
      },
      include: {
        teamA: { include: { player1: true, player2: true } },
        teamB: { include: { player1: true, player2: true } },
        sets: true,
        referee: true,
      },
    });

    await publishEvent(CHANNELS.MATCH_STATUS, {
      matchId: updated.id,
      status: updated.status,
      courtNumber: updated.courtNumber,
      updatedMatch: updated,
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Error updating match:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

