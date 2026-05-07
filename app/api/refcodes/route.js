import { NextResponse } from 'next/server';
import { dbGetAllRefCodes } from '@/lib/db';

export async function GET() {
  try {
    const refCodes = await dbGetAllRefCodes();
    return NextResponse.json(refCodes);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
