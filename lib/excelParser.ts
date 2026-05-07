import * as XLSX from 'xlsx';
import type { ParsedResult, ParsedSheet } from './types';

/**
 * Parse an Excel file and return structured data
 * Handles: merged cells, multi-sheet, header detection, empty rows
 */
export function parseExcelFile(
  file: File,
  onProgress?: (pct: number, rows: number) => void,
): Promise<ParsedResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });

        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          reject(new Error('Excel 文件中没有找到任何 Sheet'));
          return;
        }

        const result: ParsedResult = {
          sheetNames: workbook.SheetNames,
          sheets: {},
        };

        workbook.SheetNames.forEach((name) => {
          const ws = workbook.Sheets[name];
          if (!ws['!ref']) {
            result.sheets[name] = { headers: [], rows: [], headerRowIndex: -1, totalRows: 0 };
            return;
          }

          // Handle merged cells
          if (ws['!merges']) {
            ws['!merges'].forEach(merge => {
              const mainCell = XLSX.utils.encode_cell(merge.s);
              const mainVal = ws[mainCell] ? ws[mainCell].v : '';
              for (let r = merge.s.r; r <= merge.e.r; r++) {
                for (let c = merge.s.c; c <= merge.e.c; c++) {
                  const cell = XLSX.utils.encode_cell({ r, c });
                  if (cell !== mainCell) {
                    ws[cell] = { v: mainVal, t: 's' };
                  }
                }
              }
            });
          }

          const rawData = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as unknown[][];
          const { headerRowIndex, headers } = detectHeaderRow(rawData);

          const dataRows: Record<string, unknown>[] = [];
          if (headerRowIndex >= 0) {
            for (let i = headerRowIndex + 1; i < rawData.length; i++) {
              const row = rawData[i];
              const hasData = row.some(cell => cell !== '' && cell !== null && cell !== undefined);
              if (hasData) {
                const rowObj: Record<string, unknown> = {};
                headers.forEach((h, ci) => {
                  rowObj[h] = row[ci] !== undefined ? row[ci] : '';
                });
                dataRows.push(rowObj);
              }
              if (onProgress) {
                onProgress(
                  Math.round(((i - headerRowIndex) / (rawData.length - headerRowIndex)) * 100),
                  dataRows.length,
                );
              }
            }
          }

          result.sheets[name] = {
            headers,
            rows: dataRows,
            headerRowIndex,
            totalRows: dataRows.length,
          };
        });

        resolve(result);
      } catch (err) {
        reject(new Error(`文件解析失败: ${(err as Error).message}`));
      }
    };
    reader.onerror = () => reject(new Error('文件读取失败，请检查文件是否损坏'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Detect the header row by finding the row with the most non-empty string cells
 * Skips merged title rows, instruction rows, and empty rows
 */
function detectHeaderRow(rawData: unknown[][]): { headerRowIndex: number; headers: string[] } {
  let bestRowIndex = 0;
  let bestScore = 0;

  for (let i = 0; i < Math.min(rawData.length, 10); i++) {
    const row = rawData[i];
    if (!row || row.length === 0) continue;

    const nonEmpty = row.filter(c => c !== '' && c !== null && c !== undefined);
    const stringCells = nonEmpty.filter(c => typeof c === 'string');
    // Score: prefer rows with many distinct non-empty string cells
    const uniqueStrings = new Set(stringCells.map(s => String(s).trim().toLowerCase()));
    const score = uniqueStrings.size * 2 + nonEmpty.length;

    if (score > bestScore && uniqueStrings.size >= 3) {
      bestScore = score;
      bestRowIndex = i;
    }
  }

  const headers = (rawData[bestRowIndex] || []).map((h, i) => {
    const val = String(h || '').trim();
    return val || `列${i + 1}`;
  });

  return { headerRowIndex: bestRowIndex, headers };
}

/**
 * Auto-detect the best sheet for data import
 * Picks the sheet with the most data rows and columns
 */
export function detectBestSheet(parsedResult: ParsedResult): string {
  let bestSheet = parsedResult.sheetNames[0];
  let bestScore = 0;

  parsedResult.sheetNames.forEach(name => {
    const sheet: ParsedSheet = parsedResult.sheets[name];
    const score = sheet.totalRows * 10 + sheet.headers.length;
    if (score > bestScore) {
      bestScore = score;
      bestSheet = name;
    }
  });

  return bestSheet;
}

/**
 * Export data rows to an Excel file and trigger download
 */
export function exportToExcel(
  headers: string[],
  rows: Record<string, unknown>[],
  filename = '运单数据.xlsx',
): void {
  const wsData: unknown[][] = [headers];
  rows.forEach(row => {
    wsData.push(headers.map(h => row[h] || ''));
  });

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '运单数据');
  XLSX.writeFile(wb, filename);
}
