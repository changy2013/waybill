import { NextRequest, NextResponse } from 'next/server';
import { dbSaveOrders, dbGetOrdersPaginated } from '@/lib/db';
import type { Order } from '@/lib/types';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);
  const filters = {
    refCode: searchParams.get('refCode') || '',
    receiverName: searchParams.get('receiverName') || '',
    dateFrom: searchParams.get('dateFrom') || '',
    dateTo: searchParams.get('dateTo') || '',
  };

  try {
    const result = await dbGetOrdersPaginated(page, pageSize, filters);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { orders, batchId } = await request.json() as { orders: Order[]; batchId: string };
    if (!orders || !Array.isArray(orders) || orders.length === 0) {
      return NextResponse.json({ error: '无效的订单数据' }, { status: 400 });
    }
    await dbSaveOrders(orders, batchId);
    return NextResponse.json({ success: true, count: orders.length });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
