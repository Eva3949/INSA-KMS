import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  className,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-1 disabled:opacity-50 disabled:pointer-events-none rounded gap-1.5 cursor-pointer';

  const variants = {
    primary: 'bg-blue-700 hover:bg-blue-800 text-white shadow-xs',
    secondary: 'bg-kms-slate-200 hover:bg-kms-slate-300 text-kms-slate-900',
    outline: 'border border-kms-slate-300 bg-white hover:bg-kms-slate-100 text-kms-slate-800',
    danger: 'bg-red-700 hover:bg-red-800 text-white shadow-xs',
    ghost: 'hover:bg-kms-slate-200 text-kms-slate-700',
  };

  const sizes = {
    sm: 'px-2.5 py-1 text-xs',
    md: 'px-3.5 py-1.5 text-xs',
    lg: 'px-4 py-2 text-sm',
  };

  return (
    <button
      className={twMerge(clsx(baseStyles, variants[variant], sizes[size], className))}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </button>
  );
};
