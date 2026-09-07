'use client';

import React from 'react';
import Link from 'next/link';
import { AppShell } from '@/src/components/layout/AppShell';
import { Breadcrumb } from '@/src/components/ui/Breadcrumb';
import { GovernanceNavTabs } from '@/src/components/governance/GovernanceNavTabs';
import { 
  ShieldCheck, 
  FileText, 
  FileLock2, 
  ShieldAlert, 
  BarChart2, 
  ArrowRight, 
  CheckCircle2, 
  Lock, 
  Clock, 
  Download,
  AlertTriangle
} from 'lucide-react';

export default function GovernanceHubPage() {
  const governanceModules = [
    {
      title: 'Security & Document Audit Logs',
      href: '/governance/audit-logs',
      icon: FileText,
      badge: 'Audit Trail',
      badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
      description: 'Comprehensive immutable audit trail tracking user authentication, document access, downloads, permission changes, and administrative actions.',
      features: [
        'Filter by user, action type, and date range',
        'High-risk event severity tagging (DELETE, PURGE, PERMISSION)',
        'Full IP address and User-Agent inspection',
        'Direct CSV audit log export for external audits',
      ],
      actionLabel: 'Explore Audit Trail',
      gradient: 'from-blue-600 to-indigo-700',
    },
    {
      title: 'Retention Policies & Disposal',
      href: '/governance/retention',
      icon: FileLock2,
      badge: 'Lifecycle',
      badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
      description: 'Establish regulatory data retention schedules by document category. Monitor policy expiration candidates and execute disposition actions.',
      features: [
        'Document-type specific retention day rules',
        'Automated expiration candidate scanning',
        'Disposition enforcement (Archive vs Permanent Delete)',
        'Legal hold override protection (freezes purge)',
      ],
      actionLabel: 'Manage Retention Rules',
      gradient: 'from-amber-600 to-orange-700',
    },
    {
      title: 'Legal & Litigation Holds',
      href: '/governance/legal-holds',
      icon: ShieldAlert,
      badge: 'Preservation',
      badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
      description: 'Safeguard documents subject to legal investigations or regulatory audits. Freeze deletion, prevent purges, and manage case evidence custody.',
      features: [
        'Formal case number and litigation title tracking',
        'Document freeze prevents deletion & retention purges',
        'Add and remove target documents to case hold rosters',
        'Official case release with auditable release notes',
      ],
      actionLabel: 'Manage Legal Holds',
      gradient: 'from-rose-600 to-red-700',
    },
    {
      title: 'Compliance Reports & Analytics',
      href: '/governance/reports',
      icon: BarChart2,
      badge: 'Certification',
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      description: 'Generate compliance reports on repository governance health, retention compliance ratios, and security policy execution metrics.',
      features: [
        'Repository governance compliance scorecards',
        'Retention policy coverage & unmanaged document audits',
        'Legal hold coverage and active case summaries',
        'Exportable executive summaries for regulatory auditors',
      ],
      actionLabel: 'View Compliance Reports',
      gradient: 'from-emerald-600 to-teal-700',
    },
  ];

  return (
    <AppShell requiredRole="ROLE_COMPLIANCE_OFFICER">
      <div className="space-y-5 max-w-7xl mx-auto">
        {/* Breadcrumb & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-3 gap-3">
          <div>
            <Breadcrumb items={[{ label: 'Workspace', href: '/' }, { label: 'Compliance & Governance' }]} />
            <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-blue-700" />
              Compliance, Governance &amp; Legal Custody Console
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Enterprise governance suite for regulatory compliance, audit logging, data retention lifecycles, and legal holds.
            </p>
          </div>
          <div className="flex items-center gap-1.5 bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1 rounded-full font-semibold text-[11px] self-start sm:self-auto shrink-0">
            <ShieldCheck className="w-3.5 h-3.5" />
            ROLE_COMPLIANCE_OFFICER Access Verified
          </div>
        </div>

        {/* Top Sub-Navigation Tabs */}
        <GovernanceNavTabs />

        {/* Regulatory Governance Status Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 bg-white border border-slate-200/90 rounded-xl shadow-2xs flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
              <Lock className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Data Preservation</p>
              <p className="text-xs font-bold text-slate-800 truncate">WORM &amp; Legal Hold Active</p>
            </div>
          </div>

          <div className="p-3 bg-white border border-slate-200/90 rounded-xl shadow-2xs flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Audit Logging</p>
              <p className="text-xs font-bold text-slate-800 truncate">100% Events Synced &amp; Signed</p>
            </div>
          </div>

          <div className="p-3 bg-white border border-slate-200/90 rounded-xl shadow-2xs flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Lifecycle Engine</p>
              <p className="text-xs font-bold text-slate-800 truncate">Automated Retention Active</p>
            </div>
          </div>
        </div>

        {/* 4 Primary Governance Modules Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          {governanceModules.map((mod) => {
            const ModIcon = mod.icon;
            return (
              <div
                key={mod.href}
                className="bg-white border border-slate-200/90 hover:border-blue-300 rounded-2xl p-5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div className="space-y-3">
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${mod.gradient} text-white flex items-center justify-center shadow-xs shrink-0`}>
                        <ModIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <h2 className="text-sm font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                          {mod.title}
                        </h2>
                        <span className={`inline-block text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border mt-0.5 ${mod.badgeColor}`}>
                          {mod.badge}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {mod.description}
                  </p>

                  {/* Capability Bullets */}
                  <div className="pt-2 border-t border-slate-100 space-y-1.5">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Key Capabilities:
                    </p>
                    {mod.features.map((feat, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-[11px] text-slate-700">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Card Action Link */}
                <div className="pt-4 mt-4 border-t border-slate-100">
                  <Link
                    href={mod.href}
                    className="w-full py-2.5 px-4 bg-slate-50 hover:bg-blue-50 text-slate-800 hover:text-blue-700 border border-slate-200 hover:border-blue-200 font-bold text-xs rounded-xl flex items-center justify-between transition-all group-hover:border-blue-300"
                  >
                    <span>{mod.actionLabel}</span>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
