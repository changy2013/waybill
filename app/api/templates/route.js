import { NextResponse } from 'next/server';
import { dbSaveTemplate, dbGetAllTemplates } from '@/lib/db';

export async function GET() {
  try {
    const templates = await dbGetAllTemplates();
    return NextResponse.json(templates);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { name, headers, mapping } = await request.json();
    if (!name || !headers || !mapping) {
      return NextResponse.json({ error: '缺少必要字段' }, { status: 400 });
    }
    const id = await dbSaveTemplate(name, headers, mapping);
    return NextResponse.json({ success: true, id });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
