import { supabase, isSupabaseConfigured } from './supabase';
import type { CheckTemplate, FieldKey } from '../types';

const STORAGE_KEY = 'local-check-templates-cache';

function getLocalCache(): CheckTemplate[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalCache(templates: CheckTemplate[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
  } catch {
    // ignore quota/private mode errors
  }
}

export async function loadTemplatesFromSupabase(): Promise<CheckTemplate[]> {
  if (!isSupabaseConfigured) {
    console.warn('Supabase not configured or credentials missing. Loading from local cache.');
    return getLocalCache();
  }

  const { data: templates, error: tError } = await supabase
    .from('check_templates')
    .select('*')
    .order('created_at', { ascending: true });

  if (tError) {
    console.error('Supabase load templates error:', tError.message);
    return getLocalCache();
  }

  if (!templates || templates.length === 0) {
    saveLocalCache([]);
    return [];
  }

  const { data: fields, error: fError } = await supabase.from('check_fields').select('*');
  if (fError) {
    console.error('Supabase load fields error:', fError.message);
  }

  const loaded: CheckTemplate[] = templates.map((t) => {
    const templateFields = (fields || []).filter((f) => f.template_id === t.id);
    const fieldsMap: CheckTemplate['fields'] = {
      date: { key: 'date', label: 'Date', x: 124, y: 15, fontSize: 20, value: '', digitGap: 2.8, sortOrder: 1 },
      payee: { key: 'payee', label: 'Payee Name', x: 22, y: 24, fontSize: 11, value: '', sortOrder: 2 },
      amountWords: { key: 'amountWords', label: 'Amount in Words', x: 22, y: 32, fontSize: 10, value: '', sortOrder: 3 },
      numericAmount: { key: 'numericAmount', label: 'Numeric Amount', x: 133.5, y: 31, fontSize: 12, value: '', sortOrder: 4 },
    };

    templateFields.forEach((f) => {
      const k = f.field_key as FieldKey;
      if (fieldsMap[k]) {
        fieldsMap[k] = {
          ...fieldsMap[k],
          key: k,
          label: f.label,
          x: Number(f.x_mm),
          y: Number(f.y_mm),
          fontSize: Number(f.font_size_pt),
          digitGap: f.digit_gap_mm ? Number(f.digit_gap_mm) : undefined,
          sortOrder: Number(f.sort_order || 1),
        };
      }
    });

    return {
      id: t.id,
      bankName: t.bank_name,
      name: t.bank_name,
      branchName: t.branch_name || 'Main Branch',
      width: Number(t.width_mm),
      height: Number(t.height_mm),
      orientation: t.orientation || 'landscape',
      inverted: Boolean(t.inverted),
      payeeAccountOnly: Boolean(t.payee_account_only),
      stampConfig: t.stamp_config || { text: "PAYEE'S ACCOUNT ONLY", x: 0, y: 7, angle: -24, width: 30 },
      printerOffsetXmm: Number(t.printer_offset_x_mm || 0),
      printerOffsetYmm: Number(t.printer_offset_y_mm || 0),
      fields: fieldsMap,
    };
  });

  saveLocalCache(loaded);
  return loaded;
}

export async function saveTemplateToSupabase(template: CheckTemplate): Promise<CheckTemplate> {
  // Update local mirror cache first
  const localCache = getLocalCache();
  const updatedCache = localCache.some((item) => item.id === template.id)
    ? localCache.map((item) => (item.id === template.id ? template : item))
    : [...localCache, template];
  saveLocalCache(updatedCache);

  if (!isSupabaseConfigured) {
    return template; // Offline / unconfigured mode
  }

  const { error: tError } = await supabase
    .from('check_templates')
    .upsert({
      id: template.id,
      bank_name: template.bankName || template.name,
      branch_name: template.branchName || 'Main Branch',
      width_mm: template.width,
      height_mm: template.height,
      orientation: template.orientation || 'landscape',
      inverted: Boolean(template.inverted),
      payee_account_only: Boolean(template.payeeAccountOnly),
      stamp_config: template.stampConfig,
      printer_offset_x_mm: template.printerOffsetXmm || 0,
      printer_offset_y_mm: template.printerOffsetYmm || 0,
      updated_at: new Date().toISOString(),
    });

  if (tError) throw tError;

  for (const [key, field] of Object.entries(template.fields)) {
    if (!field) continue;
    const { error: fError } = await supabase.from('check_fields').upsert(
      {
        template_id: template.id,
        field_key: key,
        label: field.label,
        x_mm: field.x,
        y_mm: field.y,
        font_size_pt: field.fontSize,
        digit_gap_mm: field.digitGap ?? null,
        sort_order: field.sortOrder ?? 1,
      },
      { onConflict: 'template_id,field_key' }
    );

    if (fError) throw fError;
  }

  return template;
}

export async function createTemplateInSupabase(input: {
  bankName: string;
  branchName: string;
  width: number;
  height: number;
  orientation?: 'landscape' | 'portrait';
  inverted?: boolean;
  fields?: CheckTemplate['fields'];
}): Promise<CheckTemplate> {
  const newId = crypto.randomUUID();
  const defaultFields: CheckTemplate['fields'] = input.fields || {
    date: { key: 'date', label: 'Date', x: 124, y: 15, fontSize: 20, value: '', digitGap: 2.8, sortOrder: 1 },
    payee: { key: 'payee', label: 'Payee Name', x: 22, y: 24, fontSize: 11, value: '', sortOrder: 2 },
    amountWords: { key: 'amountWords', label: 'Amount in Words', x: 22, y: 32, fontSize: 10, value: '', sortOrder: 3 },
    numericAmount: { key: 'numericAmount', label: 'Numeric Amount', x: 133.5, y: 31, fontSize: 12, value: '', sortOrder: 4 },
  };

  const created: CheckTemplate = {
    id: newId,
    bankName: input.bankName,
    name: input.bankName,
    branchName: input.branchName,
    width: input.width,
    height: input.height,
    orientation: input.orientation || 'landscape',
    inverted: Boolean(input.inverted),
    payeeAccountOnly: true,
    stampConfig: { text: "PAYEE'S ACCOUNT ONLY", x: 0, y: 7, angle: -24, width: 30 },
    printerOffsetXmm: 0,
    printerOffsetYmm: 0,
    fields: defaultFields,
  };

  return await saveTemplateToSupabase(created);
}