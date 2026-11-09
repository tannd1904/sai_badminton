import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { Gender } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const players = await prisma.player.findMany({
      orderBy: [{ pool: 'asc' }, { powerRating: 'desc' }, { name: 'asc' }],
      include: {
        teamsAsPlayer1: true,
        teamsAsPlayer2: true,
      },
    });

    return NextResponse.json(players);
  } catch (error: any) {
    console.error('Error fetching players:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, gender, pool, powerRating, department, isSaiStaff = true } = body;

    if (!name || !gender || !pool) {
      return NextResponse.json({ error: 'Name, gender, and pool are required' }, { status: 400 });
    }

    const newPlayer = await prisma.player.create({
      data: {
        name: name.trim(),
        gender: gender as Gender,
        pool: parseInt(pool, 10),
        powerRating: parseInt(powerRating || '50', 10),
        department: department || 'SAI Digital',
        isSaiStaff: Boolean(isSaiStaff),
      },
    });

    return NextResponse.json({ success: true, player: newPlayer });
  } catch (error: any) {
    console.error('Error creating player:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, name, gender, pool, powerRating, department, isSaiStaff } = body;

    if (!id) {
      return NextResponse.json({ error: 'Player ID required' }, { status: 400 });
    }

    const updated = await prisma.player.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(gender && { gender: gender as Gender }),
        ...(pool !== undefined && { pool: parseInt(pool, 10) }),
        ...(powerRating !== undefined && { powerRating: parseInt(powerRating, 10) }),
        ...(department !== undefined && { department }),
        ...(isSaiStaff !== undefined && { isSaiStaff: Boolean(isSaiStaff) }),
      },
    });

    // Recalculate totalPower of any teams this player belongs to
    const affectedTeams = await prisma.team.findMany({
      where: { OR: [{ player1Id: id }, { player2Id: id }] },
      include: { player1: true, player2: true },
    });

    for (const t of affectedTeams) {
      await prisma.team.update({
        where: { id: t.id },
        data: { totalPower: t.player1.powerRating + t.player2.powerRating },
      });
    }

    return NextResponse.json({ success: true, player: updated });
  } catch (error: any) {
    console.error('Error updating player:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

