import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X, type LucideIcon } from 'lucide-react';
import type { ToastMessage, ToastType } from '../../types';

interface ToastContextValue {
  showToast: (type: ToastType, message: string, title?: string, duration?: number) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const ICONS: Record<ToastType, LucideIcon> = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
  warning: AlertTriangle,
};

const STYLES: Record<ToastType, { border: string; bg: string; iconColor: string; titleColor: string }> = {
  success: {
    border: 'border-[#107c41]/30',
    bg: 'bg-[#f1faf3]',
    iconColor: 'text-[#107c41]',
    titleColor: 'text-[#107c41]',
  },
  error: {
    border: 'border-[#d13438]/30',
    bg: 'bg-[#fdf3f4]',
    iconColor: 'text-[#d13438]',
    titleColor: 'text-[#d13438]',
  },
  info: {
    border: 'border-[#0078d4]/30',
    bg: 'bg-[#eff6fc]',
    iconColor: 'text-[#0078d4]',
    titleColor: 'text-[#0078d4]',
  },
  warning: {
    border: 'border-[#ffaa44]/40',
    bg: 'bg-[#fff9f2]',
    iconColor: 'text-[#b75d00]',
    titleColor: 'text-[#b75d00]',
  },
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (type: ToastType, message: string, title?: string, duration = 4000) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const newToast: ToastMessage = { id, type, message, title, duration };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  const success = useCallback(
    (message: string, title = 'Success') => showToast('success', message, title),
    [showToast]
  );
  const error = useCallback(
    (message: string, title = 'Error') => showToast('error', message, title, 5000),
    [showToast]
  );
  const info = useCallback(
    (message: string, title = 'Notice') => showToast('info', message, title),
    [showToast]
  );
  const warning = useCallback(
    (message: string, title = 'Warning') => showToast('warning', message, title),
    [showToast]
  );

  return (
    <ToastContext.Provider value={{ showToast, success, error, info, warning, removeToast }}>
      {children}
      {/* Top-Middle Toast Notification Container */}
      <aside
        aria-live="polite"
        className="fixed top-5 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2.5 w-full max-w-sm pointer-events-none px-4"
      >
        {toasts.map((toast) => {
          const IconComponent = ICONS[toast.type];
          const style = STYLES[toast.type];

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-lg border shadow-fluent-lg transition-all animate-in fade-in slide-in-from-top-3 duration-200 bg-white w-full ${style.border}`}
              style={{ minWidth: '280px', maxWidth: '380px' }}
            >
              <div className={`mt-0.5 flex-none ${style.iconColor}`}>
                <IconComponent size={18} />
              </div>
              <div className="flex-1 min-w-0">
                {toast.title && (
                  <h4 className={`text-xs font-semibold leading-snug ${style.titleColor}`}>
                    {toast.title}
                  </h4>
                )}
                <p className="text-xs text-[#242424] leading-relaxed mt-0.5 break-words">
                  {toast.message}
                </p>
              </div>
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="flex-none text-[#777] hover:text-[#1f1f1f] p-0.5 rounded transition-colors"
                aria-label="Dismiss notification"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </aside>
    </ToastContext.Provider>
  );
};

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}