'use client';
import { useEffect, useState, useCallback } from 'react';
import { getOrdersPaginated } from '@/lib/storage';
import { SYSTEM_FIELDS } from '@/lib/constants';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Order, OrderFilters } from '@/lib/types';

const PAGE_SIZE = 10;

export default function HistoryPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const emptyFilters: OrderFilters = { refCode: '', receiverName: '', dateFrom: '', dateTo: '' };
  const [filters, setFilters] = useState<OrderFilters>(emptyFilters);
  const [pendingFilters, setPendingFilters] = useState<OrderFilters>(emptyFilters);

  const load = useCallback(async (p: number, f: OrderFilters) => {
    setLoading(true);
    try {
      const result = await getOrdersPaginated(p, PAGE_SIZE, f);
      setOrders(result.data);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(page, filters); }, [page, filters, load]);

  const handleSearch = () => {
    setFilters({ ...pendingFilters });
    setPage(1);
  };

  const handleReset = () => {
    setPendingFilters(emptyFilters);
    setFilters(emptyFilters);
    setPage(1);
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h2 className="page-title">运单记录</h2>
        <p className="page-subtitle">查询历史运单，共 {total} 条</p>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            <input
              className="input"
              placeholder="外部编码"
              value={pendingFilters.refCode}
              onChange={e => setPendingFilters(p => ({ ...p, refCode: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
            />
            <input
              className="input"
              placeholder="收件人姓名"
              value={pendingFilters.receiverName}
              onChange={e => setPendingFilters(p => ({ ...p, receiverName: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
            />
            <input
              className="input"
              type="date"
              placeholder="开始日期"
              value={pendingFilters.dateFrom}
              onChange={e => setPendingFilters(p => ({ ...p, dateFrom: e.target.value }))}
            />
            <input
              className="input"
              type="date"
              placeholder="结束日期"
              value={pendingFilters.dateTo}
              onChange={e => setPendingFilters(p => ({ ...p, dateTo: e.target.value }))}
            />
          </div>
          <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" onClick={handleSearch}>
              <Search size={14} /> 搜索
            </button>
            <button className="btn btn-secondary" onClick={handleReset}>重置</button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="card-body" style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '65vh' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-secondary)' }}>加载中...</div>
          ) : orders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-secondary)' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
              <p>暂无运单记录</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  {SYSTEM_FIELDS.map(f => <th key={f.key}>{f.label}</th>)}
                  <th>批次号</th>
                  <th>创建时间</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(order => (
                  <tr key={order.id}>
                    <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{order.id}</td>
                    {SYSTEM_FIELDS.map(f => (
                      <td key={f.key}>{(order as Record<string, unknown>)[f.key] as string ?? <span style={{ opacity: 0.3 }}>—</span>}</td>
                    ))}
                    <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{order.batchId}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                      {new Date(order.createdAt!).toLocaleString('zh-CN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)' }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              第 {page} / {totalPages} 页，共 {total} 条
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="btn btn-secondary"
                style={{ padding: '6px 10px' }}
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
              >
                <ChevronLeft size={16} />
              </button>
              <button
                className="btn btn-secondary"
                style={{ padding: '6px 10px' }}
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
