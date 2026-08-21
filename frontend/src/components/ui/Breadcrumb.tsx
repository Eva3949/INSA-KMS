import React from 'react';
import { ChevronRight, Home } from 'lucide-react';
import Link from 'next/link';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({ items }) => {
  return (
    <nav className="flex items-center gap-1.5 text-xs text-kms-slate-500 mb-1" aria-label="Breadcrumb">
      <Link href="/library" className="hover:text-kms-slate-800 flex items-center gap-1">
        <Home className="w-3 h-3 text-kms-slate-400" />
        <span>Workspace</span>
      </Link>
      {items.map((item, idx) => {
        const isLast = idx === items.length - 1;
        return (
          <React.Fragment key={idx}>
            <ChevronRight className="w-3 h-3 text-kms-slate-400 shrink-0" />
            {isLast || !item.href ? (
              <span className="font-semibold text-kms-slate-800 truncate max-w-xs">{item.label}</span>
            ) : (
              <Link href={item.href} className="hover:text-kms-slate-800 truncate max-w-xs">
                {item.label}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};
