import React from 'react';

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
          <div className="h-20 w-20 rounded-full border-[3px] border-[#e5e5e5] border-t-[#ff7a00] animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <img src="./logo.png" alt="VisionBird Technologies" className="w-12 object-contain" />
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
