export type AppMode = 'generate' | 'calibrate';

export type FieldKey = 'date' | 'payee' | 'amountWords' | 'numericAmount';
export type SelectableItem = FieldKey | 'stamp';
export type CheckOrientation = 'landscape' | 'portrait';

export interface StampConfig {
  text?: string;
  x: number; // mm from left edge
  y: number; // mm from top edge
  angle: number; // degrees
  width: number; // mm width of parallel lines
}

export interface FieldLayout {
  id?: string;
  templateId?: string;
  key: FieldKey;
  label: string;
  x: number; // mm from left
  y: number; // mm from top
  fontSize: number; // pt
  digitGap?: number | null; // mm gap between date digit cells
  sortOrder?: number;
  value?: string;
}

export type FieldConfig = FieldLayout;

export interface CheckTemplate {
  id: string;
  bankName: string;
  name?: string; // alias for bankName
  branchName: string;
  width: number; // width in mm
  height: number; // height in mm
  orientation: CheckOrientation;
  inverted: boolean; // 180-degree physical feed inversion
  payeeAccountOnly?: boolean;
  stampConfig?: StampConfig;
  printerOffsetXmm: number; // hardware printer shift X in mm
  printerOffsetYmm: number; // hardware printer shift Y in mm
  fields: Record<FieldKey, FieldLayout>;
  createdAt?: string;
  updatedAt?: string;
}

export interface TransactionData {
  payee: string;
  numericAmount: string;
  amountWords: string;
  date: string; // 8 digits DDMMYYYY
  isSelf: boolean;
  isPayeeAccountOnly: boolean;
  numberingSystem: 'lakh' | 'million';
}

export interface PrintOptions {
  widthMm?: number;
  heightMm?: number;
  orientation?: CheckOrientation;
  inverted?: boolean;
  printerOffsetXmm?: number;
  printerOffsetYmm?: number;
  silent?: boolean;
}

export interface PrintResult {
  success: boolean;
  failureReason?: string;
}

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

// Database Row Mappings for Supabase PostgreSQL
export interface CheckTemplateRow {
  id: string;
  bank_name: string;
  branch_name: string;
  width_mm: number;
  height_mm: number;
  orientation?: CheckOrientation;
  inverted?: boolean;
  payee_account_only: boolean;
  stamp_config: StampConfig | null;
  printer_offset_x_mm: number;
  printer_offset_y_mm: number;
  created_at: string;
  updated_at: string;
  check_fields?: CheckFieldRow[];
}

export interface CheckFieldRow {
  id: string;
  template_id: string;
  field_key: string;
  label: string;
  x_mm: number;
  y_mm: number;
  font_size_pt: number;
  digit_gap_mm: number | null;
  sort_order: number;
}
