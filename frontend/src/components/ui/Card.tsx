import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface CardProps {
  title?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ title, action, children, className }) => {
  return (
    <div className={twMerge(clsx('kms-card bg-white border border-kms-slate-200 rounded p-4 shadow-2xs', className))}>
      {title && (
        <div className="flex items-center justify-between border-b border-kms-slate-200 pb-2.5 mb-3">
          <h3 className="text-xs font-bold text-kms-slate-900 uppercase tracking-wide">{title}</h3>
          {action && <div>{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
};
