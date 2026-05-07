import { NextResponse } from 'next/server';
import { dbGetOrderStats } from '@/lib/db';

export async function GET() {
  try {
    const stats = await dbGetOrderStats();
    return NextResponse.json(stats);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
