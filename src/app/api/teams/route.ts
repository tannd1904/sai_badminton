import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { Category, GroupName } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const teams = await prisma.team.findMany({
      include: {
        player1: true,
        player2: true,
      },
      orderBy: [{ category: 'asc' }, { groupName: 'asc' }, { teamCode: 'asc' }],
    });

    const players = await prisma.player.findMany({
      orderBy: [{ pool: 'asc' }, { powerRating: 'desc' }],
    });

    return NextResponse.json({ teams, players });
  } catch (error: any) {
    console.error('Error fetching teams:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { teamId, player1Id, player2Id, groupName } = body;

    const team = await prisma.team.findUnique({
      where: { id: teamId },
    });

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    const p1Id = player1Id || team.player1Id;
    const p2Id = player2Id || team.player2Id;

    const p1 = await prisma.player.findUnique({ where: { id: p1Id } });
    const p2 = await prisma.player.findUnique({ where: { id: p2Id } });

    if (!p1 || !p2) {
      return NextResponse.json({ error: 'Players not found' }, { status: 400 });
    }

    const updated = await prisma.team.update({
      where: { id: teamId },
      data: {
        player1Id: p1Id,
        player2Id: p2Id,
        totalPower: p1.powerRating + p2.powerRating,
        ...(groupName && { groupName: groupName as GroupName }),
      },
      include: {
        player1: true,
        player2: true,
      },
    });

    return NextResponse.json({ success: true, team: updated });
  } catch (error: any) {
    console.error('Error updating team:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
