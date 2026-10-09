import React, { useState, useEffect, useCallback } from 'react';
import { FileText, SlidersHorizontal } from 'lucide-react';
import { LoadingOverlay } from './LoadingOverlay';
import { useToast } from './Toast';
import { loadTemplatesFromSupabase } from '../../core/templateRepository';
import { DEFAULT_INITIAL_TEMPLATE } from './defaultTemplate';
import type { CheckTemplate, AppMode } from '../../types';

interface MasterLayoutProps {
  children: (context: {
    mode: AppMode;
    template: CheckTemplate;
    setTemplate: React.Dispatch<React.SetStateAction<CheckTemplate>>;
    presets: CheckTemplate[];
    handleSelectPreset: (presetId: string) => void;
    handleTemplateSaved: (saved: CheckTemplate) => void;
  }) => React.ReactNode;
}

export const MasterLayout: React.FC<MasterLayoutProps> = ({ children }) => {
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [mode, setMode] = useState<AppMode>('generate');
  const [presets, setPresets] = useState<CheckTemplate[]>([DEFAULT_INITIAL_TEMPLATE]);
  const [template, setTemplate] = useState<CheckTemplate>(DEFAULT_INITIAL_TEMPLATE);

  useEffect(() => {
    let isMounted = true;

    // Capture toast in a ref snapshot so we can call it safely inside the async
    // function without adding it to the dependency array. Toast utility functions
    // are stable (they don't change between renders) but ESLint's exhaustive-deps
    // rule doesn't know that. Including `toast` as a dep would cause this effect
    // to re-run on every render where the Toast context re-creates its functions,
    // triggering a double Supabase fetch and potential state reset.
    const toastRef = toast;

    async function initializeTemplates() {
      setIsLoading(true);
      try {
        const loaded = await loadTemplatesFromSupabase();
        if (isMounted) {
          if (loaded && loaded.length > 0) {
            setPresets(loaded);
            setTemplate(loaded[0]);
          } else {
            setPresets([DEFAULT_INITIAL_TEMPLATE]);
            setTemplate(DEFAULT_INITIAL_TEMPLATE);
          }
        }
      } catch (err) {
        if (isMounted) {
          const errorMsg =
            err instanceof Error ? err.message : 'Could not query Supabase database.';
          toastRef.error(
            `${errorMsg} You can configure or test with local presets.`,
            'Supabase Sync Notice'
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void initializeTemplates();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // Intentionally omit `toast` — it is a stable utility reference, not
    // reactive state. Adding it would cause double-fetch on every re-render.
  }, []);

  const handleSelectPreset = useCallback(
    (presetId: string) => {
      const selected = presets.find((p) => p.id === presetId);
      if (selected) {
        setTemplate(selected);
      }
    },
    [presets]
  );

  const handleTemplateSaved = useCallback((saved: CheckTemplate) => {
    setPresets((current) => {
      const exists = current.some((item) => item.id === saved.id);
      if (exists) {
        return current.map((item) => (item.id === saved.id ? saved : item));
      }
      return [...current, saved];
    });
  }, []);

  return (
    <main className="neo-ui flex flex-col h-screen w-screen overflow-hidden bg-[#e8eef5] text-[#1c2b3a]">
      {isLoading && (
        <LoadingOverlay
          message="Connecting to Supabase..."
          subtext="Synchronizing check template records & coordinates"
        />
      )}

      {/* Top Application Header (Master Page Header Content PlaceHolder equivalent) */}
      <header className="neo-surface flex-none flex h-14 items-center justify-between border-b border-[#d6e0ea] bg-[#eef3f8] px-5 z-10">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <img src="./logo.png" alt="VisionBird Technologies" className="h-6 object-contain" />
            <span className="text-gray-300 font-light">|</span>
            <div>
              <h1 className="text-sm font-semibold text-[#1f1f1f] leading-tight">
                VisionBird CheckCraft
              </h1>
              <p className="text-[11px] text-[#777]">
                {mode === 'generate'
                  ? 'Check Generator Mode — Fill transaction fields & silent print'
                  : 'Template Calibrator Mode — Physical millimeter layout & printer matrix'}
              </p>
            </div>
          </div>
        </div>

        {/* Mode Toggle Switch */}
        <div className="neo-inset inline-flex rounded-lg bg-[#e0e8f0] p-1 border border-[#d6e0ea]">
          <button
            type="button"
            onClick={() => setMode('generate')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
              mode === 'generate'
                ? 'bg-white text-[#ff7a00] shadow-fluent-sm'
                : 'text-[#6b6b6b] hover:text-[#1f1f1f]'
            }`}
          >
            <FileText
              size={14}
              className={mode === 'generate' ? 'text-[#ff7a00]' : 'text-[#888]'}
            />
            Generate Check
          </button>

          <button
            type="button"
            onClick={() => setMode('calibrate')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
              mode === 'calibrate'
                ? 'bg-white text-[#ff7a00] shadow-fluent-sm'
                : 'text-[#6b6b6b] hover:text-[#1f1f1f]'
            }`}
          >
            <SlidersHorizontal
              size={14}
              className={mode === 'calibrate' ? 'text-[#ff7a00]' : 'text-[#888]'}
            />
            Calibrate Template
          </button>
        </div>
      </header>

      {/* Master Content Area (ContentPlaceHolder equivalent) */}
      <div className="flex-1 min-h-0 min-w-0 flex overflow-hidden">
        {children({
          mode,
          template,
          setTemplate,
          presets,
          handleSelectPreset,
          handleTemplateSaved,
        })}
      </div>

      {/* Footer Content PlaceHolder equivalent */}
    <footer className="neo-surface print-hide flex-none h-8 px-5 bg-[#eef3f8] border-t border-[#d6e0ea] flex items-center justify-between text-[11px] text-[#6b7b8d]">
  <div className="flex items-center gap-2">
    <span className="font-semibold text-[#1f1f1f]">VisionCheck Pro</span>
    <span className="text-[#d1d1d1]">•</span>
    <span className="text-[#777]">1:1 Micron Hardware Calibration Engine</span>
  </div>
  <div className="flex items-center gap-3">
    <span>Gujrat, Pakistan</span>
    <span className="text-[#d1d1d1]">•</span>
    <span className="text-[#1f1f1f] font-medium">
      © {new Date().getFullYear()} VisionBird Technologies. All rights reserved.
    </span>
  </div>
</footer>
    </main>
  );
};