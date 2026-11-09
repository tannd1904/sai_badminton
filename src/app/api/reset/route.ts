import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { publishEvent, CHANNELS } from '@/lib/redis';
import { MatchStatus } from '@prisma/client';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { action = 'RESET_SCORES' } = body;

    if (action === 'RESET_SCORES') {
      // Clear audit logs
      await prisma.scoreAuditLog.deleteMany();

      // Reset all match sets to 0-0, isFinished = false
      await prisma.matchSet.updateMany({
        data: {
          teamAScore: 0,
          teamBScore: 0,
          isFinished: false,
        },
      });

      // Reset all matches to SCHEDULED, winnerTeamId = null, currentSet = 1, timerRemainingSeconds = 600
      await prisma.match.updateMany({
        data: {
          status: MatchStatus.SCHEDULED,
          winnerTeamId: null,
          currentSet: 1,
          courtSideSwitched: false,
          timerRemainingSeconds: 600,
          timerIsRunning: false,
          endTime: null,
        },
      });

      await publishEvent(CHANNELS.SCHEDULE_UPDATE, { reset: true });

      return NextResponse.json({ success: true, message: 'All match scores reset to 0-0 successfully!' });
    }

    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
  } catch (error: any) {
    console.error('Error resetting tournament:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

