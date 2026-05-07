import { SYSTEM_FIELDS, TEMP_ZONE_OPTIONS } from './constants';

/**
 * Validate all rows at once — returns ALL errors grouped by row
 * Each error: { row, field, fieldLabel, message, level: 'error'|'warning' }
 */
export function validateAllRows(rows) {
  const errors = [];
  const refCodeMap = new Map(); // track duplicates within batch

  rows.forEach((row, index) => {
    const rowNum = row._rowIndex || index + 1;

    // Required field checks
    SYSTEM_FIELDS.forEach(field => {
      if (field.required) {
        const val = String(row[field.key] || '').trim();
        if (!val) {
          errors.push({
            row: rowNum,
            dataIndex: index,
            field: field.key,
            fieldLabel: field.label,
            message: `${field.label} 不能为空`,
            level: 'error',
          });
        }
      }
    });

    // Phone format: 11-digit mobile or landline
    ['senderPhone', 'receiverPhone'].forEach(phoneField => {
      const val = String(row[phoneField] || '').trim();
      if (val && !/^1[3-9]\d{9}$/.test(val) && !/^0\d{2,3}-?\d{7,8}$/.test(val)) {
        const label = SYSTEM_FIELDS.find(f => f.key === phoneField)?.label;
        errors.push({
          row: rowNum, dataIndex: index, field: phoneField, fieldLabel: label,
          message: `${label} 格式错误（需11位手机号或座机格式）`,
          level: 'error',
        });
      }
    });

    // Weight: positive number
    const weight = row.weight;
    if (weight !== '' && weight !== undefined) {
      const w = Number(weight);
      if (isNaN(w) || w <= 0 || w > 999) {
        errors.push({
          row: rowNum, dataIndex: index, field: 'weight', fieldLabel: '重量(kg)',
          message: '重量必须为 0.01 ~ 999 之间的正数',
          level: 'error',
        });
      }
    }

    // Quantity: positive integer
    const qty = row.itemQuantity;
    if (qty !== '' && qty !== undefined) {
      const q = Number(qty);
      if (!Number.isInteger(q) || q <= 0) {
        errors.push({
          row: rowNum, dataIndex: index, field: 'itemQuantity', fieldLabel: '件数',
          message: '件数必须为正整数',
          level: 'error',
        });
      }
    }

    // Temp zone: must be one of the allowed values
    const tz = String(row.tempZone || '').trim();
    if (tz && !TEMP_ZONE_OPTIONS.includes(tz)) {
      errors.push({
        row: rowNum, dataIndex: index, field: 'tempZone', fieldLabel: '温层',
        message: `温层值无效，需为：${TEMP_ZONE_OPTIONS.join(' / ')}`,
        level: 'error',
      });
    }

    // Address completeness warning
    ['senderAddress', 'receiverAddress'].forEach(addrField => {
      const val = String(row[addrField] || '').trim();
      if (val && val.length < 8) {
        const label = SYSTEM_FIELDS.find(f => f.key === addrField)?.label;
        errors.push({
          row: rowNum, dataIndex: index, field: addrField, fieldLabel: label,
          message: `${label} 可能不完整（建议包含省市区）`,
          level: 'warning',
        });
      }
    });

    // Duplicate refCode detection (within batch)
    const ref = String(row.refCode || '').trim();
    if (ref) {
      if (refCodeMap.has(ref)) {
        errors.push({
          row: rowNum, dataIndex: index, field: 'refCode', fieldLabel: '外部编码',
          message: `外部编码 "${ref}" 与第 ${refCodeMap.get(ref)} 行重复`,
          level: 'warning',
        });
      } else {
        refCodeMap.set(ref, rowNum);
      }
    }
  });

  return errors;
}

/**
 * Check for duplicate refCodes against existing database records
 */
export function checkDuplicatesAgainstDB(rows, existingRefCodes) {
  const errors = [];
  const existingSet = new Set(existingRefCodes.map(r => String(r).trim()));

  rows.forEach((row, index) => {
    const ref = String(row.refCode || '').trim();
    if (ref && existingSet.has(ref)) {
      errors.push({
        row: row._rowIndex || index + 1,
        dataIndex: index,
        field: 'refCode',
        fieldLabel: '外部编码',
        message: `外部编码 "${ref}" 已存在于历史记录中`,
        level: 'warning',
      });
    }
  });

  return errors;
}

/**
 * Get error/warning counts summary
 */
export function getValidationSummary(errors) {
  const errorCount = errors.filter(e => e.level === 'error').length;
  const warningCount = errors.filter(e => e.level === 'warning').length;
  const errorRows = new Set(errors.filter(e => e.level === 'error').map(e => e.dataIndex));
  return { errorCount, warningCount, errorRowCount: errorRows.size, hasErrors: errorCount > 0 };
}

/**
 * Get errors for a specific cell
 */
export function getCellErrors(errors, dataIndex, fieldKey) {
  return errors.filter(e => e.dataIndex === dataIndex && e.field === fieldKey);
}
