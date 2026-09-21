import { useState, useCallback } from 'react';
import CheckCanvas from '../features/canvas/CheckCanvas';
import CalibrationDashboard from '../features/calibration/CalibrationDashboard';
import { CheckGeneratorDashboard } from '../features/generator/CheckGeneratorDashboard';
import { getTodayIsoDate, isoDateToDigits } from '../components/helpers/dateUtils';
import { MasterLayout } from '../components/ui/MasterLayout';
import { DEFAULT_INITIAL_TEMPLATE } from '../components/ui/defaultTemplate';
import type {
  FieldKey,
  FieldLayout,
  SelectableItem,
  TransactionData,
} from '../types';

export default function App() {
  const [transaction, setTransaction] = useState<TransactionData>({
    payee: '',
    numericAmount: '',
    amountWords: '',
    date: isoDateToDigits(getTodayIsoDate()),
    isSelf: false,
    isPayeeAccountOnly: Boolean(DEFAULT_INITIAL_TEMPLATE.payeeAccountOnly),
    numberingSystem: 'lakh',
  });

  // Persist activeField to sessionStorage so that switching between Generate
  // and Calibrate modes does not silently reset the user's field selection.
  const [activeField, setActiveField] = useState<SelectableItem | null>(() => {
    try {
      const stored = sessionStorage.getItem('activeField');
      // Validate that the stored value is a known SelectableItem
      const valid: SelectableItem[] = ['date', 'payee', 'amountWords', 'numericAmount', 'stamp'];
      return (stored && valid.includes(stored as SelectableItem))
        ? (stored as SelectableItem)
        : 'date';
    } catch {
      return 'date';
    }
  });

  const handleFieldClick = useCallback((key: SelectableItem) => {
    setActiveField(key);
    try {
      sessionStorage.setItem('activeField', key);
    } catch {
      // ignore storage errors (private browsing / quota)
    }
  }, []);

  const [checkImageUrl, setCheckImageUrl] = useState<string | null>(() => {
    try {
      return localStorage.getItem('check-template-image');
    } catch {
      return null;
    }
  });

  return (
    <MasterLayout>
      {({ mode, template, setTemplate, presets, handleSelectPreset, handleTemplateSaved }) => {
        // useCallback is declared outside the render prop in the real React model,
        // but since this is a render-prop pattern we memoize via a stable key.
        // The function ref is re-created only when setTemplate changes (which is
        // stable from useState), preventing CalibrationDashboard from re-rendering
        // on every parent state change unrelated to the template.
        // eslint-disable-next-line react-hooks/exhaustive-deps
        const updateField = useCallback((key: FieldKey, patch: Partial<FieldLayout>) => {
          setTemplate((current) => ({
            ...current,
            fields: {
              ...current.fields,
              [key]: { ...current.fields[key], ...patch },
            },
          }));
        }, [setTemplate]);

        return (
          <>
            {/* Canvas Viewport */}
            <section
              id="check-print-root"
              className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden bg-[#f3f3f3]"
            >
              <CheckCanvas
                template={template}
                transaction={transaction}
                activeField={activeField}
                onFieldClick={handleFieldClick}
                checkImageUrl={checkImageUrl}
                onImageUpload={setCheckImageUrl}
                onImageClear={() => setCheckImageUrl(null)}
                mode={mode}
              />
            </section>

            {/* Sidebar Viewport */}
            <aside className="w-[410px] flex-none min-h-0 flex flex-col border-l border-[#dedede] bg-white overflow-hidden shadow-sm">
              {mode === 'generate' ? (
                <CheckGeneratorDashboard
                  template={template}
                  presets={presets}
                  onSelectPreset={handleSelectPreset}
                  transaction={transaction}
                  onTransactionChange={setTransaction}
                />
              ) : (
                <CalibrationDashboard
                  template={template}
                  onFieldChange={updateField}
                  activeField={activeField}
                  onFieldSelect={handleFieldClick}
                  onTemplateChange={setTemplate}
                  onTemplateSaved={handleTemplateSaved}
                />
              )}
            </aside>
          </>
        );
      }}
    </MasterLayout>
  );
}