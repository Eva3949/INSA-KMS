'use client';

import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  maxWidth = 'lg',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const widthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '4xl': 'max-w-4xl',
  };

  return (
    <div className="fixed inset-0 z-50 bg-kms-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4">
      <div
        className={`bg-white border border-kms-slate-300 rounded-lg shadow-2xl w-full max-w-full sm:${widthClasses[maxWidth]} ${widthClasses[maxWidth]} overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[90vh]`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Modal Header */}
        <div className="p-3 sm:p-4 border-b border-kms-slate-200 flex items-center justify-between bg-kms-slate-50 shrink-0 gap-2">
          <div className="min-w-0 flex-1">
            <h2 id="modal-title" className="text-sm sm:text-base font-bold text-kms-slate-900 tracking-tight truncate">
              {title}
            </h2>
            {subtitle && <p className="text-[11px] sm:text-xs text-kms-slate-500 mt-0.5 truncate">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="p-1 text-kms-slate-400 hover:text-kms-slate-700 rounded hover:bg-kms-slate-200 transition-colors shrink-0"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-3.5 sm:p-5 overflow-y-auto flex-1 text-xs text-kms-slate-800 space-y-4">
          {children}
        </div>

        {/* Modal Footer */}
        {footer && (
          <div className="p-3 bg-kms-slate-50 border-t border-kms-slate-200 flex flex-wrap items-center justify-end gap-2 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
