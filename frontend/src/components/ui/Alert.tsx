import React from 'react';
import { ShieldAlert, AlertTriangle, Info, CheckCircle2 } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface AlertProps {
  type?: 'info' | 'warning' | 'error' | 'success' | 'legal-hold';
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export const Alert: React.FC<AlertProps> = ({
  type = 'info',
  title,
  children,
  className,
}) => {
  const styles = {
    info: 'bg-blue-50 border-blue-300 text-blue-900 icon-blue-700',
    warning: 'bg-amber-50 border-amber-300 text-amber-900 icon-amber-700',
    error: 'bg-red-50 border-red-300 text-red-900 icon-red-700',
    success: 'bg-emerald-50 border-emerald-300 text-emerald-900 icon-emerald-700',
    'legal-hold': 'bg-amber-100 border-amber-500 text-amber-950 font-medium shadow-xs',
  };

  const icons = {
    info: <Info className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />,
    warning: <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />,
    error: <AlertTriangle className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />,
    success: <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />,
    'legal-hold': <ShieldAlert className="w-4 h-4 text-amber-800 shrink-0 mt-0.5" />,
  };

  return (
    <div
      className={twMerge(
        clsx(
          'p-3 border rounded text-xs flex items-start gap-2.5',
          styles[type],
          className
        )
      )}
      role="alert"
    >
      {icons[type]}
      <div className="flex-1">
        {title && <div className="font-bold mb-0.5">{title}</div>}
        <div>{children}</div>
      </div>
    </div>
  );
};
