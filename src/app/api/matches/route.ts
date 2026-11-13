import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { Category, MatchStatus, RoundType } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const categoryParam = searchParams.get('category');
    const statusParam = searchParams.get('status');
    const roundTypeParam = searchParams.get('roundType');
    const courtNumber = searchParams.get('court') ? parseInt(searchParams.get('court')!) : null;

    const where: any = {};
    if (categoryParam) {
      if (categoryParam.includes(',')) {
        where.category = { in: categoryParam.split(',').map((s) => s.trim() as Category) };
      } else {
        where.category = categoryParam as Category;
      }
    }

    if (statusParam) {
      if (statusParam.includes(',')) {
        where.status = { in: statusParam.split(',').map((s) => s.trim() as MatchStatus) };
      } else {
        where.status = statusParam as MatchStatus;
      }
    }

    if (roundTypeParam) {
      if (roundTypeParam.includes(',')) {
        where.roundType = { in: roundTypeParam.split(',').map((s) => s.trim() as RoundType) };
      } else {
        where.roundType = roundTypeParam as RoundType;
      }
    }

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
      orderBy: [{ startTime: 'asc' }, { orderIndex: 'asc' }, { courtNumber: 'asc' }],
    });

    return NextResponse.json(matches);
  } catch (error: any) {
    console.error('Error fetching matches:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
