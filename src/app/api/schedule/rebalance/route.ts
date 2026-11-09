import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkScheduleConflicts } from '@/lib/conflict-checker';
import { publishEvent, CHANNELS } from '@/lib/redis';
import { Category, RoundType } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { totalCourts = 2 } = body; // 2 or 3

    const activeCourts = totalCourts === 2 ? 2 : 3;

    // Fetch all group matches
    const matches = await prisma.match.findMany({
      where: { roundType: RoundType.GROUP },
      include: {
        teamA: { include: { player1: true, player2: true } },
        teamB: { include: { player1: true, player2: true } },
        referee: true,
        sets: true,
      },
      orderBy: { orderIndex: 'asc' },
    });

    const baseTime = new Date();
    baseTime.setHours(9, 0, 0, 0);

    // Reassign courtNumber and startTimes
    // Slot duration: 25 minutes for group matches (10 min play + 15 min buffer)
    const slotDurationMs = 25 * 60 * 1000;

    for (let i = 0; i < matches.length; i++) {
      const courtNumber = (i % activeCourts) + 1;
      const slotIndex = Math.floor(i / activeCourts);
      const startTime = new Date(baseTime.getTime() + slotIndex * slotDurationMs);

      await prisma.match.update({
        where: { id: matches[i].id },
        data: {
          courtNumber,
          startTime,
        },
      });
    }

    // Rebalance playoffs after group matches
    const playoffMatches = await prisma.match.findMany({
      where: { roundType: { in: [RoundType.SEMI, RoundType.BRONZE, RoundType.FINAL] } },
      orderBy: { orderIndex: 'asc' },
    });

    const groupEndSlot = Math.ceil(matches.length / activeCourts);
    const playoffStartTime = new Date(baseTime.getTime() + groupEndSlot * slotDurationMs + 30 * 60 * 1000); // 30m break before playoffs

    for (let p = 0; p < playoffMatches.length; p++) {
      const courtNumber = (p % activeCourts) + 1;
      const pSlot = Math.floor(p / activeCourts);
      const pStart = new Date(playoffStartTime.getTime() + pSlot * 45 * 60 * 1000); // 45m BO3

      await prisma.match.update({
        where: { id: playoffMatches[p].id },
        data: {
          courtNumber,
          startTime: pStart,
        },
      });
    }

    // Fetch refreshed matches and check conflicts
    const updated = await prisma.match.findMany({
      include: {
        teamA: { include: { player1: true, player2: true } },
        teamB: { include: { player1: true, player2: true } },
        referee: true,
        sets: true,
      },
      orderBy: [{ courtNumber: 'asc' }, { startTime: 'asc' }],
    });

    const conflicts = checkScheduleConflicts(updated as any);

    await publishEvent(CHANNELS.SCHEDULE_UPDATE, {
      totalCourts: activeCourts,
      matches: updated,
      conflicts,
    });

    return NextResponse.json({
      success: true,
      totalCourts: activeCourts,
      message: `Schedule successfully rebalanced for ${activeCourts} active courts!`,
      conflicts,
      hasConflicts: conflicts.length > 0,
    });
  } catch (error: any) {
    console.error('Error rebalancing schedule:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

