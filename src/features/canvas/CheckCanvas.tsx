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

  /**
   * ── PHYSICAL SIZING STRATEGY ─────────────────────────────────────────────
   *
   * The paper element (#check-canvas-paper) always carries its dimensions in
   * physical millimetres:  width: Xmm / height: Ymm.
   *
   * WHY: This ensures that on print, Chromium resolves all `mm` values against
   * the actual print DPI (typically 600 dpi for cheque printers) rather than
   * the screen's 96 DPI reference pixel. Field positions stored as mm in the
   * database are therefore 1:1 accurate on paper — no implicit scaling occurs.
   *
   * SCREEN PREVIEW: A wrapper div (.canvas-scale-wrapper) applies a CSS
   * `transform: scale(scaleRatio)` to shrink or grow the fixed-mm paper to fit
   * the available viewport area. The paper element's own dimensions are NEVER
   * mutated for screen layout — only the outer wrapper is scaled.
   *
   * BASE_PX_PER_MM = 96 DPI ÷ 25.4 mm/inch ≈ 3.7795 px/mm
   * This is the CSS reference pixel density at which 1mm in CSS equals exactly
   * 1mm on a 96 DPI screen. The ResizeObserver measures how many reference
   * pixels are available in the container, then divides by the paper's natural
   * pixel size at 96 DPI to get the correct scale factor.
   */
  // 96 DPI CSS reference pixel: 1 inch = 96px, 1 inch = 25.4mm → 96/25.4 ≈ 3.7795
  const BASE_PX_PER_MM = 3.7795;

  const [scaleRatio, setScaleRatio] = useState<number>(1);
  const [showGrid, setShowGrid] = useState<boolean>(true);

  /**
   * recalcScale — measures the available container area and computes the CSS
   * transform scale factor needed to fit the fixed-mm paper within it.
   *
   * natural size = template.width × BASE_PX_PER_MM  (pixels at 96 DPI)
   * scaleRatio   = min(availW / naturalW, availH / naturalH)  (letterbox fit)
   */
  const recalcScale = useCallback(() => {
    if (!containerRef.current) return;
    // Subtract a visual gutter (40 px each side) so the paper never bleeds to
    // the container edge on screen.
    const availW = Math.max(50, containerRef.current.clientWidth - 80);
    const availH = Math.max(50, containerRef.current.clientHeight - 80);
    // Natural rendered pixel size of the paper at the CSS 96 DPI reference density
    const naturalW = (template.width || 178) * BASE_PX_PER_MM;
    const naturalH = (template.height || 74) * BASE_PX_PER_MM;
    const ratio = Math.min(availW / naturalW, availH / naturalH);
    setScaleRatio(Math.max(0.05, ratio)); // floor at 5% to avoid invisible paper
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

  // ── Transaction / Field Value Resolution ─────────────────────────────────
  // Decoupled transaction value resolution — falls back to template field
  // values in calibration mode so the canvas always shows sample content.
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
      {/**
       * ── Per-Template Print Stylesheet ──────────────────────────────────────
       *
       * This <style> block is injected at runtime and overrides the global
       * @page rule in index.css with the exact physical dimensions for this
       * specific cheque template.
       *
       * ORIENTATION LOCK:
       *   The `portrait` keyword is emitted unconditionally for every cheque
       *   template. This prevents Chromium and the OS printer driver from
       *   auto-swapping the page axes based on the paper's aspect ratio.
       *   All cheque layouts are treated as portrait print jobs.
       *
       * PAPER SIZE:
       *   Uses template.width × template.height in mm — the authoritative
       *   physical dimensions from the database. On print, Chromium resolves
       *   these at the printer DPI (not screen 96 DPI) for accurate sizing.
       *
       * HARDWARE OFFSET:
       *   Printer shift (printerOffsetXmm / printerOffsetYmm) is applied as
       *   translate() on the paper element. If inverted feed is configured,
       *   rotate(180deg) is chained onto the transform.
       *
       * SCALE WRAPPER:
       *   The .canvas-scale-wrapper is reset to no transform on print so the
       *   paper's mm dimensions are used verbatim with no additional scaling.
       *   (This rule lives in index.css global @media print.)
       */}
      <style>{`
        @media print {
          @page {
            /* Portrait lock — always portrait, regardless of width/height ratio.
               Overrides the global fallback in index.css for this template's
               exact physical cheque dimensions. */
            size: ${template.width}mm ${template.height}mm portrait;
            margin: 0;
          }
          html, body {
            /* Constrain the print page body to exactly the cheque paper area */
            width: ${template.width}mm !important;
            height: ${template.height}mm !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
          }
          #check-canvas-paper {
            /* Physical mm dimensions: browser resolves these at printer DPI.
               No pixel values here — coordinates are 1:1 with the physical cheque. */
            width: ${template.width}mm !important;
            height: ${template.height}mm !important;
            transform: translate(${template.printerOffsetXmm || 0}mm, ${template.printerOffsetYmm || 0}mm) ${
        template.inverted ? 'rotate(180deg)' : ''
      } !important;
            transform-origin: center center !important;
          }
          /* Strip the scanned background image on print — only text fields print */
          #check-canvas-paper img {
            display: none !important;
          }
        }
      `}</style>

      {/* Canvas Top Toolbar (hidden on print via .print-hide) */}
      <div className="print-hide flex-none flex items-center justify-between px-4 py-2.5 border-b border-[#e5e5e5] bg-white">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-[#1f1f1f]">
            {template.bankName}
          </span>
          <span className="text-[11px] text-[#666]">
            {template.width}mm × {template.height}mm ({template.orientation})
          </span>
          {/* Scale readout now shows the CSS transform scale ratio instead of a
              computed px/mm value, reflecting the screen preview scaling approach */}
          <span className="text-[11px] text-[#888]">
            Preview: {(scaleRatio * 100).toFixed(0)}%
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

      {/**
       * Canvas Viewport
       * The outer div (ref=containerRef) is measured by ResizeObserver so we
       * can compute the correct scale ratio for the transform wrapper below.
       */}
      <div
        id="print-canvas-area"
        ref={containerRef}
        className="relative flex min-h-0 min-w-0 flex-1 items-center justify-center overflow-auto p-6"
        style={{
          backgroundImage: 'radial-gradient(circle, #d8d8d8 1px, transparent 1px)',
          backgroundSize: '16px 16px',
        }}
      >
        {/**
         * ── Screen Preview Scale Wrapper (.canvas-scale-wrapper) ─────────────
         *
         * This wrapper applies `transform: scale(scaleRatio)` to shrink or
         * grow the paper for the screen preview only. It is NOT the paper
         * element itself — it wraps the paper and scales it from the center.
         *
         * On print, the global index.css rule `.canvas-scale-wrapper { transform: none !important }`
         * strips this transform so the browser uses the paper's physical mm
         * dimensions directly, with zero additional scaling.
         *
         * transform-origin: center center ensures scaling anchors to the paper's
         * midpoint so it stays centered in the viewport as the window resizes.
         */}
        <div
          className="canvas-scale-wrapper"
          style={{
            transform: `scale(${scaleRatio})`,
            transformOrigin: 'center center',
            // Reserve the correct space in the flex layout at the natural mm size
            // so the surrounding dotted background doesn't shift when scaling.
            width: `${template.width * BASE_PX_PER_MM}px`,
            height: `${template.height * BASE_PX_PER_MM}px`,
            flexShrink: 0,
          }}
        >
          {/**
           * ── Physical Cheque Paper (#check-canvas-paper) ──────────────────
           *
           * Dimensions are always in mm — the authoritative physical unit.
           * Never set width/height in px here; doing so would mean the paper
           * renders at screen-pixel size and the @page size directive would
           * then re-scale it on print, shifting all field coordinates.
           */}
          <div
            id="check-canvas-paper"
            className="relative bg-white check-paper-shadow"
            style={{
              width: `${template.width}mm`,
              height: `${template.height}mm`,
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

            {/* Scanned Background Check Image (hidden on print) */}
            {checkImageUrl && (
              <img
                src={checkImageUrl}
                alt="Check background template"
                className="absolute inset-0 w-full h-full object-fill pointer-events-none"
                draggable={false}
              />
            )}

            {/**
             * Grid Overlay (screen only — .print-hide)
             * Grid cell size is 10mm × 10mm, converted to px using BASE_PX_PER_MM
             * (since the paper element is in mm, the grid background-size in px
             * must account for the fact that CSS mm != screen px exactly).
             * We compute the px size as 10mm * BASE_PX_PER_MM to match the grid
             * to the physical mm coordinate system.
             */}
            {showGrid && (
              <div
                className="print-hide absolute inset-0 pointer-events-none"
                style={{
                  backgroundImage: `
                    linear-gradient(rgba(255,122,0,0.06) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(255,122,0,0.06) 1px, transparent 1px)
                  `,
                  // 10mm grid lines — use mm unit so they stay aligned with field coords
                  backgroundSize: `10mm 10mm`,
                }}
              />
            )}

            {/* Ruler Ticks (Top) — screen only */}
            <div className="print-hide absolute -top-5 left-0 right-0 flex justify-between pointer-events-none">
              {Array.from({ length: Math.floor(template.width / 10) + 1 }).map((_, i) => (
                <div key={i} className="flex flex-col items-center">
                  <div className="w-px h-2 bg-[#c0c0c0]" />
                  <span className="text-[8px] text-[#888] mt-0.5">{i * 10}</span>
                </div>
              ))}
            </div>

            {/* Ruler Ticks (Left) — screen only */}
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
    </div>
  );
};

export default CheckCanvas;