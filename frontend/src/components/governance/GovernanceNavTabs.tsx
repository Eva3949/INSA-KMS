'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShieldCheck, FileText, FileLock2, ShieldAlert, BarChart2, LayoutGrid } from 'lucide-react';

export const GovernanceNavTabs: React.FC = () => {
  const pathname = usePathname();

  const tabs = [
    {
      href: '/governance',
      label: 'Overview & Console',
      icon: LayoutGrid,
      exact: true,
    },
    {
      href: '/governance/audit-logs',
      label: 'Audit Logs',
      icon: FileText,
      exact: false,
    },
    {
      href: '/governance/retention',
      label: 'Retention Policies',
      icon: FileLock2,
      exact: false,
    },
    {
      href: '/governance/legal-holds',
      label: 'Legal Holds',
      icon: ShieldAlert,
      exact: false,
    },
    {
      href: '/governance/reports',
      label: 'Compliance Reports',
      icon: BarChart2,
      exact: false,
    },
  ];

  return (
    <div className="border-b border-slate-200 bg-white rounded-xl p-1.5 shadow-2xs mb-5">
      <nav className="flex items-center gap-1 overflow-x-auto scrollbar-none" aria-label="Governance Navigation Tabs">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.exact
            ? pathname === tab.href
            : pathname === tab.href || pathname.startsWith(tab.href + '/');

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-lg transition-all whitespace-nowrap select-none ${
                isActive
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
};
