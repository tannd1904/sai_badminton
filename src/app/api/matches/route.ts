import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Category, MatchStatus, RoundType } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category') as Category | null;
    const status = searchParams.get('status') as MatchStatus | null;
    const roundType = searchParams.get('roundType') as RoundType | null;
    const courtNumber = searchParams.get('court') ? parseInt(searchParams.get('court')!) : null;

    const where: any = {};
    if (category) where.category = category;
    if (status) where.status = status;
    if (roundType) where.roundType = roundType;
    if (courtNumber) where.courtNumber = courtNumber;

    const matches = await prisma.match.findMany({
      where,
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
      },
      orderBy: [{ courtNumber: 'asc' }, { orderIndex: 'asc' }],
    });

    return NextResponse.json(matches);
  } catch (error: any) {
    console.error('Error fetching matches:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
