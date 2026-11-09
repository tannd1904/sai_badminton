import { NextRequest, NextResponse } from 'next/server';
import { sendMatchAnnouncementWebhook } from '@/lib/webhook';
import { publishEvent, CHANNELS } from '@/lib/redis';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { matchCode, courtNumber, category, teamA, teamB, customMessage } = body;

    const res = await sendMatchAnnouncementWebhook({
      title: 'Match Announcement',
      matchCode,
      courtNumber,
      category,
      teamA,
      teamB,
      customMessage,
    });

    // Also broadcast banner announcement across web clients via Redis
    await publishEvent(CHANNELS.ANNOUNCEMENT, {
      matchCode,
      courtNumber,
      category,
      message: customMessage || `🏸 Match ${matchCode} (${category}) on Court ${courtNumber}: ${teamA} vs ${teamB} is starting in 5 minutes!`,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(res);
  } catch (error: any) {
    console.error('Error dispatching webhook announcement:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
