'use client';

import React, { useEffect, useState } from 'react';
import { AppShell } from '@/src/components/layout/AppShell';
import { Breadcrumb } from '@/src/components/ui/Breadcrumb';
import { Card } from '@/src/components/ui/Card';
import { LoadingState, ErrorState } from '@/src/components/ui/States';
import { 
  Users, 
  ShieldCheck, 
  HardDrive, 
  FileText, 
  Activity, 
  Settings,
  ArrowUpRight,
  UsersRound,
  KeyRound,
  BarChart2,
  FileCheck2,
  Tag,
  ScanLine,
  ShieldAlert,
  GitPullRequestArrow,
  Search,
  UserCheck,
  MessageSquare
} from 'lucide-react';
import Link from 'next/link';
import { kmsApi } from '@/src/lib/api';

interface AdminSummary {
  totalUsers: number;
  totalDocuments: number;
  storageQuotaUsedBytes: number;
  storageQuotaTotalBytes?: number;
  pendingOcrJobs?: number;
}

function formatBytes(bytes: number): string {
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) return `${gb.toFixed(1)} GB`;
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(0)} MB`;
}

export default function AdminDashboardPage() {
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSummary = () => {
    setIsLoading(true);
    setError(null);
    kmsApi.admin.getSummary()
      .then((data) => setSummary(data as AdminSummary))
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Failed to load admin summary';
        if (msg.includes('403')) {
          setError('You do not have permission to view the administration dashboard. ROLE_ADMIN is required.');
        } else {
          setError(msg);
        }
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadSummary();
  }, []);

  const storagePercent =
    summary?.storageQuotaTotalBytes && summary.storageQuotaTotalBytes > 0
      ? Math.min(100, (summary.storageQuotaUsedBytes / summary.storageQuotaTotalBytes) * 100)
      : null;

  return (
    <AppShell requiredRole="ROLE_ADMIN">
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-3 gap-3">
          <div>
            <Breadcrumb items={[{ label: 'Administration' }, { label: 'Admin Dashboard' }]} />
            <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Settings className="w-5 h-5 text-blue-700" />
              Enterprise Administration &amp; System Management Console
            </h1>
          </div>
          <div className="hidden md:flex items-center gap-1.5 bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1 rounded-full font-semibold text-[11px] shrink-0">
            <ShieldCheck className="w-3.5 h-3.5" />
            ROLE_ADMIN Access Verified
          </div>
        </div>

        {isLoading && <LoadingState message="Loading system metrics..." />}
        {error && <ErrorState title="Failed to load metrics" message={error} onRetry={loadSummary} />}

        {!isLoading && !error && summary && (
          <>
            {/* High-level metrics grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
              {/* Green card — Users */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 shadow-2xs">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Managed Users</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1 font-mono">{summary.totalUsers.toLocaleString()}</p>
                    <p className="text-[11px] text-emerald-700 font-semibold mt-1">Keycloak Realm Synced</p>
                  </div>
                  <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                    <Users className="w-5 h-5 text-emerald-700" />
                  </div>
                </div>
              </div>

              {/* Blue card — Documents */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 shadow-2xs">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Total Documents</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1 font-mono">{summary.totalDocuments.toLocaleString()}</p>
                    <p className="text-[11px] text-slate-500 mt-1">Repository total</p>
                  </div>
                  <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 text-blue-700" />
                  </div>
                </div>
              </div>

              {/* Cyan card — Storage */}
              <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4 shadow-2xs">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Storage Used</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1 font-mono">{formatBytes(summary.storageQuotaUsedBytes)}</p>
                    {storagePercent !== null && (
                      <div className="w-full bg-cyan-200 rounded-full h-1 mt-2">
                        <div
                          className={`h-1 rounded-full ${storagePercent > 80 ? 'bg-rose-500' : storagePercent > 60 ? 'bg-amber-500' : 'bg-cyan-600'}`}
                          style={{ width: `${storagePercent}%` }}
                        />
                      </div>
                    )}
                  </div>
                  <div className="w-9 h-9 rounded-full bg-cyan-100 flex items-center justify-center shrink-0">
                    <HardDrive className="w-5 h-5 text-cyan-700" />
                  </div>
                </div>
              </div>

              {/* Amber/Green card — OCR Queue */}
              <div className={`${(summary.pendingOcrJobs ?? 0) === 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'} border rounded-lg p-4 shadow-2xs`}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">OCR Queue</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1 font-mono">{(summary.pendingOcrJobs ?? 0)} Pending</p>
                    <p className={`text-[11px] font-semibold mt-1 ${(summary.pendingOcrJobs ?? 0) === 0 ? 'text-emerald-700' : 'text-amber-700'}`}>
                      {(summary.pendingOcrJobs ?? 0) === 0 ? 'Pipeline Healthy' : 'Processing...'}
                    </p>
                  </div>
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${(summary.pendingOcrJobs ?? 0) === 0 ? 'bg-emerald-100' : 'bg-amber-100'}`}>
                    <Activity className={`w-5 h-5 ${(summary.pendingOcrJobs ?? 0) === 0 ? 'text-emerald-700' : 'text-amber-700'}`} />
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Enterprise Administration & System Settings Hub */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <Settings className="w-4 h-4 text-blue-700" />
                Administrative Command Center &amp; System Configuration
              </h2>
              <p className="text-xs text-slate-500">
                Centralized management for identity, content schemas, storage pipelines, security policies, and system settings.
              </p>
            </div>
            <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-md self-start sm:self-auto">
              15 Management Sub-modules
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Category 1: Identity & Access Management */}
            <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-2xs space-y-3">
              <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
                <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">Identity &amp; Access Management</h3>
                  <p className="text-[11px] text-slate-500">User accounts, roles, Keycloak sync, and organization units</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <Link
                  href="/admin/users"
                  className="p-2.5 bg-slate-50/70 hover:bg-blue-50/80 border border-slate-200/80 hover:border-blue-300 rounded-lg flex items-center justify-between group transition-all"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Users className="w-4 h-4 text-slate-400 group-hover:text-blue-600 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-800 group-hover:text-blue-700">Users Directory</div>
                      <div className="text-[10px] text-slate-500 truncate">Manage employee accounts, credentials and activation states</div>
                    </div>
                  </div>
                  <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 shrink-0" />
                </Link>

                <Link
                  href="/admin/groups"
                  className="p-2.5 bg-slate-50/70 hover:bg-blue-50/80 border border-slate-200/80 hover:border-blue-300 rounded-lg flex items-center justify-between group transition-all"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <UsersRound className="w-4 h-4 text-slate-400 group-hover:text-blue-600 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-800 group-hover:text-blue-700">Groups &amp; Teams</div>
                      <div className="text-[10px] text-slate-500 truncate">Departmental groups, distribution teams and memberships</div>
                    </div>
                  </div>
                  <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 shrink-0" />
                </Link>

                <Link
                  href="/admin/roles"
                  className="p-2.5 bg-slate-50/70 hover:bg-blue-50/80 border border-slate-200/80 hover:border-blue-300 rounded-lg flex items-center justify-between group transition-all"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <ShieldCheck className="w-4 h-4 text-slate-400 group-hover:text-blue-600 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-800 group-hover:text-blue-700">Roles &amp; Permissions</div>
                      <div className="text-[10px] text-slate-500 truncate">System role definitions, privilege tiers and scope assignments</div>
                    </div>
                  </div>
                  <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 shrink-0" />
                </Link>

                <Link
                  href="/admin/permissions"
                  className="p-2.5 bg-slate-50/70 hover:bg-blue-50/80 border border-slate-200/80 hover:border-blue-300 rounded-lg flex items-center justify-between group transition-all"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <KeyRound className="w-4 h-4 text-slate-400 group-hover:text-blue-600 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-800 group-hover:text-blue-700">Access Control Matrix</div>
                      <div className="text-[10px] text-slate-500 truncate">Folder-level ACLs and document permission inheritance</div>
                    </div>
                  </div>
                  <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 shrink-0" />
                </Link>

                <Link
                  href="/hr/employees"
                  className="p-2.5 bg-slate-50/70 hover:bg-blue-50/80 border border-slate-200/80 hover:border-blue-300 rounded-lg flex items-center justify-between group transition-all"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <UserCheck className="w-4 h-4 text-slate-400 group-hover:text-blue-600 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-800 group-hover:text-blue-700">HR &amp; Employees Directory</div>
                      <div className="text-[10px] text-slate-500 truncate">Staff records, job positions, employee IDs and hierarchy</div>
                    </div>
                  </div>
                  <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 shrink-0" />
                </Link>
              </div>
            </div>

            {/* Category 2: Repository Taxonomies & Schemas */}
            <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-2xs space-y-3">
              <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0">
                  <FileCheck2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">Schemas, Tags &amp; Quotas</h3>
                  <p className="text-[11px] text-slate-500">Document types, classification taxonomies, and department quotas</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <Link
                  href="/admin/document-types"
                  className="p-2.5 bg-slate-50/70 hover:bg-indigo-50/80 border border-slate-200/80 hover:border-indigo-300 rounded-lg flex items-center justify-between group transition-all"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <FileCheck2 className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-800 group-hover:text-indigo-700">Document Categories &amp; Schemas</div>
                      <div className="text-[10px] text-slate-500 truncate">Custom metadata schemas, mandatory field rules and templates</div>
                    </div>
                  </div>
                  <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 shrink-0" />
                </Link>

                <Link
                  href="/admin/taxonomy"
                  className="p-2.5 bg-slate-50/70 hover:bg-indigo-50/80 border border-slate-200/80 hover:border-indigo-300 rounded-lg flex items-center justify-between group transition-all"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Tag className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-800 group-hover:text-indigo-700">Taxonomy &amp; Tags Manager</div>
                      <div className="text-[10px] text-slate-500 truncate">Controlled vocabulary, system tags and topic hierarchies</div>
                    </div>
                  </div>
                  <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 shrink-0" />
                </Link>

                <Link
                  href="/admin/departments"
                  className="p-2.5 bg-slate-50/70 hover:bg-indigo-50/80 border border-slate-200/80 hover:border-indigo-300 rounded-lg flex items-center justify-between group transition-all"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <BarChart2 className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-800 group-hover:text-indigo-700">Department Quotas</div>
                      <div className="text-[10px] text-slate-500 truncate">Storage size thresholds and departmental consumption monitoring</div>
                    </div>
                  </div>
                  <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 shrink-0" />
                </Link>

                <Link
                  href="/discussions"
                  className="p-2.5 bg-slate-50/70 hover:bg-indigo-50/80 border border-slate-200/80 hover:border-indigo-300 rounded-lg flex items-center justify-between group transition-all"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <MessageSquare className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-800 group-hover:text-indigo-700">Discussions &amp; Forum Moderation</div>
                      <div className="text-[10px] text-slate-500 truncate">Manage forum topics, close/reopen threads and moderate video discussions</div>
                    </div>
                  </div>
                  <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 shrink-0" />
                </Link>
              </div>
            </div>

            {/* Category 3: Storage & System Infrastructure */}
            <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-2xs space-y-3">
              <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
                <div className="w-7 h-7 rounded-lg bg-cyan-50 text-cyan-700 flex items-center justify-center shrink-0">
                  <HardDrive className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">Storage &amp; Pipeline Engine</h3>
                  <p className="text-[11px] text-slate-500">MinIO storage, checksum verifications, and OCR conversion pipeline</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <Link
                  href="/admin/storage"
                  className="p-2.5 bg-slate-50/70 hover:bg-cyan-50/80 border border-slate-200/80 hover:border-cyan-300 rounded-lg flex items-center justify-between group transition-all"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <HardDrive className="w-4 h-4 text-slate-400 group-hover:text-cyan-600 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-800 group-hover:text-cyan-700">Storage &amp; Checksum Integrity</div>
                      <div className="text-[10px] text-slate-500 truncate">MinIO bucket health, SHA-256 validation and file bitrot scans</div>
                    </div>
                  </div>
                  <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-cyan-600 shrink-0" />
                </Link>

                <Link
                  href="/admin/ocr"
                  className="p-2.5 bg-slate-50/70 hover:bg-cyan-50/80 border border-slate-200/80 hover:border-cyan-300 rounded-lg flex items-center justify-between group transition-all"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <ScanLine className="w-4 h-4 text-slate-400 group-hover:text-cyan-600 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-800 group-hover:text-cyan-700">OCR Queue &amp; Processing Jobs</div>
                      <div className="text-[10px] text-slate-500 truncate">Tesseract OCR text extraction, PDF text layers and job retries</div>
                    </div>
                  </div>
                  <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-cyan-600 shrink-0" />
                </Link>

                <Link
                  href="/admin/reports"
                  className="p-2.5 bg-slate-50/70 hover:bg-cyan-50/80 border border-slate-200/80 hover:border-cyan-300 rounded-lg flex items-center justify-between group transition-all"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <BarChart2 className="w-4 h-4 text-slate-400 group-hover:text-cyan-600 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-800 group-hover:text-cyan-700">Usage Analytics &amp; Reports</div>
                      <div className="text-[10px] text-slate-500 truncate">Download frequency, storage growth trends and stale documents</div>
                    </div>
                  </div>
                  <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-cyan-600 shrink-0" />
                </Link>
              </div>
            </div>

            {/* Category 4: Security, Workflows & System Configuration */}
            <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-2xs space-y-3">
              <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">Security &amp; System Configuration</h3>
                  <p className="text-[11px] text-slate-500">Security audit alerts, approval workflows, and system settings</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <Link
                  href="/admin/security"
                  className="p-2.5 bg-slate-50/70 hover:bg-emerald-50/80 border border-slate-200/80 hover:border-emerald-300 rounded-lg flex items-center justify-between group transition-all"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <ShieldAlert className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-800 group-hover:text-emerald-700">Security Alerts &amp; Monitoring</div>
                      <div className="text-[10px] text-slate-500 truncate">Unauthorized access warnings, checksum mismatch logs &amp; anomalies</div>
                    </div>
                  </div>
                  <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 shrink-0" />
                </Link>

                <Link
                  href="/admin/approvals"
                  className="p-2.5 bg-slate-50/70 hover:bg-emerald-50/80 border border-slate-200/80 hover:border-emerald-300 rounded-lg flex items-center justify-between group transition-all"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <GitPullRequestArrow className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-800 group-hover:text-emerald-700">Approval Workflows</div>
                      <div className="text-[10px] text-slate-500 truncate">Configure document publication sign-off stages and routing rules</div>
                    </div>
                  </div>
                  <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 shrink-0" />
                </Link>

                <Link
                  href="/admin/settings"
                  className="p-2.5 bg-slate-50/70 hover:bg-emerald-50/80 border border-slate-200/80 hover:border-emerald-300 rounded-lg flex items-center justify-between group transition-all"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Settings className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-800 group-hover:text-emerald-700">System Settings &amp; Presets</div>
                      <div className="text-[10px] text-slate-500 truncate">Keycloak realm URLs, backup management, storage URLs &amp; SMTP test</div>
                    </div>
                  </div>
                  <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 shrink-0" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
