import React, { useCallback, useState, useEffect, useRef } from 'react';
import {
  Printer,
  Calendar,
  User,
  Hash,
  AlignLeft,
  RotateCcw,
  ShieldCheck,
  Building2,
  Sparkles,
} from 'lucide-react';
import type { CheckTemplate, TransactionData } from '../../types';
import { formatCheckAmountInWords, formatCurrencyWithCommas } from '../../domain/numberToWords';
import { useToast } from '../../components/ui/Toast';

interface CheckGeneratorDashboardProps {
  template: CheckTemplate;
  presets: CheckTemplate[];
  onSelectPreset: (presetId: string) => void;
  transaction: TransactionData;
  onTransactionChange: React.Dispatch<React.SetStateAction<TransactionData>>;
}

export function getTodayIsoDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function isoDateToDigits(isoDate: string): string {
  if (!isoDate) return '';
  const parts = isoDate.split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts;
    return `${day}${month}${year}`;
  }
  return isoDate.replace(/\D/g, '').slice(0, 8);
}

export function digitsToIsoDate(digits: string): string {
  if (!digits || digits.length < 8) return getTodayIsoDate();
  const day = digits.slice(0, 2);
  const month = digits.slice(2, 4);
  const year = digits.slice(4, 8);
  return `${year}-${month}-${day}`;
}

interface PrinterDevice {
  name: string;
  isDefault?: boolean;
}

const getElectronAPI = () =>
  (window as unknown as {
    electronAPI?: {
      printCheck: (opts: Record<string, unknown>) => Promise<{ success: boolean; failureReason?: string }>;
      listPrinters: () => Promise<Array<PrinterDevice>>;
    };
  }).electronAPI;

export const CheckGeneratorDashboard: React.FC<CheckGeneratorDashboardProps> = ({
  template,
  presets,
  onSelectPreset,
  transaction,
  onTransactionChange,
}) => {
  const toast = useToast();
  const [printers, setPrinters] = useState<PrinterDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>('');

  // ── Auto-preset guard ────────────────────────────────────────────────────
  // This ref prevents the Askari Bank auto-selection from firing more than once.
  // Without the guard, every time `presets` is updated (e.g. after a Supabase
  // reload or template save) the effect re-runs, calls onSelectPreset, which
  // triggers a parent re-render that cascades down and resets active inputs.
  const hasAutoSelected = useRef(false);

  // Enforce Askari Bank (Gujrat Branch) as default template if present and
  // template not yet matched — but only on the first valid preset load.
  useEffect(() => {
    if (hasAutoSelected.current) return; // already fired once — do not repeat
    if (presets.length === 0) return;     // wait until presets are available

    // Only auto-select if the current template is the default placeholder
    // (id === 'default' or not found in the loaded preset list)
    const templateIsPlaceholder =
      !template.id || template.id === 'default' || !presets.some((p) => p.id === template.id);

    if (templateIsPlaceholder) {
      const askariDefault =
        presets.find(
          (p) =>
            p.bankName.toLowerCase().includes('askari') ||
            p.branchName.toLowerCase().includes('gujrat')
        ) || presets[0];

      if (askariDefault && askariDefault.id !== template.id) {
        onSelectPreset(askariDefault.id);
      }
    }

    // Mark as done regardless — even if no selection was needed, we never
    // want this effect to fire again during the session.
    hasAutoSelected.current = true;
  }, [presets, template.id, onSelectPreset]);

  // Load physical printer list once
  useEffect(() => {
    async function fetchPrinters() {
      const api = getElectronAPI();
      if (api && typeof api.listPrinters === 'function') {
        const list = await api.listPrinters();
        setPrinters(list || []);
        const defaultDevice =
          list?.find((p: PrinterDevice) => p.isDefault && !p.name.toLowerCase().includes('pdf') && !p.name.toLowerCase().includes('xps'))?.name ||
          list?.find((p: PrinterDevice) => !p.name.toLowerCase().includes('pdf') && !p.name.toLowerCase().includes('xps'))?.name ||
          list?.[0]?.name;
        if (defaultDevice) setSelectedDevice(defaultDevice);
      }
    }
    fetchPrinters();
  }, []);

  const handlePayeeTypeChange = (selfSelected: boolean) => {
    onTransactionChange((prev) => ({
      ...prev,
      isSelf: selfSelected,
      payee: selfSelected ? 'SELF' : prev.payee === 'SELF' ? '' : prev.payee,
    }));
  };

  const handlePayeeNameChange = (val: string) => {
    const isSelf = val.toUpperCase() === 'SELF';
    onTransactionChange((prev) => ({
      ...prev,
      isSelf,
      payee: val,
    }));
  };

  const handleNumericAmountChange = (rawVal: string) => {
    const sanitized = rawVal.replace(/[^0-9.,]/g, '');
    const cleanNum = sanitized.replace(/,/g, '');
    const convertedWords = formatCheckAmountInWords(cleanNum, transaction.numberingSystem);

    onTransactionChange((prev) => ({
      ...prev,
      numericAmount: sanitized,
      amountWords: convertedWords || prev.amountWords,
    }));
  };

  const handleToggleNumberingSystem = () => {
    const nextSys = transaction.numberingSystem === 'lakh' ? 'million' : 'lakh';
    const cleanNum = transaction.numericAmount.replace(/,/g, '');
    const convertedWords = formatCheckAmountInWords(cleanNum, nextSys);

    onTransactionChange((prev) => ({
      ...prev,
      numberingSystem: nextSys,
      amountWords: convertedWords || prev.amountWords,
    }));
  };

  const handleDateChange = (isoVal: string) => {
    const digits = isoDateToDigits(isoVal);
    onTransactionChange((prev) => ({
      ...prev,
      date: digits,
    }));
  };

  const handleResetCheck = () => {
    const todayDigits = isoDateToDigits(getTodayIsoDate());
    onTransactionChange({
      payee: '',
      numericAmount: '',
      amountWords: '',
      date: todayDigits,
      isSelf: false,
      isPayeeAccountOnly: false,
      numberingSystem: 'lakh',
    });
    toast.info('Check input fields have been reset to blank.', 'Form Cleared');
  };

  const handlePrint = useCallback(async () => {
    try {
      const api = getElectronAPI();
      if (api && typeof api.printCheck === 'function') {
        const res = await api.printCheck({
          widthMm: template.width,
          heightMm: template.height,
          orientation: template.orientation,
          inverted: template.inverted,
          printerOffsetXmm: template.printerOffsetXmm,
          printerOffsetYmm: template.printerOffsetYmm,
          silent: true,
          deviceName: selectedDevice,
        });
        if (res && res.success) {
          toast.success(
            `Check dispatched to ${selectedDevice || 'default hardware printer'}.`,
            'Silent Print Dispatched'
          );
        } else {
          toast.warning(`Print job notice: ${res?.failureReason || 'Spooler warning'}`, 'Print Notice');
        }
      } else {
        window.print();
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Unknown print error',
        'Print Dispatch Failed'
      );
    }
  }, [template, toast, selectedDevice]);

  const isoDate = digitsToIsoDate(transaction.date);

  return (
    <div className="neo-surface flex flex-col h-full min-h-0 bg-white overflow-hidden">
      {/* Preset Bank Header */}
      <div className="flex-none px-4 py-2.5 border-b border-[#f0f0f0] bg-[#fafafa]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 size={15} className="text-[#ff7a00]" />
            <span className="text-xs font-semibold text-[#1f1f1f] uppercase tracking-wide">
              Bank Template
            </span>
          </div>
          {presets.length > 0 && (
            <select
              value={template.id}
              onChange={(e) => onSelectPreset(e.target.value)}
              className="text-xs font-medium bg-white border border-[#d1d1d1] rounded px-2 py-1 text-[#1f1f1f] focus:outline-none focus:border-[#ff7a00]"
            >
              {presets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.bankName} ({p.branchName})
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Scrollable Form Body */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3.5">
        {/* Hardware Printer Selector */}
        {printers.length > 0 && (
          <div className="bg-[#fafafa] border border-[#e5e5e5] rounded-lg p-2.5 space-y-1">
            <label className="flex items-center gap-1.5 text-[11px] font-semibold text-[#1f1f1f]">
              <Printer size={12} className="text-[#ff7a00]" />
              Target Windows Thermal/Impact Printer
            </label>
            <select
              value={selectedDevice}
              onChange={(e) => setSelectedDevice(e.target.value)}
              className="w-full text-xs font-medium bg-white border border-[#d1d1d1] rounded px-2.5 py-1.5 text-[#1f1f1f] focus:outline-none focus:border-[#ff7a00]"
            >
              {printers.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.name} {p.isDefault ? '(Default)' : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* 1. Payee & Self Selection */}
        <div className="bg-[#fafafa] border border-[#e5e5e5] rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-[#1f1f1f]">
              <User size={13} className="text-[#ff7a00]" />
              Payee Designation
            </label>
            <div className="inline-flex rounded-md bg-[#ebebeb] p-0.5 text-[11px] font-medium">
              <button
                type="button"
                onClick={() => handlePayeeTypeChange(false)}
                className={`px-2 py-0.5 rounded transition-colors ${
                  !transaction.isSelf
                    ? 'bg-white text-[#ff7a00] shadow-fluent-sm font-semibold'
                    : 'text-[#6b6b6b] hover:text-[#1f1f1f]'
                }`}
              >
                Custom Payee
              </button>
              <button
                type="button"
                onClick={() => handlePayeeTypeChange(true)}
                className={`px-2 py-0.5 rounded transition-colors ${
                  transaction.isSelf
                    ? 'bg-[#ff7a00] text-white shadow-fluent-sm font-semibold'
                    : 'text-[#6b6b6b] hover:text-[#1f1f1f]'
                }`}
              >
                Self
              </button>
            </div>
          </div>

          <input
            type="text"
            value={transaction.payee}
            disabled={transaction.isSelf}
            placeholder={transaction.isSelf ? 'SELF' : 'Enter recipient or payee name...'}
            onChange={(e) => handlePayeeNameChange(e.target.value)}
            className={`w-full bg-white border rounded-md px-3 py-1.5 text-xs text-[#1f1f1f] transition-colors focus:outline-none ${
              transaction.isSelf
                ? 'bg-gray-100 text-[#ff7a00] font-bold border-[#d1d1d1] cursor-not-allowed'
                : 'border-[#d1d1d1] focus:border-[#ff7a00]'
            }`}
          />
        </div>

        {/* 2. Numeric Amount & Auto-in-Words */}
        <div className="bg-[#fafafa] border border-[#e5e5e5] rounded-lg p-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-[#1f1f1f]">
              <Hash size={13} className="text-[#ff7a00]" />
              Amount in Numbers
            </label>
            <button
              type="button"
              onClick={handleToggleNumberingSystem}
              className="text-[10px] text-[#ff7a00] hover:underline font-semibold"
            >
              System: {transaction.numberingSystem === 'lakh' ? 'Lakh / Crore' : 'Million'}
            </button>
          </div>

          <input
            type="text"
            value={transaction.numericAmount}
            placeholder="e.g. 50,000.00"
            onChange={(e) => handleNumericAmountChange(e.target.value)}
            onBlur={() => {
              if (transaction.numericAmount) {
                const formatted = formatCurrencyWithCommas(transaction.numericAmount);
                if (formatted) {
                  onTransactionChange((prev) => ({ ...prev, numericAmount: formatted }));
                }
              }
            }}
            className="w-full bg-white border border-[#d1d1d1] rounded-md px-3 py-1.5 text-sm font-mono font-semibold text-[#1f1f1f] focus:outline-none focus:border-[#ff7a00]"
          />

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="flex items-center gap-1 text-[11px] font-medium text-[#6b6b6b]">
                <AlignLeft size={11} />
                Amount in Words (Auto Generated)
              </label>
              <span className="text-[10px] text-[#ff7a00] font-medium flex items-center gap-0.5">
                <Sparkles size={9} /> Auto-wrapped
              </span>
            </div>
            <textarea
              rows={2}
              value={transaction.amountWords}
              placeholder="Auto-generated formal check amount..."
              onChange={(e) =>
                onTransactionChange((prev) => ({ ...prev, amountWords: e.target.value }))
              }
              className="w-full bg-white border border-[#d1d1d1] rounded-md px-2.5 py-1 text-xs font-mono text-[#1f1f1f] focus:outline-none focus:border-[#ff7a00] resize-none leading-relaxed"
            />
          </div>
        </div>

        {/* 3. Date Selection */}
        <div className="bg-[#fafafa] border border-[#e5e5e5] rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-[#1f1f1f]">
              <Calendar size={13} className="text-[#ff7a00]" />
              Check Date
            </label>
            <button
              type="button"
              onClick={() => handleDateChange(getTodayIsoDate())}
              className="text-[10px] text-[#ff7a00] hover:underline font-medium"
            >
              Today
            </button>
          </div>

          <div className="grid grid-cols-[1fr_auto] gap-2 items-center">
            <input
              type="date"
              value={isoDate}
              onChange={(e) => handleDateChange(e.target.value)}
              className="bg-white border border-[#d1d1d1] rounded-md px-2.5 py-1 text-xs text-[#1f1f1f] focus:outline-none focus:border-[#ff7a00]"
            />
            {/* Live 8-digit split preview */}
            <div className="flex items-center gap-0.5 bg-white border border-[#e0e0e0] px-1 py-1 rounded">
              {transaction.date
                .padEnd(8, ' ')
                .slice(0, 8)
                .split('')
                .map((d, i) => (
                  <span
                    key={i}
                    className="w-3.5 h-4.5 flex items-center justify-center font-mono text-[11px] font-bold bg-[#f5f5f5] text-[#1f1f1f] border border-dashed border-[#ff7a00]/30 rounded-xs"
                  >
                    {d}
                  </span>
                ))}
            </div>
          </div>
        </div>

        {/* 4. "PAYEE'S ACCOUNT ONLY" Cross Stamp Toggle */}
        <div className="bg-[#fafafa] border border-[#e5e5e5] rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-[#fff3e6] text-[#ff7a00] flex items-center justify-center">
                <ShieldCheck size={15} />
              </div>
              <div>
                <div className="text-xs font-semibold text-[#1f1f1f]">
                  Payee's Account Only
                </div>
                <div className="text-[10px] text-[#777]">
                  Crossed parallel lines stamp on top-left
                </div>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={transaction.isPayeeAccountOnly}
                onChange={(e) =>
                  onTransactionChange((prev) => ({
                    ...prev,
                    isPayeeAccountOnly: e.target.checked,
                  }))
                }
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-[#d1d1d1] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#ff7a00]"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex-none border-t border-[#e5e5e5] p-3 flex items-center gap-2 bg-[#fafafa]">
        <button
          type="button"
          onClick={handleResetCheck}
          className="flex items-center justify-center gap-1 px-3 py-2 rounded-md text-xs font-medium text-[#6b6b6b] bg-white border border-[#d1d1d1] hover:bg-[#f5f5f5] transition-colors"
          title="Reset check fields"
        >
          <RotateCcw size={13} />
          Reset
        </button>

        <button
          type="button"
          onClick={handlePrint}
          className="flex-1 flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-md font-semibold text-xs transition-all bg-[#ff7a00] text-white border border-[#ff7a00] hover:bg-[#e66e00] active:bg-[#cc6200] shadow-fluent-sm"
        >
          <Printer size={15} />
          Print Check Now
        </button>
      </div>
    </div>
  );
};

export default CheckGeneratorDashboard;