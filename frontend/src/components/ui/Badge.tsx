import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Lock, ShieldAlert, Clock, Archive, Trash2, CheckCircle2 } from 'lucide-react';

export type ClassificationType = 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED';
export type StateBadgeType = 'CHECKED_OUT' | 'LEGAL_HOLD' | 'PENDING_APPROVAL' | 'APPROVED' | 'ARCHIVED' | 'RECYCLE_BIN';

interface BadgeProps {
  label: string;
  classification?: ClassificationType;
  stateBadge?: StateBadgeType;
  variant?: 'slate' | 'blue' | 'amber' | 'red' | 'green' | 'purple';
  icon?: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  classification,
  stateBadge,
  variant = 'slate',
  icon,
  className,
}) => {
  const base = 'inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded border uppercase tracking-wider gap-1.5 shrink-0';

  let customStyles = '';
  let customIcon = icon;

  if (classification === 'PUBLIC') {
    customStyles = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    customIcon = customIcon || <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />;
  } else if (classification === 'INTERNAL') {
    customStyles = 'bg-blue-50 text-blue-700 border-blue-200';
    customIcon = customIcon || <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />;
  } else if (classification === 'CONFIDENTIAL') {
    customStyles = 'bg-amber-50 text-amber-800 border-amber-200';
    customIcon = customIcon || <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />;
  } else if (classification === 'RESTRICTED') {
    customStyles = 'bg-rose-50 text-rose-700 border-rose-200';
    customIcon = customIcon || <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />;
  }


  if (stateBadge === 'CHECKED_OUT') {
    customStyles = 'bg-purple-50 text-purple-800 border-purple-300';
    customIcon = customIcon || <Lock className="w-3 h-3 text-purple-700" />;
  } else if (stateBadge === 'LEGAL_HOLD') {
    customStyles = 'bg-amber-100 text-amber-900 border-amber-400 font-bold';
    customIcon = customIcon || <ShieldAlert className="w-3 h-3 text-amber-800" />;
  } else if (stateBadge === 'PENDING_APPROVAL') {
    customStyles = 'bg-amber-50 text-amber-800 border-amber-200';
    customIcon = customIcon || <Clock className="w-3 h-3 text-amber-600" />;
  } else if (stateBadge === 'APPROVED') {
    customStyles = 'bg-emerald-50 text-emerald-800 border-emerald-200';
    customIcon = customIcon || <CheckCircle2 className="w-3 h-3 text-emerald-600" />;
  } else if (stateBadge === 'ARCHIVED') {
    customStyles = 'bg-kms-slate-100 text-kms-slate-700 border-kms-slate-300';
    customIcon = customIcon || <Archive className="w-3 h-3 text-kms-slate-500" />;
  } else if (stateBadge === 'RECYCLE_BIN') {
    customStyles = 'bg-red-50 text-red-700 border-red-200';
    customIcon = customIcon || <Trash2 className="w-3 h-3 text-red-600" />;
  }

  const variants = {
    slate: 'bg-kms-slate-100 text-kms-slate-700 border-kms-slate-300',
    blue: 'bg-blue-50 text-blue-800 border-blue-200',
    amber: 'bg-amber-50 text-amber-800 border-amber-200',
    red: 'bg-red-50 text-red-800 border-red-200',
    green: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    purple: 'bg-purple-50 text-purple-800 border-purple-200',
  };

  const finalStyle = customStyles || variants[variant];

  return (
    <span className={twMerge(clsx(base, finalStyle, className))}>
      {customIcon}
      {label}
    </span>
  );
};
