'use client';
import { useEffect, useState } from 'react';
import { getAllTemplates, deleteTemplate, updateTemplate } from '@/lib/storage';
import { SYSTEM_FIELDS } from '@/lib/constants';
import { Trash2, Edit2, Check, X } from 'lucide-react';
import type { Template } from '@/lib/types';

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const data = await getAllTemplates();
      setTemplates(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id: number) => {
    if (!confirm('确认删除该映射方案？')) return;
    await deleteTemplate(id);
    setTemplates(prev => prev.filter(t => t.id !== id));
  };

  const handleRename = async (id: number) => {
    if (!editName.trim()) return;
    await updateTemplate(id, { name: editName.trim() });
    setTemplates(prev => prev.map(t => t.id === id ? { ...t, name: editName.trim() } : t));
    setEditingId(null);
  };

  const fieldLabel = (key: string) => SYSTEM_FIELDS.find(f => f.key === key)?.label || key;

  return (
    <div className="page-container">
      <div className="page-header">
        <h2 className="page-title">映射方案</h2>
        <p className="page-subtitle">管理已保存的字段映射模板，在批量导入时可快速复用</p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-secondary)' }}>加载中...</div>
      ) : templates.length === 0 ? (
        <div className="card">
          <div className="card-body" style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--text-secondary)' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
            <p>暂无保存的映射方案</p>
            <p style={{ fontSize: 13, marginTop: 8 }}>在批量导入时完成字段映射后，可保存为方案供下次复用</p>
            <a href="/import" className="btn btn-primary" style={{ marginTop: 16, display: 'inline-block' }}>
              去导入
            </a>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {templates.map(t => (
            <div key={t.id} className="card">
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {editingId === t.id ? (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flex: 1 }}>
                    <input
                      className="input"
                      style={{ flex: 1, maxWidth: 300 }}
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleRename(t.id)}
                      autoFocus
                    />
                    <button className="btn btn-primary" style={{ padding: '6px 10px' }} onClick={() => handleRename(t.id)}>
                      <Check size={14} />
                    </button>
                    <button className="btn btn-secondary" style={{ padding: '6px 10px' }} onClick={() => setEditingId(null)}>
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <h3 style={{ margin: 0 }}>{t.name}</h3>
                )}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className="btn btn-secondary"
                    style={{ padding: '6px 10px' }}
                    onClick={() => { setEditingId(t.id); setEditName(t.name); }}
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    className="btn btn-secondary"
                    style={{ padding: '6px 10px', color: 'var(--error)' }}
                    onClick={() => handleDelete(t.id)}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <div className="card-body">
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12 }}>
                  创建于 {new Date(t.createdAt).toLocaleString('zh-CN')} · {Object.keys(t.mapping).length} 个字段映射
                </p>
                <div className="mapping-grid" style={{ fontSize: 13 }}>
                  <div className="mapping-header">Excel 列名</div>
                  <div className="mapping-header">系统字段</div>
                  {Object.entries(t.mapping).map(([excelCol, sysKey]) => (
                    <>
                      <div key={`e-${excelCol}`} className="mapping-excel-col">{excelCol}</div>
                      <div key={`s-${excelCol}`} style={{ color: 'var(--primary)' }}>{fieldLabel(sysKey)}</div>
                    </>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
