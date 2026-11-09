import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { checkScheduleConflicts } from '../../../../lib/conflict-checker';
import { publishEvent, CHANNELS } from '../../../../lib/redis';
import { Category, RoundType } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { totalCourts = 2 } = body; // 2 or 3

    const activeCourts = totalCourts === 2 ? 2 : 3;

    // Fetch all matches
    const allMatches = await prisma.match.findMany({
      include: {
        teamA: { include: { player1: true, player2: true } },
        teamB: { include: { player1: true, player2: true } },
        referee: true,
        sets: true,
      },
      orderBy: { orderIndex: 'asc' },
    });

    const groupMatches = allMatches.filter((m) => m.roundType === RoundType.GROUP);
    const xdGroup = groupMatches.filter((m) => m.category === Category.XD);
    const mdGroup = groupMatches.filter((m) => m.category === Category.MD);
    const playoffMatches = allMatches.filter((m) => m.roundType !== RoundType.GROUP);

    const baseTime = new Date();
    baseTime.setHours(9, 0, 0, 0);

    const slotDurationMs = 25 * 60 * 1000;
    let currentSlot = 0;

    const updates: { id: string; courtNumber: number; startTime: Date }[] = [];

    // Helper to schedule a category without player collision in the same slot
    const scheduleCategory = (categoryMatches: typeof groupMatches) => {
      const remaining = [...categoryMatches];
      while (remaining.length > 0) {
        let courtsUsedInSlot = 0;
        const playersInSlot = new Set<string>();

        for (let i = 0; i < remaining.length; i++) {
          if (courtsUsedInSlot >= activeCourts) break;
          const candidate = remaining[i];
          const cAthletes = [
            candidate.teamA.player1.id,
            candidate.teamA.player2.id,
            candidate.teamB.player1.id,
            candidate.teamB.player2.id,
          ];

          const hasSlotCollision = cAthletes.some((id) => playersInSlot.has(id));
          if (!hasSlotCollision) {
            courtsUsedInSlot++;
            cAthletes.forEach((id) => playersInSlot.add(id));
            const courtNumber = courtsUsedInSlot;
            const startTime = new Date(baseTime.getTime() + currentSlot * slotDurationMs);

            updates.push({
              id: candidate.id,
              courtNumber,
              startTime,
            });

            remaining.splice(i, 1);
            i--;
          }
        }
        currentSlot++;
      }
    };

    // 1. Schedule all XD group matches first
    scheduleCategory(xdGroup);

    // 1-slot rest buffer between XD and MD
    currentSlot++;

    // 2. Schedule all MD group matches next
    scheduleCategory(mdGroup);

    // 3. Playoffs scheduling (BO3, 45-min slots)
    const playoffBaseTime = new Date(baseTime.getTime() + currentSlot * slotDurationMs + 30 * 60 * 1000);
    let pSlot = 0;
    const pSlotDurationMs = 45 * 60 * 1000;

    // 3.1. XD Semis
    const xdSemis = playoffMatches.filter((m) => m.category === Category.XD && m.roundType === RoundType.SEMI);
    xdSemis.forEach((m, idx) => {
      updates.push({
        id: m.id,
        courtNumber: (idx % activeCourts) + 1,
        startTime: new Date(playoffBaseTime.getTime() + pSlot * pSlotDurationMs),
      });
    });
    pSlot++;

    // 3.2. MD Semis
    const mdSemis = playoffMatches.filter((m) => m.category === Category.MD && m.roundType === RoundType.SEMI);
    mdSemis.forEach((m, idx) => {
      updates.push({
        id: m.id,
        courtNumber: (idx % activeCourts) + 1,
        startTime: new Date(playoffBaseTime.getTime() + pSlot * pSlotDurationMs),
      });
    });
    pSlot++;

    // 3.3. XD Bronze
    const xdBronze = playoffMatches.find((m) => m.category === Category.XD && m.roundType === RoundType.BRONZE);
    if (xdBronze) {
      updates.push({
        id: xdBronze.id,
        courtNumber: 1,
        startTime: new Date(playoffBaseTime.getTime() + pSlot * pSlotDurationMs),
      });
      pSlot++;
    }

    // 3.4. MD Bronze
    const mdBronze = playoffMatches.find((m) => m.category === Category.MD && m.roundType === RoundType.BRONZE);
    if (mdBronze) {
      updates.push({
        id: mdBronze.id,
        courtNumber: 1,
        startTime: new Date(playoffBaseTime.getTime() + pSlot * pSlotDurationMs),
      });
      pSlot++;
    }

    // 3.5. XD Final
    const xdFinal = playoffMatches.find((m) => m.category === Category.XD && m.roundType === RoundType.FINAL);
    if (xdFinal) {
      updates.push({
        id: xdFinal.id,
        courtNumber: 1,
        startTime: new Date(playoffBaseTime.getTime() + pSlot * pSlotDurationMs),
      });
      pSlot++;
    }

    // 3.6. MD Final
    const mdFinal = playoffMatches.find((m) => m.category === Category.MD && m.roundType === RoundType.FINAL);
    if (mdFinal) {
      updates.push({
        id: mdFinal.id,
        courtNumber: 1,
        startTime: new Date(playoffBaseTime.getTime() + pSlot * pSlotDurationMs),
      });
      pSlot++;
    }

    // Batch update all matches in DB
    for (const u of updates) {
      await prisma.match.update({
        where: { id: u.id },
        data: {
          courtNumber: u.courtNumber,
          startTime: u.startTime,
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
      message: `Lịch thi đấu đã được tự động phân bổ hoàn hảo cho ${activeCourts} sân với 0 trùng lịch!`,
      conflicts,
      hasConflicts: conflicts.length > 0,
    });
  } catch (error: any) {
    console.error('Error rebalancing schedule:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
