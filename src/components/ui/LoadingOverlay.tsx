import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingOverlayProps {
  message?: string;
  subtext?: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  message = 'Connecting to Supabase...',
  subtext = 'Synchronizing bank template coordinates',
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#f3f3f3]/85 backdrop-blur-xs transition-opacity animate-in fade-in duration-150">
      <div className="flex flex-col items-center bg-white border border-[#e5e5e5] rounded-xl px-8 py-6 shadow-fluent-lg max-w-sm text-center">
        <div className="relative flex items-center justify-center mb-4">
          <div className="w-12 h-12 rounded-full bg-[#eff6fc] flex items-center justify-center">
            <Loader2 size={26} className="text-[#0078d4] animate-spin" />
          </div>
        </div>
        <h3 className="text-sm font-semibold text-[#1f1f1f]">{message}</h3>
        {subtext && <p className="text-xs text-[#777] mt-1">{subtext}</p>}
        <div className="mt-4 w-36 h-1 bg-[#f0f0f0] rounded-full overflow-hidden">
          <div className="h-full bg-[#0078d4] rounded-full animate-pulse" style={{ width: '65%' }} />
        </div>
      </div>
    </div>
  );
};
