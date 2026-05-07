import { NextResponse } from 'next/server';
import { dbDeleteTemplate, dbUpdateTemplate } from '@/lib/db';

export async function DELETE(request, { params }) {
  try {
    const id = parseInt(params.id, 10);
    await dbDeleteTemplate(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  try {
    const id = parseInt(params.id, 10);
    const updates = await request.json();
    await dbUpdateTemplate(id, updates);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
