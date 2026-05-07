import { neon, NeonQueryFunction } from '@neondatabase/serverless';
import type { Order, Template, OrderFilters, PaginatedResult, OrderStats } from './types';

let sql: NeonQueryFunction<false, false> | null = null;

function getSQL(): NeonQueryFunction<false, false> {
  if (!sql) {
    sql = neon(process.env.DATABASE_URL!);
  }
  return sql;
}

export async function initDB(): Promise<void> {
  const sql = getSQL();
  await sql`
    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      batch_id TEXT NOT NULL,
      ref_code TEXT,
      sender_name TEXT,
      sender_phone TEXT,
      sender_address TEXT,
      receiver_name TEXT NOT NULL,
      receiver_phone TEXT NOT NULL,
      receiver_address TEXT NOT NULL,
      weight NUMERIC,
      item_quantity INTEGER,
      temp_zone TEXT,
      remark TEXT,
      status TEXT DEFAULT 'success',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_orders_batch_id ON orders(batch_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_orders_ref_code ON orders(ref_code)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at)`;

  await sql`
    CREATE TABLE IF NOT EXISTS templates (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      headers JSONB NOT NULL,
      mapping JSONB NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
}

// ==================== Orders ====================

export async function dbSaveOrders(
  orders: Order[],
  batchId: string,
  onProgress?: (done: number, total: number) => void,
): Promise<void> {
  const { neon: neonRaw } = await import('@neondatabase/serverless');
  const sqlRaw = neonRaw(process.env.DATABASE_URL!);
  await initDB();
  const now = new Date().toISOString();

  // Batch insert in chunks of 100 to avoid parameter limits
  const CHUNK = 100;
  for (let start = 0; start < orders.length; start += CHUNK) {
    const chunk = orders.slice(start, start + CHUNK);
    const params: unknown[] = [];
    const valueClauses = chunk.map((order) => {
      const base = params.length;
      params.push(
        batchId,
        order.refCode || null,
        order.senderName || null,
        order.senderPhone || null,
        order.senderAddress || null,
        order.receiverName || null,
        order.receiverPhone || null,
        order.receiverAddress || null,
        order.weight ? Number(order.weight) : null,
        order.itemQuantity ? Number(order.itemQuantity) : null,
        order.tempZone || null,
        order.remark || null,
        now,
      );
      return `($${base+1},$${base+2},$${base+3},$${base+4},$${base+5},$${base+6},$${base+7},$${base+8},$${base+9},$${base+10},$${base+11},$${base+12},'success',$${base+13})`;
    });
    await sqlRaw.query(
      `INSERT INTO orders (batch_id,ref_code,sender_name,sender_phone,sender_address,receiver_name,receiver_phone,receiver_address,weight,item_quantity,temp_zone,remark,status,created_at) VALUES ${valueClauses.join(',')}`,
      params,
    );
    if (onProgress) {
      onProgress(Math.min(start + CHUNK, orders.length), orders.length);
    }
  }
}

export async function dbGetOrdersPaginated(
  page = 1,
  pageSize = 20,
  filters: OrderFilters = {},
): Promise<PaginatedResult> {
  const { neon: neonRaw } = await import('@neondatabase/serverless');
  const sqlRaw = neonRaw(process.env.DATABASE_URL!);
  await initDB();

  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filters.refCode) {
    params.push(`%${filters.refCode}%`);
    conditions.push(`ref_code ILIKE $${params.length}`);
  }
  if (filters.receiverName) {
    params.push(`%${filters.receiverName}%`);
    conditions.push(`receiver_name ILIKE $${params.length}`);
  }
  if (filters.dateFrom) {
    params.push(filters.dateFrom);
    conditions.push(`created_at >= $${params.length}::date`);
  }
  if (filters.dateTo) {
    params.push(filters.dateTo);
    conditions.push(`created_at < ($${params.length}::date + interval '1 day')`);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (page - 1) * pageSize;

  // neon().query() returns an array directly (not { rows })
  const countRows = await sqlRaw.query(
    `SELECT COUNT(*) as total FROM orders ${where}`,
    params
  ) as Array<{ total: string }>;
  const total = parseInt(countRows[0].total, 10);

  const dataRows = await sqlRaw.query(
    `SELECT * FROM orders ${where} ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, pageSize, offset]
  ) as Array<Record<string, unknown>>;

  const data: Order[] = dataRows.map(row => ({
    id: row.id as number,
    batchId: row.batch_id as string,
    refCode: row.ref_code as string,
    senderName: row.sender_name as string,
    senderPhone: row.sender_phone as string,
    senderAddress: row.sender_address as string,
    receiverName: row.receiver_name as string,
    receiverPhone: row.receiver_phone as string,
    receiverAddress: row.receiver_address as string,
    weight: row.weight as number,
    itemQuantity: row.item_quantity as number,
    tempZone: row.temp_zone as string,
    remark: row.remark as string,
    status: row.status as string,
    createdAt: row.created_at as string,
  }));

  return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function dbGetAllRefCodes(): Promise<string[]> {
  const sql = getSQL();
  await initDB();
  const result = await sql`SELECT ref_code FROM orders WHERE ref_code IS NOT NULL` as Array<{ ref_code: string }>;
  return result.map(r => r.ref_code);
}

export async function dbGetOrderStats(): Promise<OrderStats> {
  const sql = getSQL();
  await initDB();
  const today = new Date().toISOString().split('T')[0];

  const [totalResult, todayResult, batchResult] = await Promise.all([
    sql`SELECT COUNT(*) as count FROM orders` as unknown as Promise<Array<{ count: string }>>,
    sql`SELECT COUNT(*) as count FROM orders WHERE created_at >= ${today}::date` as unknown as Promise<Array<{ count: string }>>,
    sql`SELECT COUNT(DISTINCT batch_id) as count FROM orders` as unknown as Promise<Array<{ count: string }>>,
  ]);

  return {
    totalOrders: parseInt(totalResult[0].count, 10),
    todayOrders: parseInt(todayResult[0].count, 10),
    totalBatches: parseInt(batchResult[0].count, 10),
  };
}

// ==================== Templates ====================

export async function dbSaveTemplate(
  name: string,
  headers: string[],
  mapping: Record<string, string>,
): Promise<number> {
  const sql = getSQL();
  await initDB();
  const result = await sql`
    INSERT INTO templates (name, headers, mapping)
    VALUES (${name}, ${JSON.stringify(headers)}, ${JSON.stringify(mapping)})
    RETURNING id
  ` as Array<{ id: number }>;
  return result[0].id;
}

export async function dbGetAllTemplates(): Promise<Template[]> {
  const sql = getSQL();
  await initDB();
  const rows = await sql`SELECT * FROM templates ORDER BY created_at DESC` as Array<Record<string, unknown>>;
  return rows.map(r => ({
    id: r.id as number,
    name: r.name as string,
    headers: r.headers as string[],
    mapping: r.mapping as Record<string, string>,
    createdAt: r.created_at as string,
  }));
}

export async function dbDeleteTemplate(id: number): Promise<void> {
  const sql = getSQL();
  await initDB();
  await sql`DELETE FROM templates WHERE id = ${id}`;
}

export async function dbUpdateTemplate(
  id: number,
  updates: Partial<Pick<Template, 'name' | 'headers' | 'mapping'>>,
): Promise<void> {
  const sql = getSQL();
  await initDB();
  if (updates.name !== undefined) {
    await sql`UPDATE templates SET name = ${updates.name} WHERE id = ${id}`;
  }
  if (updates.headers !== undefined && updates.mapping !== undefined) {
    await sql`
      UPDATE templates SET headers = ${JSON.stringify(updates.headers)}, mapping = ${JSON.stringify(updates.mapping)}
      WHERE id = ${id}
    `;
  }
}
