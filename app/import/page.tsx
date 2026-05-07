'use client';
import { useState, useCallback } from 'react';
import StepWizard from '@/components/StepWizard';
import FileUploader from '@/components/FileUploader';
import SheetSelector from '@/components/SheetSelector';
import { parseExcelFile, detectBestSheet, exportToExcel } from '@/lib/excelParser';
import { autoMapFields, applyMapping, getMappingScore, findMatchingTemplate } from '@/lib/fieldMapping';
import { validateAllRows, checkDuplicatesAgainstDB, getValidationSummary, getCellErrors } from '@/lib/validation';
import { saveOrders, saveTemplate, getAllTemplates, getAllRefCodes } from '@/lib/storage';
import { SYSTEM_FIELDS, TEMP_ZONE_OPTIONS } from '@/lib/constants';
import { AlertCircle, AlertTriangle, CheckCircle, ChevronDown, ChevronUp, Save, Download } from 'lucide-react';
import type { ParsedResult, Order, Template, ValidationError, FieldMapping } from '@/lib/types';

const STEPS = ['上传文件', '字段映射', '数据预览', '提交结果'];

interface EditingCell {
  ri: number;
  key: string;
}

interface Toast {
  msg: string;
  type: 'success' | 'error';
}

interface SubmitResult {
  success: boolean;
  count?: number;
  batchId?: string;
  error?: string;
}

export default function ImportPage() {
  const [step, setStep] = useState(0);

  // Step 0
  const [parsedResult, setParsedResult] = useState<ParsedResult | null>(null);
  const [selectedSheet, setSelectedSheet] = useState('');
  const [parseError, setParseError] = useState('');
  const [parsing, setParsing] = useState(false);

  // Step 1
  const [mapping, setMapping] = useState<FieldMapping>({});
  const [templates, setTemplates] = useState<Template[]>([]);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);

  // Step 2
  const [mappedRows, setMappedRows] = useState<Order[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [expandedErrors, setExpandedErrors] = useState(false);

  // Step 3
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<SubmitResult | null>(null);
  const [submitProgress, setSubmitProgress] = useState({ done: 0, total: 0 });

  // Parse progress
  const [parseProgress, setParseProgress] = useState({ pct: 0, rows: 0 });

  // Toast
  const [toast, setToast] = useState<Toast | null>(null);
  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const currentSheet = parsedResult?.sheets[selectedSheet];
  const excelHeaders = currentSheet?.headers || [];

  // ---- Step 0: File upload ----
  const handleFileSelect = useCallback(async (file: File) => {
    setParseError('');
    setParsing(true);
    setParseProgress({ pct: 0, rows: 0 });
    try {
      const result = await parseExcelFile(file, (pct, rows) => {
        setParseProgress({ pct, rows });
      });
      const best = detectBestSheet(result);
      setParsedResult(result);
      setSelectedSheet(best);
    } catch (err) {
      setParseError((err as Error).message);
    } finally {
      setParsing(false);
    }
  }, []);

  const handleSheetSelect = (name: string) => setSelectedSheet(name);

  const goToMapping = async () => {
    const headers = parsedResult!.sheets[selectedSheet]?.headers || [];
    const totalRows = parsedResult!.sheets[selectedSheet]?.totalRows || 0;
    if (headers.length === 0 || totalRows === 0) {
      setParseError('所选 Sheet 中没有有效数据，请检查文件内容是否为空');
      return;
    }
    const autoMap = autoMapFields(headers);

    // Try to find a matching saved template
    const savedTemplates = await getAllTemplates().catch(() => []);
    setTemplates(savedTemplates);
    const matched = findMatchingTemplate(headers, savedTemplates);
    setMapping(matched ? { ...matched.mapping } : autoMap);
    setStep(1);
  };

  // ---- Step 1: Field mapping ----
  const handleMappingChange = (excelHeader: string, systemKey: string) => {
    setMapping(prev => {
      const next = { ...prev };
      // Remove any existing mapping to the same systemKey
      Object.keys(next).forEach(h => {
        if (next[h] === systemKey && h !== excelHeader) delete next[h];
      });
      if (systemKey === '') {
        delete next[excelHeader];
      } else {
        next[excelHeader] = systemKey;
      }
      return next;
    });
  };

  const applyTemplate = (template: Template) => {
    setMapping({ ...template.mapping });
  };

  const handleSaveTemplate = async () => {
    if (!templateName.trim()) return;
    setSavingTemplate(true);
    try {
      await saveTemplate(templateName.trim(), excelHeaders, mapping);
      setShowSaveTemplate(false);
      setTemplateName('');
      showToast('映射方案已保存');
    } catch (err) {
      showToast('保存失败: ' + (err as Error).message, 'error');
    } finally {
      setSavingTemplate(false);
    }
  };

  const goToPreview = async () => {
    const rows = currentSheet?.rows || [];
    const mapped = applyMapping(rows, mapping);

    // Auto-save mapping as template if no existing template matched
    const matched = findMatchingTemplate(excelHeaders, templates);
    if (!matched && Object.keys(mapping).length > 0) {
      const autoName = `自动保存_${excelHeaders.slice(0, 3).join('_')}`;
      saveTemplate(autoName, excelHeaders, mapping).catch(() => {});
    }

    // Fetch existing refCodes for duplicate check
    const existingRefs = await getAllRefCodes().catch(() => []);
    const errors = validateAllRows(mapped);
    const dbErrors = checkDuplicatesAgainstDB(mapped, existingRefs);
    setMappedRows(mapped);
    setValidationErrors([...errors, ...dbErrors]);
    setStep(2);
  };

  // ---- Step 2: Preview & edit ----
  const handleCellEdit = (rowIndex: number, fieldKey: string, value: string) => {
    setMappedRows(prev => {
      const next = [...prev];
      next[rowIndex] = { ...next[rowIndex], [fieldKey]: value };
      // Re-validate with the updated rows immediately (avoid stale closure)
      setValidationErrors(validateAllRows(next));
      return next;
    });
  };

  const handleCellKeyDown = (e: React.KeyboardEvent, rowIndex: number, fieldIndex: number) => {
    if (e.key === 'Tab' || e.key === 'Enter') {
      e.preventDefault();
      const fields = SYSTEM_FIELDS;
      let nextRow = rowIndex;
      let nextField = fieldIndex + 1;
      if (nextField >= fields.length) {
        nextField = 0;
        nextRow = rowIndex + 1;
      }
      if (nextRow < mappedRows.length) {
        setEditingCell({ ri: nextRow, key: fields[nextField].key });
      } else {
        setEditingCell(null);
      }
    } else if (e.key === 'Escape') {
      setEditingCell(null);
    }
  };

  const handleExport = () => {
    const headers = SYSTEM_FIELDS.map(f => f.label);
    const rows = mappedRows.map(row => {
      const r: Record<string, unknown> = {};
      SYSTEM_FIELDS.forEach(f => { r[f.label] = (row as Record<string, unknown>)[f.key] || ''; });
      return r;
    });
    exportToExcel(headers, rows, '运单数据_预览.xlsx');
  };

  const summary = getValidationSummary(validationErrors);

  // ---- Step 3: Submit ----
  const handleSubmit = async () => {
    setSubmitting(true);
    const batchId = `batch_${Date.now()}`;
    const CHUNK = 100;
    setSubmitProgress({ done: 0, total: mappedRows.length });
    try {
      for (let start = 0; start < mappedRows.length; start += CHUNK) {
        const chunk = mappedRows.slice(start, start + CHUNK);
        await saveOrders(chunk, batchId);
        setSubmitProgress({ done: Math.min(start + CHUNK, mappedRows.length), total: mappedRows.length });
      }
      setSubmitResult({ success: true, count: mappedRows.length, batchId });
    } catch (err) {
      setSubmitResult({ success: false, error: (err as Error).message });
    } finally {
      setSubmitting(false);
      setStep(3);
    }
  };

  const resetAll = () => {
    setStep(0);
    setParsedResult(null);
    setSelectedSheet('');
    setParseError('');
    setMapping({});
    setMappedRows([]);
    setValidationErrors([]);
    setSubmitResult(null);
  };

  const mappingScore = getMappingScore(mapping);

  return (
    <div className="page-container">
      <div className="page-header">
        <h2 className="page-title">批量导入</h2>
        <p className="page-subtitle">上传 Excel / CSV 文件，智能识别字段，批量创建运单</p>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 24, right: 24, zIndex: 9999,
          padding: '12px 20px', borderRadius: 8, fontSize: 14, fontWeight: 500,
          background: toast.type === 'error' ? 'var(--error-bg)' : 'var(--success-bg)',
          color: toast.type === 'error' ? '#fca5a5' : 'var(--success)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
        }}>
          {toast.msg}
        </div>
      )}

      <StepWizard steps={STEPS} currentStep={step} />

      {/* Step 0: Upload */}
      {step === 0 && (
        <div className="card">
          <div className="card-body">
            <FileUploader onFileSelect={handleFileSelect} />
            {parsing && (
              <div style={{ marginTop: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>
                  <span>解析中...</span>
                  <span>{parseProgress.rows} 行 · {parseProgress.pct}%</span>
                </div>
                <div style={{ height: 6, background: 'var(--bg-input)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${parseProgress.pct}%`, background: 'var(--accent-primary)', borderRadius: 3, transition: 'width 0.2s' }} />
                </div>
              </div>
            )}
            {parseError && (
              <div className="validation-item error" style={{ marginTop: 16 }}>
                <AlertCircle size={16} /> {parseError}
              </div>
            )}
            {parsedResult && (
              <>
                <SheetSelector
                  sheetNames={parsedResult.sheetNames}
                  selectedSheet={selectedSheet}
                  onSelectSheet={handleSheetSelect}
                  sheetsData={parsedResult.sheets}
                />
                <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div className="validation-item success" style={{ flex: 1 }}>
                    <CheckCircle size={16} />
                    已解析 <strong>{currentSheet?.totalRows || 0}</strong> 行数据，
                    <strong>{excelHeaders.length}</strong> 列
                  </div>
                  <button className="btn btn-primary" onClick={goToMapping}>
                    下一步：字段映射 →
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Step 1: Field mapping */}
      {step === 1 && (
        <div className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3>字段映射</h3>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: mappingScore.isComplete ? 'var(--success)' : 'var(--warning)' }}>
                必填字段 {mappingScore.requiredMapped}/{mappingScore.requiredTotal}
              </span>
              {templates.length > 0 && (
                <select
                  className="input"
                  style={{ width: 'auto', fontSize: 13 }}
                  onChange={e => {
                    const t = templates.find(t => String(t.id) === e.target.value);
                    if (t) applyTemplate(t);
                  }}
                  defaultValue=""
                >
                  <option value="" disabled>应用已保存方案</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              )}
            </div>
          </div>
          <div className="card-body">
            <div className="mapping-grid">
              <div className="mapping-header">Excel 列名</div>
              <div className="mapping-header">映射到系统字段</div>
              {excelHeaders.map(header => (
                <>
                  <div key={`h-${header}`} className="mapping-excel-col">{header}</div>
                  <div key={`s-${header}`}>
                    <select
                      className="input"
                      value={mapping[header] || ''}
                      onChange={e => handleMappingChange(header, e.target.value)}
                    >
                      <option value="">— 不导入 —</option>
                      {SYSTEM_FIELDS.map(f => (
                        <option key={f.key} value={f.key}>
                          {f.label}{f.required ? ' *' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              ))}
            </div>

            {/* Save template */}
            <div style={{ marginTop: 16 }}>
              {!showSaveTemplate ? (
                <button className="btn btn-secondary" onClick={() => setShowSaveTemplate(true)}>
                  <Save size={14} /> 保存为映射方案
                </button>
              ) : (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    className="input"
                    style={{ flex: 1 }}
                    placeholder="方案名称（如：客户A模板）"
                    value={templateName}
                    onChange={e => setTemplateName(e.target.value)}
                  />
                  <button className="btn btn-primary" onClick={handleSaveTemplate} disabled={savingTemplate}>
                    {savingTemplate ? '保存中...' : '保存'}
                  </button>
                  <button className="btn btn-secondary" onClick={() => setShowSaveTemplate(false)}>取消</button>
                </div>
              )}
            </div>

            <div style={{ marginTop: 24, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setStep(0)}>← 返回</button>
              <button
                className="btn btn-primary"
                onClick={goToPreview}
                disabled={!mappingScore.isComplete}
                title={!mappingScore.isComplete ? '请先完成所有必填字段的映射' : ''}
              >
                下一步：数据预览 →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Preview & validate */}
      {step === 2 && (
        <div>
          {/* Validation summary */}
          {validationErrors.length > 0 && (
            <div className="card" style={{ marginBottom: 16 }}>
              <div
                className="card-header"
                style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}
                onClick={() => setExpandedErrors(v => !v)}
              >
                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                  {summary.errorCount > 0 && (
                    <span style={{ color: 'var(--error)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <AlertCircle size={16} /> {summary.errorCount} 个错误
                    </span>
                  )}
                  {summary.warningCount > 0 && (
                    <span style={{ color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <AlertTriangle size={16} /> {summary.warningCount} 个警告
                    </span>
                  )}
                </div>
                {expandedErrors ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>
              {expandedErrors && (
                <div className="card-body" style={{ maxHeight: 240, overflowY: 'auto' }}>
                  {validationErrors.map((e, i) => (
                    <div key={i} className={`validation-item ${e.level}`}>
                      第 {e.row} 行 · {e.fieldLabel}：{e.message}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Data table */}
          <div className="card">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <h3>数据预览（共 {mappedRows.length} 条）</h3>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>点击单元格可编辑</span>
                <button className="btn btn-secondary" onClick={handleExport} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Download size={14} /> 导出 xlsx
                </button>
              </div>
            </div>
            <div className="card-body" style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '60vh' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    {SYSTEM_FIELDS.map(f => (
                      <th key={f.key}>{f.label}{f.required ? ' *' : ''}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {mappedRows.map((row, ri) => (
                    <tr key={ri}>
                      <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{ri + 1}</td>
                      {SYSTEM_FIELDS.map((f, fi) => {
                        const cellErrors = getCellErrors(validationErrors, ri, f.key);
                        const hasError = cellErrors.some(e => e.level === 'error');
                        const hasWarning = cellErrors.some(e => e.level === 'warning');
                        const isEditing = editingCell?.ri === ri && editingCell?.key === f.key;

                        return (
                          <td
                            key={f.key}
                            className={hasError ? 'cell-error' : hasWarning ? 'cell-warning' : ''}
                            title={cellErrors.map(e => e.message).join('\n')}
                            onClick={() => setEditingCell({ ri, key: f.key })}
                          >
                            {isEditing ? (
                              f.key === 'tempZone' ? (
                                <select
                                  className="input"
                                  style={{ minWidth: 80 }}
                                  value={(row as Record<string, unknown>)[f.key] as string || ''}
                                  autoFocus
                                  onChange={e => handleCellEdit(ri, f.key, e.target.value)}
                                  onBlur={() => setEditingCell(null)}
                                  onKeyDown={e => handleCellKeyDown(e, ri, fi)}
                                >
                                  <option value="">—</option>
                                  {TEMP_ZONE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                                </select>
                              ) : (
                                <input
                                  className="input"
                                  style={{ minWidth: 100 }}
                                  value={(row as Record<string, unknown>)[f.key] as string || ''}
                                  autoFocus
                                  onChange={e => handleCellEdit(ri, f.key, e.target.value)}
                                  onBlur={() => setEditingCell(null)}
                                  onKeyDown={e => handleCellKeyDown(e, ri, fi)}
                                />
                              )
                            ) : (
                              <span>{(row as Record<string, unknown>)[f.key] as string || <span style={{ opacity: 0.3 }}>—</span>}</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ marginTop: 16, display: 'flex', gap: 8, justifyContent: 'flex-end', flexDirection: 'column', alignItems: 'flex-end' }}>
            {submitting && (
              <div style={{ width: '100%', marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>
                  <span>提交中...</span>
                  <span>{submitProgress.done} / {submitProgress.total} 条 · {submitProgress.total > 0 ? Math.round(submitProgress.done / submitProgress.total * 100) : 0}%</span>
                </div>
                <div style={{ height: 6, background: 'var(--bg-input)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${submitProgress.total > 0 ? Math.round(submitProgress.done / submitProgress.total * 100) : 0}%`, background: 'var(--accent-primary)', borderRadius: 3, transition: 'width 0.3s' }} />
                </div>
              </div>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-secondary" onClick={() => setStep(1)}>← 返回</button>
              <button
                className="btn btn-primary"
                onClick={handleSubmit}
                disabled={summary.hasErrors || submitting}
                title={summary.hasErrors ? '请先修正所有错误' : ''}
              >
                {submitting ? '提交中...' : `确认提交 ${mappedRows.length} 条运单`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Result */}
      {step === 3 && submitResult && (
        <div className="card">
          <div className="card-body" style={{ textAlign: 'center', padding: '48px 24px' }}>
            {submitResult.success ? (
              <>
                <div style={{ fontSize: 64, marginBottom: 16 }}>✅</div>
                <h3 style={{ fontSize: 24, marginBottom: 8 }}>提交成功</h3>
                <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>
                  已成功创建 <strong>{submitResult.count}</strong> 条运单，批次号：{submitResult.batchId}
                </p>
              </>
            ) : (
              <>
                <div style={{ fontSize: 64, marginBottom: 16 }}>❌</div>
                <h3 style={{ fontSize: 24, marginBottom: 8 }}>提交失败</h3>
                <p style={{ color: 'var(--error)', marginBottom: 24 }}>{submitResult.error}</p>
              </>
            )}
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button className="btn btn-secondary" onClick={resetAll}>继续导入</button>
              <a href="/history" className="btn btn-primary">查看运单记录</a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
