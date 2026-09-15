import { useState } from 'react';
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

  const [activeField, setActiveField] = useState<SelectableItem | null>('date');

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
        const updateField = (key: FieldKey, patch: Partial<FieldLayout>) => {
          setTemplate((current) => ({
            ...current,
            fields: {
              ...current.fields,
              [key]: { ...current.fields[key], ...patch },
            },
          }));
        };

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
                onFieldClick={setActiveField}
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
                  onFieldSelect={setActiveField}
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