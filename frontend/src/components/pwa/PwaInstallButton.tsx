'use client';

import React from 'react';
import { Download, MonitorCheck } from 'lucide-react';
import { usePwa } from '@/src/lib/pwa-context';

interface PwaInstallButtonProps {
  className?: string;
  variant?: 'header' | 'sidebar' | 'banner';
}

export const PwaInstallButton: React.FC<PwaInstallButtonProps> = ({
  className = '',
  variant = 'header',
}) => {
  const { isInstalled, promptInstall, openInstallModal } = usePwa();

  // If already running in standalone window, don't show install button in header
  if (isInstalled && variant === 'header') {
    return null;
  }

  // If already installed and variant is sidebar, show verified status
  if (isInstalled && variant === 'sidebar') {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-semibold">
        <MonitorCheck className="w-4 h-4 text-emerald-600 shrink-0" />
        <span className="truncate">Desktop App Active</span>
      </div>
    );
  }

  if (variant === 'sidebar') {
    return (
      <button
        onClick={openInstallModal}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 bg-gradient-to-r from-blue-600/10 to-indigo-600/10 hover:from-blue-600/20 hover:to-indigo-600/20 border border-blue-200 rounded-xl text-xs font-bold text-blue-900 transition-all shadow-2xs group ${className}`}
        aria-label="Install INSA KMS App"
      >
        <div className="flex items-center gap-2 truncate">
          <div className="p-1.5 bg-blue-600 text-white rounded-lg group-hover:scale-105 transition-transform shrink-0">
            <Download className="w-3.5 h-3.5" />
          </div>
          <div className="text-left truncate">
            <div className="text-xs font-extrabold text-slate-900 leading-tight">Install App</div>
            <div className="text-[10px] text-blue-700 font-normal">Desktop & Mobile</div>
          </div>
        </div>
        <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 bg-blue-600 text-white rounded shrink-0">
          PWA
        </span>
      </button>
    );
  }

  // Default: Header button (like YouTube / CapCut)
  return (
    <button
      onClick={() => promptInstall()}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 hover:text-blue-900 border border-blue-200/80 font-bold text-xs transition-all shadow-2xs hover:shadow-xs active:scale-95 ${className}`}
      title="Install INSA KMS as a desktop or mobile application"
      aria-label="Install INSA KMS Application"
    >
      <Download className="w-3.5 h-3.5 text-blue-600 shrink-0 animate-pulse" />
      <span className="hidden sm:inline">Install App</span>
    </button>
  );
};
