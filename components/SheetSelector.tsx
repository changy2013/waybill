'use client';

import type { ParsedResult } from '@/lib/types';

interface SheetSelectorProps {
  sheetNames: string[];
  selectedSheet: string;
  onSelectSheet: (name: string) => void;
  sheetsData: ParsedResult['sheets'];
}

export default function SheetSelector({
  sheetNames,
  selectedSheet,
  onSelectSheet,
  sheetsData,
}: SheetSelectorProps) {
  if (!sheetNames || sheetNames.length <= 1) return null;

  return (
    <div className="card" style={{ marginBottom: '24px' }}>
      <div className="card-header">
        <h3>发现多个工作表 (Sheet)，请选择要导入的数据表</h3>
      </div>
      <div className="card-body">
        <div className="sheet-selector">
          {sheetNames.map((name) => {
            const rowCount = sheetsData[name]?.totalRows || 0;
            return (
              <button
                key={name}
                className={`sheet-tab ${selectedSheet === name ? 'active' : ''}`}
                onClick={() => onSelectSheet(name)}
              >
                {name} <span style={{ opacity: 0.6, fontSize: '12px' }}>({rowCount} 行)</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
