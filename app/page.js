'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Upload, FileSpreadsheet, History, Package, TrendingUp, Layers } from 'lucide-react';

export default function HomePage() {
  const [stats, setStats] = useState({ totalOrders: 0, todayOrders: 0, totalBatches: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/stats')
      .then(r => r.json())
      .then(data => setStats(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page-container">
      <div className="page-header">
        <h2 className="page-title">工作台</h2>
        <p className="page-subtitle">物流智能批量下单系统</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
            <Package size={22} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{loading ? '—' : stats.totalOrders.toLocaleString()}</div>
            <div className="stat-label">累计运单</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
            <TrendingUp size={22} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{loading ? '—' : stats.todayOrders.toLocaleString()}</div>
            <div className="stat-label">今日新增</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
            <Layers size={22} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{loading ? '—' : stats.totalBatches.toLocaleString()}</div>
            <div className="stat-label">批次总数</div>
          </div>
        </div>
      </div>

      <h3 className="section-title">快捷入口</h3>
      <div className="quick-actions">
        <Link href="/import" className="action-card">
          <div className="action-icon">
            <Upload size={28} />
          </div>
          <div className="action-content">
            <div className="action-title">批量导入</div>
            <div className="action-desc">上传 Excel / CSV，智能识别字段，批量创建运单</div>
          </div>
          <div className="action-arrow">→</div>
        </Link>
        <Link href="/templates" className="action-card">
          <div className="action-icon" style={{ background: 'linear-gradient(135deg, #8b5cf6, #a855f7)' }}>
            <FileSpreadsheet size={28} />
          </div>
          <div className="action-content">
            <div className="action-title">映射方案</div>
            <div className="action-desc">管理已保存的字段映射模板，快速复用</div>
          </div>
          <div className="action-arrow">→</div>
        </Link>
        <Link href="/history" className="action-card">
          <div className="action-icon" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
            <History size={28} />
          </div>
          <div className="action-content">
            <div className="action-title">运单记录</div>
            <div className="action-desc">查询历史运单，支持按编码、收件人、日期筛选</div>
          </div>
          <div className="action-arrow">→</div>
        </Link>
      </div>
    </div>
  );
}
