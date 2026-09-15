import React, { useRef, useCallback, useEffect, useState } from 'react';
import { Upload, X, Grid3x3, RotateCw } from 'lucide-react';
import type { CheckTemplate, SelectableItem, TransactionData } from '../../types';
import { formatCurrencyWithCommas } from '../../domain/numberToWords';

interface CheckCanvasProps {
  template: CheckTemplate;
  transaction?: TransactionData;
  activeField: SelectableItem | null;
  onFieldClick: (key: SelectableItem) => void;
  checkImageUrl: string | null;
  onImageUpload: (url: string) => void;
  onImageClear: () => void;
  mode?: 'generate' | 'calibrate';
}

/**
 * Robust word-wrapping parser preventing boundary overflow
 * when number-to-words text exceeds the physical check guideline rule length.
 */
function splitAmountWords(text: string, maxLine1Chars = 38): { line1: string; line2: string } {
  if (!text) return { line1: '', line2: '' };

  if (text.includes('\n')) {
    const lines = text.split('\n');
    return { line1: lines[0].trim(), line2: lines.slice(1).join(' ').trim() };
  }

  if (text.length <= maxLine1Chars) {
    return { line1: text.trim(), line2: '' };
  }

  const words = text.trim().split(/\s+/);
  let line1 = '';
  let line2 = '';

  for (const word of words) {
    const candidate = line1 ? `${line1} ${word}` : word;
    if (candidate.length <= maxLine1Chars && !line2) {
      line1 = candidate;
    } else {
      line2 = line2 ? `${line2} ${word}` : word;
    }
  }

  return { line1, line2 };
}

const FIELD_KEYS = ['date', 'payee', 'amountWords', 'numericAmount'] as const;

export const CheckCanvas: React.FC<CheckCanvasProps> = ({
  template,
  transaction,
  activeField,
  onFieldClick,
  checkImageUrl,
  onImageUpload,
  onImageClear,
  mode = 'calibrate',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pxPerMm, setPxPerMm] = useState<number>(3.5);
  const [showGrid, setShowGrid] = useState<boolean>(true);

  // Dynamic 1:1 scale (pxPerMm) calculated via ResizeObserver fitting container dimensions
  const recalcScale = useCallback(() => {
    if (!containerRef.current) return;
    const availW = Math.max(100, containerRef.current.clientWidth - 72);
    const availH = Math.max(100, containerRef.current.clientHeight - 72);
    const scaleX = availW / (template.width || 178);
    const scaleY = availH / (template.height || 74);
    const fitScale = Math.min(scaleX, scaleY);
    setPxPerMm(Math.max(0.25, fitScale));
  }, [template.width, template.height]);

  useEffect(() => {
    recalcScale();
    let rafId = 0;
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(recalcScale);
    });
    if (containerRef.current) ro.observe(containerRef.current);
    return () => {
      ro.disconnect();
      cancelAnimationFrame(rafId);
    };
  }, [recalcScale]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const dataUrl = reader.result;
        try {
          localStorage.setItem('check-template-image', dataUrl);
        } catch {
          // ignore storage quota errors
        }
        onImageUpload(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleClearImage = () => {
    try {
      localStorage.removeItem('check-template-image');
    } catch {
      // ignore
    }
    onImageClear();
  };

  const canvasW = template.width * pxPerMm;
  const canvasH = template.height * pxPerMm;

  // Decoupled transaction value resolution
  const rawDate =
    transaction?.date ||
    template.fields.date?.value ||
    (mode === 'calibrate' ? '15012026' : '');
  const dateStr = rawDate.replace(/\D/g, '').padEnd(8, ' ').slice(0, 8);
  const dateDigits = dateStr.split('');

  const payeeValue =
    transaction?.isSelf
      ? 'SELF'
      : transaction?.payee ?? template.fields.payee?.value ?? (mode === 'calibrate' ? '[Payee Name]' : '');

  const amountWordsValue =
    transaction?.amountWords ??
    template.fields.amountWords?.value ??
    (mode === 'calibrate' ? '[Amount in Words]' : '');

  const rawNumeric =
    transaction?.numericAmount ??
    template.fields.numericAmount?.value ??
    (mode === 'calibrate' ? '50,000.00' : '');

  const numericDisplay =
    rawNumeric && mode === 'generate' ? formatCurrencyWithCommas(rawNumeric) : rawNumeric;

  const isCrossingActive =
    transaction !== undefined
      ? transaction.isPayeeAccountOnly
      : Boolean(template.payeeAccountOnly);

  const stamp = template.stampConfig ?? {
    text: "PAYEE'S ACCOUNT ONLY",
    x: 0,
    y: 7,
    angle: -24,
    width: 30,
  };

  const dateField = template.fields.date;
  const digitCellW = 3.4;
  const digitGap = dateField?.digitGap ?? 2.8;

  return (
    <div className="flex min-h-0 min-w-0 flex-col h-full bg-[#f3f3f3] overflow-hidden">
      {/* Dynamic Print Stylesheet with Physical Micron Page Sizing and Inverted Feed Transform */}
      <style>{`
        @media print {
          @page {
            size: ${template.width}mm ${template.height}mm;
            margin: 0;
          }
          html, body {
            width: ${template.width}mm !important;
            height: ${template.height}mm !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          #check-canvas-paper {
            width: ${template.width}mm !important;
            height: ${template.height}mm !important;
            transform: translate(${template.printerOffsetXmm || 0}mm, ${template.printerOffsetYmm || 0}mm) ${
        template.inverted ? 'rotate(180deg)' : ''
      } !important;
            transform-origin: center center !important;
          }
          #check-canvas-paper img {
            display: none !important;
          }
        }
      `}</style>

      {/* Canvas Top Toolbar */}
      <div className="print-hide flex-none flex items-center justify-between px-4 py-2.5 border-b border-[#e5e5e5] bg-white">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-[#1f1f1f]">
            {template.bankName}
          </span>
          <span className="text-[11px] text-[#666]">
            {template.width}mm × {template.height}mm ({template.orientation})
          </span>
          <span className="text-[11px] text-[#888]">
            Scale: {pxPerMm.toFixed(2)} px/mm
          </span>
          {template.inverted && (
            <span className="flex items-center gap-1 text-[10px] font-semibold bg-amber-50 text-amber-800 px-1.5 py-0.5 rounded border border-amber-200">
              <RotateCw size={11} />
              180° Inverted Feed
            </span>
          )}
          {(template.printerOffsetXmm !== 0 || template.printerOffsetYmm !== 0) && (
            <span className="text-[10px] font-mono bg-orange-50 text-orange-700 px-1.5 py-0.5 rounded border border-orange-200">
              Shift: ({template.printerOffsetXmm > 0 ? `+${template.printerOffsetXmm}` : template.printerOffsetXmm}, {template.printerOffsetYmm > 0 ? `+${template.printerOffsetYmm}` : template.printerOffsetYmm}) mm
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowGrid(!showGrid)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors border ${
              showGrid
                ? 'bg-[#fff3e6] text-[#ff7a00] border-[#ff7a00]/30'
                : 'bg-[#f5f5f5] text-[#6b6b6b] border-[#e5e5e5] hover:bg-[#ebebeb]'
            }`}
          >
            <Grid3x3 size={14} />
            Grid
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-[#ff7a00] text-white border border-[#ff7a00] hover:bg-[#e66e00] transition-colors shadow-fluent-sm"
          >
            <Upload size={14} />
            Upload Check Scan
          </button>
          {checkImageUrl && (
            <button
              type="button"
              onClick={handleClearImage}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-[#f5f5f5] text-[#6b6b6b] border border-[#e5e5e5] hover:bg-[#ebebeb] transition-colors"
            >
              <X size={14} />
              Remove Scan
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFile}
            className="hidden"
          />
        </div>
      </div>

      {/* Canvas Viewport */}
      <div
        id="print-canvas-area"
        ref={containerRef}
        className="relative flex min-h-0 min-w-0 flex-1 items-center justify-center overflow-auto p-6"
        style={{
          backgroundImage: 'radial-gradient(circle, #d8d8d8 1px, transparent 1px)',
          backgroundSize: '16px 16px',
        }}
      >
        {/* Strict 1:1 Check Paper */}
        <div
          id="check-canvas-paper"
          className="relative flex-none bg-white check-paper-shadow"
          style={{
            width: `${canvasW}px`,
            height: `${canvasH}px`,
          }}
        >
          {/* No Image Prompt */}
          {!checkImageUrl && (
            <div className="print-hide absolute inset-0 z- flex items-center justify-center bg-white/85 pointer-events-none">
              <div className="text-center px-4">
                <p className="text-sm font-medium text-[#444]">No check scan loaded</p>
                <p className="mt-1 text-xs text-[#777]">
                  Upload a scanned check image to align template field coordinates.
                </p>
              </div>
            </div>
          )}

          {/* Scanned Background Check Image */}
          {checkImageUrl && (
            <img
              src={checkImageUrl}
              alt="Check background template"
              className="absolute inset-0 w-full h-full object-fill pointer-events-none"
              draggable={false}
            />
          )}

          {/* Grid Overlay */}
          {showGrid && (
            <div
              className="print-hide absolute inset-0 pointer-events-none"
              style={{
                backgroundImage: `
                  linear-gradient(rgba(255,122,0,0.06) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(255,122,0,0.06) 1px, transparent 1px)
                `,
                backgroundSize: `${10 * pxPerMm}px ${10 * pxPerMm}px`,
              }}
            />
          )}

          {/* Ruler Ticks (Top) */}
          <div className="print-hide absolute -top-5 left-0 right-0 flex justify-between pointer-events-none">
            {Array.from({ length: Math.floor(template.width / 10) + 1 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center">
                <div className="w-px h-2 bg-[#c0c0c0]" />
                <span className="text-[8px] text-[#888] mt-0.5">{i * 10}</span>
              </div>
            ))}
          </div>

          {/* Ruler Ticks (Left) */}
          <div className="print-hide absolute -left-5 top-0 bottom-0 flex flex-col justify-between pointer-events-none">
            {Array.from({ length: Math.floor(template.height / 10) + 1 }).map((_, i) => (
              <div key={i} className="flex items-center">
                <div className="h-px w-2 bg-[#c0c0c0]" />
                <span className="text-[8px] text-[#888] ml-0.5">{i * 10}</span>
              </div>
            ))}
          </div>

          {/* "PAYEE'S ACCOUNT ONLY" Cross Stamp */}
          {(isCrossingActive || mode === 'calibrate') && (
            <div
              onClick={() => mode === 'calibrate' && onFieldClick('stamp')}
              className={`absolute select-none z-30 flex flex-col items-center justify-center text-center transition-all duration-150 ${
                mode === 'calibrate'
                  ? `cursor-pointer ${
                      activeField === 'stamp'
                        ? 'ring-2 ring-[#ff7a00] bg-[#ff7a00]/[0.05] p-1 rounded-sm shadow-fluent-sm'
                        : 'hover:ring-1 hover:ring-[#ff7a00]/40 p-1 rounded-sm'
                    }`
                  : 'pointer-events-none'
              }`}
              style={{
                top: `${stamp.y}mm`,
                left: `${stamp.x}mm`,
                width: `${stamp.width}mm`,
                transform: `rotate(${stamp.angle}deg)`,
                transformOrigin: 'center center',
                opacity: mode === 'calibrate' && !isCrossingActive ? 0.45 : 1,
              }}
            >
              <div className="w-full bg-[#111]" style={{ height: '0.35mm' }} />
              <div
                className="font-extrabold text-[#111] uppercase select-none py-0.5 tracking-wider"
                style={{
                  fontSize: '2.2mm',
                  fontFamily: 'Consolas, "Courier New", monospace',
                  letterSpacing: '0.08em',
                  whiteSpace: 'nowrap',
                }}
              >
                {stamp.text ?? "PAYEE'S ACCOUNT ONLY"}
              </div>
              <div className="w-full bg-[#111]" style={{ height: '0.35mm' }} />
            </div>
          )}

          {/* Non-Date Fields (payee, amountWords, numericAmount) */}
          {FIELD_KEYS.filter((k) => k !== 'date').map((key) => {
            const field = template.fields[key];
            if (!field) return null;
            const isActive = activeField === key;

            // Multi-line word-wrapping for Amount in Words
            if (key === 'amountWords') {
              const { line1, line2 } = splitAmountWords(amountWordsValue, 38);
              const secondLineY = field.y + 8.0;

              return (
                <div
                  key={key}
                  onClick={() => onFieldClick(key)}
                  className="cursor-pointer select-none"
                >
                  {/* Amount Words: Line 1 */}
                  <div
                    className={`absolute field-frame rounded-sm ${
                      mode === 'calibrate' && isActive
                        ? 'ring-2 ring-[#ff7a00] bg-[#ff7a00]/[0.03] z-20'
                        : mode === 'calibrate'
                        ? 'ring-1 ring-[#ff7a00]/20 hover:ring-[#ff7a00]/50 z-10'
                        : 'hover:outline hover:outline-1 hover:outline-[#ff7a00]/40 z-10'
                    }`}
                    style={{
                      left: `${field.x}mm`,
                      top: `${field.y}mm`,
                      fontSize: `${field.fontSize}pt`,
                      fontFamily: 'Consolas, "Courier New", monospace',
                      color: '#1a1a1a',
                      lineHeight: 1.2,
                      padding: '2px 4px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {line1 || (mode === 'calibrate' ? '[Amount in Words]' : '')}
                  </div>

                  {/* Amount Words: Line 2 */}
                  {line2 && (
                    <div
                      className={`absolute field-frame rounded-sm ${
                        mode === 'calibrate' && isActive
                          ? 'ring-2 ring-[#ff7a00] bg-[#ff7a00]/[0.03] z-20'
                          : mode === 'calibrate'
                          ? 'ring-1 ring-[#ff7a00]/20 hover:ring-[#ff7a00]/50 z-10'
                          : 'hover:outline hover:outline-1 hover:outline-[#ff7a00]/40 z-10'
                      }`}
                      style={{
                        left: `${field.x}mm`,
                        top: `${secondLineY}mm`,
                        fontSize: `${field.fontSize}pt`,
                        fontFamily: 'Consolas, "Courier New", monospace',
                        color: '#1a1a1a',
                        lineHeight: 1.2,
                        padding: '2px 4px',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {line2}
                    </div>
                  )}
                </div>
              );
            }

            const textValue = key === 'payee' ? payeeValue : numericDisplay;

            return (
              <div
                key={key}
                onClick={() => onFieldClick(key)}
                className={`absolute field-frame cursor-pointer select-none rounded-sm ${
                  mode === 'calibrate' && isActive
                    ? 'ring-2 ring-[#ff7a00] bg-[#ff7a00]/[0.03] z-20'
                    : mode === 'calibrate'
                    ? 'ring-1 ring-[#ff7a00]/20 hover:ring-[#ff7a00]/50 z-10'
                    : 'hover:outline hover:outline-1 hover:outline-[#ff7a00]/40 z-10'
                }`}
                style={{
                  left: `${field.x}mm`,
                  top: `${field.y}mm`,
                  fontSize: `${field.fontSize}pt`,
                  fontFamily: 'Consolas, "Courier New", monospace',
                  color: '#1a1a1a',
                  lineHeight: 1.2,
                  padding: '2px 4px',
                  whiteSpace: 'nowrap',
                }}
              >
                {textValue || (mode === 'calibrate' ? `[${field.label}]` : '')}
              </div>
            );
          })}

          {/* Date Field Overlay - 8-Digit Split */}
          {dateField && (() => {
            const isActive = activeField === 'date';
            return (
              <div
                onClick={() => onFieldClick('date')}
                className={`absolute cursor-pointer select-none rounded-sm flex items-center ${
                  mode === 'calibrate' && isActive
                    ? 'ring-2 ring-[#ff7a00] bg-[#ff7a00]/[0.02] z-20'
                    : mode === 'calibrate'
                    ? 'ring-1 ring-[#ff7a00]/20 hover:ring-[#ff7a00]/50 z-10'
                    : 'hover:outline hover:outline-1 hover:outline-[#ff7a00]/40 z-10'
                }`}
                style={{
                  left: `${dateField.x}mm`,
                  top: `${dateField.y}mm`,
                  gap: `${digitGap}mm`,
                  padding: '1px',
                }}
              >
                {dateDigits.map((digit, i) => (
                  <span
                    key={i}
                    className="font-mono font-bold text-center flex items-center justify-center bg-white/40 border border-dashed border-[#ff7a00]/30 text-[#1a1a1a]"
                    style={{
                      width: `${digitCellW}mm`,
                      height: '5.2mm',
                      fontSize: `${dateField.fontSize || 12}pt`,
                      lineHeight: 1,
                    }}
                  >
                    {digit}
                  </span>
                ))}
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
};

export default CheckCanvas;