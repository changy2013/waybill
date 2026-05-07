// Client-side storage layer — delegates to API routes backed by PostgreSQL
import type { Order, Template, PaginatedResult, OrderFilters, OrderStats } from './types';

// ==================== Orders ====================

export async function saveOrders(orders: Order[], batchId: string): Promise<{ success: boolean; count: number }> {
  const res = await fetch('/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orders, batchId }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || '保存订单失败');
  }
  return res.json();
}

export async function getOrdersPaginated(
  page = 1,
  pageSize = 20,
  filters: OrderFilters = {},
): Promise<PaginatedResult> {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (filters.refCode) params.set('refCode', filters.refCode);
  if (filters.receiverName) params.set('receiverName', filters.receiverName);
  if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
  if (filters.dateTo) params.set('dateTo', filters.dateTo);

  const res = await fetch(`/api/orders?${params}`);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || '获取订单失败');
  }
  return res.json();
}

export async function getAllRefCodes(): Promise<string[]> {
  const res = await fetch('/api/refcodes');
  if (!res.ok) return [];
  return res.json();
}

export async function getOrderStats(): Promise<OrderStats> {
  const res = await fetch('/api/stats');
  if (!res.ok) return { totalOrders: 0, todayOrders: 0, totalBatches: 0 };
  return res.json();
}

// ==================== Templates ====================

export async function saveTemplate(
  name: string,
  headers: string[],
  mapping: Record<string, string>,
): Promise<{ success: boolean; id: number }> {
  const res = await fetch('/api/templates', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, headers, mapping }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || '保存模板失败');
  }
  return res.json();
}

export async function getAllTemplates(): Promise<Template[]> {
  const res = await fetch('/api/templates');
  if (!res.ok) return [];
  return res.json();
}

export async function deleteTemplate(id: number): Promise<void> {
  const res = await fetch(`/api/templates/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || '删除模板失败');
  }
}

export async function updateTemplate(
  id: number,
  updates: Partial<Pick<Template, 'name' | 'headers' | 'mapping'>>,
): Promise<void> {
  const res = await fetch(`/api/templates/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || '更新模板失败');
  }
}
