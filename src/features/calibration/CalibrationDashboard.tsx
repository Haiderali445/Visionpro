import React, { useState, useCallback, useEffect } from 'react';
import {
  ChevronUp,
  ChevronDown,
  Save,
  Printer,
  Loader2,
  Calendar,
  User,
  AlignLeft,
  Hash,
  ShieldCheck,
  Settings2,
  Database,
  Compass,
  RotateCw,
  Plus,
  type LucideIcon,
} from 'lucide-react';
import type { CheckTemplate, FieldKey, FieldLayout, SelectableItem } from '../../types';
import { saveTemplateToSupabase, createTemplateInSupabase } from '../../core/templateRepository';
import { useToast } from '../../components/ui/Toast';

const getElectronAPI = () => (window as unknown as { electronAPI?: { printCheck: (opts: Record<string, unknown>) => Promise<{ success: boolean; failureReason?: string }> } }).electronAPI;

interface CalibrationDashboardProps {
  template: CheckTemplate;
  onFieldChange: (key: FieldKey, patch: Partial<FieldLayout>) => void;
  activeField: SelectableItem | null;
  onFieldSelect: (key: SelectableItem) => void;
  onTemplateChange: React.Dispatch<React.SetStateAction<CheckTemplate>>;
  onTemplateSaved?: (saved: CheckTemplate) => void;
}

const FIELD_ICONS: Record<FieldKey, LucideIcon> = {
  date: Calendar,
  payee: User,
  amountWords: AlignLeft,
  numericAmount: Hash,
};

const FIELD_KEYS: FieldKey[] = ['date', 'payee', 'amountWords', 'numericAmount'];

interface NumberStepperProps {
  value: number;
  onChange: (v: number) => void;
  step: number;
  min: number;
  max: number;
  suffix: string;
  precision: number;
  label: string;
}

function NumberStepper({
  value,
  onChange,
  step,
  min,
  max,
  suffix,
  precision,
  label,
}: NumberStepperProps) {
  const [localText, setLocalText] = useState(value.toFixed(precision));
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      setLocalText(value.toFixed(precision));
    }
  }, [value, precision, isFocused]);

  const clamp = (v: number) => Math.min(max, Math.max(min, v));

  const commit = (raw: string) => {
    setIsFocused(false);
    const parsed = parseFloat(raw);
    if (isNaN(parsed)) {
      setLocalText(value.toFixed(precision));
      return;
    }
    const clamped = clamp(parsed);
    onChange(clamped);
    setLocalText(clamped.toFixed(precision));
  };

  const increment = () => {
    const next = clamp(parseFloat((value + step).toFixed(precision)));
    onChange(next);
    setLocalText(next.toFixed(precision));
  };

  const decrement = () => {
    const next = clamp(parseFloat((value - step).toFixed(precision)));
    onChange(next);
    setLocalText(next.toFixed(precision));
  };

  return (
    <div>
      <label className="text-[11px] text-[#6b6b6b] font-medium mb-1 block">{label}</label>
      <div className="flex items-stretch">
        <input
          type="text"
          inputMode="decimal"
          value={localText}
          onFocus={() => setIsFocused(true)}
          onChange={(e) => setLocalText(e.target.value)}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              (e.target as HTMLInputElement).blur();
            }
            if (e.key === 'ArrowUp') {
              e.preventDefault();
              increment();
            }
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              decrement();
            }
          }}
          className="flex-1 w-full bg-white border border-[#d1d1d1] rounded-l-md px-2.5 py-2 text-sm text-[#1f1f1f] focus:outline-none focus:border-[#ff7a00] focus:ring-1 focus:ring-[#ff7a00]/30 transition-colors"
        />
        <div className="flex flex-col">
          <button
            type="button"
            title="Increase (▲)"
            onClick={increment}
            className="flex items-center justify-center w-8 flex-1 bg-[#f5f5f5] hover:bg-[#ebebeb] border border-l-0 border-[#d1d1d1] rounded-tr-md transition-colors text-xs font-bold"
          >
            <ChevronUp size={14} className="text-[#555]" />
          </button>
          <button
            type="button"
            title="Decrease (▼)"
            onClick={decrement}
            className="flex items-center justify-center w-8 flex-1 bg-[#f5f5f5] hover:bg-[#ebebeb] border border-l-0 border-b border-[#d1d1d1] rounded-br-md transition-colors text-xs font-bold"
          >
            <ChevronDown size={14} className="text-[#555]" />
          </button>
        </div>
      </div>
      <span className="text-[10px] text-[#999] mt-0.5 block">{suffix}</span>
    </div>
  );
}

export const CalibrationDashboard: React.FC<CalibrationDashboardProps> = ({
  template,
  onFieldChange,
  activeField,
  onFieldSelect,
  onTemplateChange,
  onTemplateSaved,
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newBankName, setNewBankName] = useState('');
  const [newBranchName, setNewBranchName] = useState('');
  const toast = useToast();

  const handleSave = useCallback(async () => {
    if (!template.id || template.id.trim() === '') {
      toast.error('Cross-save prevented: Target template ID is undefined.', 'Integrity Guard');
      return;
    }

    setIsSaving(true);
    try {
      const saved = await saveTemplateToSupabase(template);
      if (onTemplateSaved) onTemplateSaved(saved);
      toast.success(
        `Template "${template.bankName}" (${template.branchName}) saved strictly to ID ${template.id}.`,
        'Database Synchronized'
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to save template to database',
        'Supabase Save Error'
      );
    } finally {
      setIsSaving(false);
    }
  }, [template, onTemplateSaved, toast]);

  const handleCreateNewBank = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBankName.trim()) return;

    setIsSaving(true);
    try {
      const created = await createTemplateInSupabase({
        bankName: newBankName.trim(),
        branchName: newBranchName.trim() || 'Main Branch',
        width: template.width,
        height: template.height,
        orientation: template.orientation,
        inverted: template.inverted,
        fields: template.fields,
      });

      onTemplateChange(created);
      if (onTemplateSaved) onTemplateSaved(created);
      setIsCreatingNew(false);
      setNewBankName('');
      setNewBranchName('');
      toast.success(`Bank template "${created.bankName}" created successfully.`, 'Created Record');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Creation failed', 'Create Error');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrint = useCallback(async () => {
    try {
      const electronAPI = getElectronAPI();
      if (electronAPI) {
        await electronAPI.printCheck({
          widthMm: template.width,
          heightMm: template.height,
          orientation: template.orientation,
          inverted: template.inverted,
          printerOffsetXmm: template.printerOffsetXmm,
          printerOffsetYmm: template.printerOffsetYmm,
          silent: true,
        });
      } else {
        window.print();
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Print preview error',
        'Print Error'
      );
    }
  }, [template, toast]);

  const handleInversionToggle = (inverted: boolean) => {
    onTemplateChange((prev) => ({
      ...prev,
      inverted,
    }));
  };

  return (
    <div className="neo-surface flex flex-col h-full min-h-0 bg-white overflow-hidden">
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="flex-none px-4 py-3 border-b border-[#f0f0f0] bg-[#fafafa]">
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="text-[10px] text-[#999] uppercase tracking-wide">Target Bank</div>
              <div className="text-sm font-semibold text-[#1f1f1f] truncate">{template.bankName}</div>
            </div>
            <button
              type="button"
              onClick={() => setIsCreatingNew(!isCreatingNew)}
              className="flex items-center gap-1 text-[11px] font-medium text-[#ff7a00] hover:underline"
            >
              <Plus size={12} />
              {isCreatingNew ? 'Cancel' : 'New Template'}
            </button>
          </div>

          {isCreatingNew && (
            <form onSubmit={handleCreateNewBank} className="mb-3 p-3 bg-white border border-[#ff7a00]/30 rounded-lg space-y-2">
              <div className="text-xs font-semibold text-[#ff7a00]">Create Dynamic Bank Template</div>
              <input
                type="text"
                placeholder="Bank Name (e.g. Standard Chartered)"
                value={newBankName}
                onChange={(e) => setNewBankName(e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 border border-[#d1d1d1] rounded"
                required
              />
              <input
                type="text"
                placeholder="Branch Name (e.g. Blue Area)"
                value={newBranchName}
                onChange={(e) => setNewBranchName(e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 border border-[#d1d1d1] rounded"
              />
              <button
                type="submit"
                disabled={isSaving}
                className="w-full bg-[#ff7a00] text-white text-xs font-medium py-1.5 rounded hover:bg-[#e66e00]"
              >
                Create & Activate
              </button>
            </form>
          )}

          <div className="grid grid-cols-2 gap-3 pt-1">
            <NumberStepper
              value={template.width}
              onChange={(w) => onTemplateChange((t) => ({ ...t, width: w }))}
              step={1}
              min={50}
              max={300}
              suffix="physical width in mm"
              precision={1}
              label="Paper Width (mm)"
            />
            <NumberStepper
              value={template.height}
              onChange={(h) => onTemplateChange((t) => ({ ...t, height: h }))}
              step={1}
              min={30}
              max={250}
              suffix="physical height in mm"
              precision={1}
              label="Paper Height (mm)"
            />
          </div>
        </div>

        <div className="p-4 border-b border-[#f0f0f0] bg-[#fafafa]/50 space-y-3">
          <div className="flex items-center gap-1.5">
            <Compass size={15} className="text-[#ff7a00]" />
            <span className="text-xs font-semibold text-[#1f1f1f] uppercase tracking-wide">
              Print Orientation & Physical Feed
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="text-[11px] text-[#6b6b6b] font-medium mb-1 block">Orientation</label>
              <div className="neo-inset flex items-center justify-center rounded bg-[#ebebeb] px-3 py-1.5 text-xs font-semibold text-[#ff7a00]">
                Portrait / Vertical
              </div>
            </div>

            <div>
              <label className="text-[11px] text-[#6b6b6b] font-medium mb-1 block">
                90° Physical Feed Rotation
              </label>
              <label className="flex items-center gap-2 cursor-pointer mt-1.5">
                <input
                  type="checkbox"
                  checked={Boolean(template.inverted)}
                  onChange={(e) => handleInversionToggle(e.target.checked)}
                  className="rounded border-[#d1d1d1] text-[#ff7a00] focus:ring-[#ff7a00] h-4 w-4"
                />
                <span className="text-xs text-[#1f1f1f] font-medium flex items-center gap-1">
                  <RotateCw size={13} className={template.inverted ? 'text-[#ff7a00]' : 'text-gray-400'} />
                  Rotate 90° on Print
                </span>
              </label>
            </div>
          </div>
        </div>

        <div className="p-4 border-b border-[#f0f0f0] bg-[#fcfcfc]">
          <div className="flex items-center gap-2 mb-2.5">
            <Settings2 size={15} className="text-[#ff7a00]" />
            <span className="text-xs font-semibold text-[#1f1f1f] uppercase tracking-wide">
              Hardware Printer Offset Matrix
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <NumberStepper
              value={template.printerOffsetXmm}
              onChange={(v) => onTemplateChange((t) => ({ ...t, printerOffsetXmm: v }))}
              step={0.5}
              min={-50}
              max={50}
              suffix="mm shift (+ right / - left)"
              precision={1}
              label="Printer Offset X (mm)"
            />
            <NumberStepper
              value={template.printerOffsetYmm}
              onChange={(v) => onTemplateChange((t) => ({ ...t, printerOffsetYmm: v }))}
              step={0.5}
              min={-50}
              max={50}
              suffix="mm shift (+ down / - up)"
              precision={1}
              label="Printer Offset Y (mm)"
            />
          </div>
        </div>

        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#1f1f1f] uppercase tracking-wide">
              Field Layout Coordinates
            </span>
            <span className="text-[11px] text-[#999]">Click a field to select</span>
          </div>

          {FIELD_KEYS.map((key) => {
            const field = template.fields[key];
            if (!field) return null;
            const Icon = FIELD_ICONS[key];
            const isActive = activeField === key;

            return (
              <div
                key={key}
                onClick={() => onFieldSelect(key)}
                className={`rounded-lg border transition-all cursor-pointer ${
                  isActive
                    ? 'border-[#ff7a00] bg-[#fff3e6]/50 shadow-fluent-sm'
                    : 'border-[#e5e5e5] bg-white hover:border-[#d0d0d0] hover:bg-[#fafafa]'
                }`}
              >
                <div className="flex items-center justify-between px-3 py-2.5 border-b border-[#f0f0f0]">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-7 h-7 rounded-md flex items-center justify-center ${
                        isActive ? 'bg-[#ff7a00] text-white' : 'bg-[#f5f5f5] text-[#6b6b6b]'
                      }`}
                    >
                      <Icon size={14} />
                    </div>
                    <span
                      className={`text-sm font-medium ${
                        isActive ? 'text-[#ff7a00]' : 'text-[#1f1f1f]'
                      }`}
                    >
                      {field.label}
                    </span>
                  </div>
                  {isActive && (
                    <span className="text-[10px] text-[#ff7a00] font-medium uppercase tracking-wide">
                      Selected
                    </span>
                  )}
                </div>

                <div className="p-3 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <NumberStepper
                      value={field.x}
                      onChange={(v) => onFieldChange(key, { x: v })}
                      step={0.5}
                      min={0}
                      max={template.width}
                      suffix="mm from left edge"
                      precision={1}
                      label="Margin Left (X)"
                    />
                    <NumberStepper
                      value={field.y}
                      onChange={(v) => onFieldChange(key, { y: v })}
                      step={0.5}
                      min={0}
                      max={template.height}
                      suffix="mm from top edge"
                      precision={1}
                      label="Margin Top (Y)"
                    />
                  </div>

                  <NumberStepper
                    value={field.fontSize}
                    onChange={(v) => onFieldChange(key, { fontSize: v })}
                    step={0.5}
                    min={4}
                    max={36}
                    suffix="point size"
                    precision={1}
                    label="Font Size"
                  />

                  {key === 'date' && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] text-[#6b6b6b] font-medium">
                          Digit Cell Gap
                        </label>
                        <span className="text-[11px] text-[#1f1f1f] font-mono">
                          {(field.digitGap ?? 2.8).toFixed(2)} mm
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={6}
                        step={0.05}
                        value={field.digitGap ?? 2.8}
                        onChange={(e) =>
                          onFieldChange(key, { digitGap: parseFloat(e.target.value) })
                        }
                        onClick={(e) => e.stopPropagation()}
                        className="w-full h-1.5 bg-[#e5e5e5] rounded-full appearance-none cursor-pointer accent-[#ff7a00]"
                      />
                      <div className="flex items-center justify-between mt-0.5">
                        <span className="text-[10px] text-[#999]">0.00 mm</span>
                        <span className="text-[10px] text-[#999]">6.00 mm</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {(() => {
            const isStampActive = activeField === 'stamp';
            const stampConfig = template.stampConfig ?? {
              text: "PAYEE'S ACCOUNT ONLY",
              x: 0.0,
              y: 7.0,
              angle: -24,
              width: 30.0,
            };

            const updateStamp = (patch: Partial<typeof stampConfig>) => {
              onTemplateChange((prev) => ({
                ...prev,
                stampConfig: { ...stampConfig, ...patch },
              }));
            };

            return (
              <div
                onClick={() => onFieldSelect('stamp')}
                className={`rounded-lg border transition-all cursor-pointer ${
                  isStampActive
                    ? 'border-[#ff7a00] bg-[#fff3e6]/50 shadow-fluent-sm'
                    : 'border-[#e5e5e5] bg-white hover:border-[#d0d0d0] hover:bg-[#fafafa]'
                }`}
              >
                <div className="flex items-center justify-between px-3 py-2.5 border-b border-[#f0f0f0]">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-7 h-7 rounded-md flex items-center justify-center ${
                        isStampActive ? 'bg-[#ff7a00] text-white' : 'bg-[#fff3e6] text-[#ff7a00]'
                      }`}
                    >
                      <ShieldCheck size={14} />
                    </div>
                    <span
                      className={`text-sm font-medium ${
                        isStampActive ? 'text-[#ff7a00]' : 'text-[#1f1f1f]'
                      }`}
                    >
                      Crossing Stamp
                    </span>
                  </div>
                  {isStampActive && (
                    <span className="text-[10px] text-[#ff7a00] font-medium uppercase tracking-wide">
                      Selected
                    </span>
                  )}
                </div>

                <div className="p-3 space-y-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] text-[#6b6b6b] font-medium">Stamp Text</label>
                    <input
                      type="text"
                      value={stampConfig.text ?? "PAYEE'S ACCOUNT ONLY"}
                      onChange={(e) => {
                        e.stopPropagation();
                        updateStamp({ text: e.target.value });
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full rounded border border-[#d1d1d1] px-2 py-1 text-xs text-[#1f1f1f] focus:border-[#ff7a00] outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <NumberStepper
                      value={stampConfig.x}
                      onChange={(x) => updateStamp({ x })}
                      step={0.5}
                      min={0}
                      max={template.width}
                      suffix="mm from left edge"
                      precision={1}
                      label="Margin Left (X)"
                    />
                    <NumberStepper
                      value={stampConfig.y}
                      onChange={(y) => updateStamp({ y })}
                      step={0.5}
                      min={0}
                      max={template.height}
                      suffix="mm from top edge"
                      precision={1}
                      label="Margin Top (Y)"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <NumberStepper
                      value={stampConfig.angle}
                      onChange={(angle) => updateStamp({ angle })}
                      step={1}
                      min={-180}
                      max={180}
                      suffix="degrees rotation"
                      precision={0}
                      label="Cross Angle"
                    />
                    <NumberStepper
                      value={stampConfig.width}
                      onChange={(width) => updateStamp({ width })}
                      step={1}
                      min={10}
                      max={80}
                      suffix="mm line length"
                      precision={1}
                      label="Stamp Width"
                    />
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      <div className="flex-none border-t border-[#e5e5e5] p-3.5 bg-[#fafafa] space-y-2.5">
        <div className="bg-[#fff3e6] border border-[#ffd5b3] rounded-md px-3 py-2 text-[11px] text-[#cc6200]">
          <div className="font-semibold flex items-center gap-1.5">
            <Database size={13} className="text-[#ff7a00]" />
            Target Record: <span className="text-[#111]">{template.bankName}</span>
          </div>
          <div className="text-[10px] text-[#8c4300] truncate mt-0.5">
            {template.branchName} | ID: <span className="font-mono text-[#ff7a00]">{template.id}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-md font-semibold text-xs transition-all disabled:opacity-60 bg-[#ff7a00] text-white border border-[#ff7a00] hover:bg-[#e66e00] shadow-fluent-sm"
          >
            {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {isSaving ? 'Syncing to DB...' : 'Save to Supabase'}
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-md font-semibold text-xs transition-all bg-white text-[#1f1f1f] border border-[#d1d1d1] hover:bg-[#f5f5f5] shadow-fluent-sm"
          >
            <Printer size={14} />
            Silent Print
          </button>
        </div>
      </div>
    </div>
  );
};

export default CalibrationDashboard;