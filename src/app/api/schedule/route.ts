import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkScheduleConflicts } from '@/lib/conflict-checker';
import { publishEvent, CHANNELS } from '@/lib/redis';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const matches = await prisma.match.findMany({
      include: {
        teamA: { include: { player1: true, player2: true } },
        teamB: { include: { player1: true, player2: true } },
        referee: true,
        sets: true,
      },
      orderBy: [{ courtNumber: 'asc' }, { startTime: 'asc' }, { orderIndex: 'asc' }],
    });

    const conflicts = checkScheduleConflicts(matches as any);

    return NextResponse.json({
      matches,
      conflicts,
      totalConflicts: conflicts.length,
    });
  } catch (error: any) {
    console.error('Error in schedule API:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { updates, ignoreConflicts = false } = body; // updates: array of { id, courtNumber, startTime, orderIndex }

    if (!Array.isArray(updates)) {
      return NextResponse.json({ error: 'Updates must be an array' }, { status: 400 });
    }

    // Apply updates in a transaction
    for (const item of updates) {
      await prisma.match.update({
        where: { id: item.id },
        data: {
          ...(item.courtNumber !== undefined && { courtNumber: item.courtNumber }),
          ...(item.startTime !== undefined && { startTime: new Date(item.startTime) }),
          ...(item.orderIndex !== undefined && { orderIndex: item.orderIndex }),
        },
      });
    }

    // Re-fetch all matches and verify conflicts
    const updatedMatches = await prisma.match.findMany({
      include: {
        teamA: { include: { player1: true, player2: true } },
        teamB: { include: { player1: true, player2: true } },
        referee: true,
        sets: true,
      },
      orderBy: [{ courtNumber: 'asc' }, { startTime: 'asc' }],
    });

    const conflicts = checkScheduleConflicts(updatedMatches as any);

    // Broadcast schedule update to all clients
    await publishEvent(CHANNELS.SCHEDULE_UPDATE, {
      matches: updatedMatches,
      conflicts,
    });

    return NextResponse.json({
      success: true,
      matches: updatedMatches,
      conflicts,
      hasConflicts: conflicts.length > 0,
    });
  } catch (error: any) {
    console.error('Error updating schedule:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
