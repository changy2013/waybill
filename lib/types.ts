// Shared type definitions for the waybill project

export interface SystemField {
  key: string;
  label: string;
  required: boolean;
  description: string;
}

export interface Order {
  id?: number;
  batchId?: string;
  refCode?: string;
  senderName?: string;
  senderPhone?: string;
  senderAddress?: string;
  receiverName?: string;
  receiverPhone?: string;
  receiverAddress?: string;
  weight?: number | string;
  itemQuantity?: number | string;
  tempZone?: string;
  remark?: string;
  status?: string;
  createdAt?: string;
  _rowIndex?: number;
  [key: string]: unknown;
}

export interface Template {
  id: number;
  name: string;
  headers: string[];
  mapping: Record<string, string>;
  createdAt: string;
}

export interface ValidationError {
  row: number;
  dataIndex: number;
  field: string;
  fieldLabel: string;
  message: string;
  level: 'error' | 'warning';
}

export interface ValidationSummary {
  errorCount: number;
  warningCount: number;
  errorRowCount: number;
  hasErrors: boolean;
}

export interface ParsedSheet {
  headers: string[];
  rows: Record<string, unknown>[];
  headerRowIndex: number;
  totalRows: number;
}

export interface ParsedResult {
  sheetNames: string[];
  sheets: Record<string, ParsedSheet>;
}

export interface OrderFilters {
  refCode?: string;
  receiverName?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface PaginatedResult {
  data: Order[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface OrderStats {
  totalOrders: number;
  todayOrders: number;
  totalBatches: number;
}

export interface MappingScore {
  total: number;
  mapped: number;
  requiredTotal: number;
  requiredMapped: number;
  isComplete: boolean;
  percentage: number;
}

export interface FieldMapping {
  [excelHeader: string]: string;
}
