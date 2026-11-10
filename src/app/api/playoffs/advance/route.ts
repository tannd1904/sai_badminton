import { NextRequest, NextResponse } from 'next/server';
import { Category } from '@prisma/client';
import { advancePlayoffsForCategory } from '../../../../lib/playoffs';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { category = 'XD' } = body; // 'XD' or 'MD'

    const cat = category as Category;
    const result = await advancePlayoffsForCategory(cat);

    if (!result.advanced) {
      return NextResponse.json({
        success: false,
        message: result.reason || result.error || 'Cannot advance playoffs yet',
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: `Playoffs advanced successfully for ${cat}`,
      playoffs: result.playoffs,
    });
  } catch (error: any) {
    console.error('Error in advance playoffs route:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
