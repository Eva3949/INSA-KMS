'use client';

import React from 'react';
import { AppShell } from '@/src/components/layout/AppShell';
import { Breadcrumb } from '@/src/components/ui/Breadcrumb';
import { Button } from '@/src/components/ui/Button';
import { Badge } from '@/src/components/ui/Badge';
import { Table } from '@/src/components/ui/Table';
import { Alert } from '@/src/components/ui/Alert';
import { LoadingState } from '@/src/components/ui/States';
import { kmsApi } from '@/src/lib/api';
import { BarChart2, ShieldAlert, FileClock, HardDrive, RefreshCw, AlertTriangle } from 'lucide-react';

interface StaleItem {
  id: string;
  title: string;
  departmentName?: string;
  confidentialityLevel: string;
  updatedAt?: string;
  createdAt: string;
  inactiveDays: number;
}

export default function ComplianceReportsPage() {
  const [staleItems, setStaleItems] = React.useState<StaleItem[]>([]);
  const [staleThreshold, setStaleThreshold] = React.useState(365);
  const [storageStats, setStorageStats] = React.useState<{ totalObjects: number; totalBytes: number; orphanedObjects: number } | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const loadData = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [staleRes, storageRes] = await Promise.all([
        kmsApi.admin.getStaleContentReport(staleThreshold, 100).catch(() => ({ data: [] })),
        kmsApi.admin.getStorageStats().catch(() => null),
      ]);
      setStaleItems((staleRes?.data as StaleItem[]) ?? []);
      setStorageStats(storageRes);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load compliance reports');
    } finally {
      setIsLoading(false);
    }
  }, [staleThreshold]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const staleColumns = [
    {
      header: 'Document Title',
      accessor: (item: StaleItem) => (
        <div>
          <span className="font-semibold text-kms-slate-900 block">{item.title}</span>
          <span className="text-[11px] text-kms-slate-400 font-mono">ID: {item.id}</span>
        </div>
      ),
    },
    {
      header: 'Department',
      accessor: (item: StaleItem) => (
        <span className="text-xs text-kms-slate-700">{item.departmentName || 'Unassigned'}</span>
      ),
    },
    {
      header: 'Classification',
      accessor: (item: StaleItem) => {
        const level = item.confidentialityLevel || 'INTERNAL';
        const color = level === 'RESTRICTED' ? 'red' : level === 'CONFIDENTIAL' ? 'amber' : 'blue';
        return <Badge label={level} variant={color as any} />;
      },
    },
    {
      header: 'Inactive Days',
      accessor: (item: StaleItem) => (
        <span className="font-semibold text-amber-700">{item.inactiveDays} days</span>
      ),
    },
    {
      header: 'Last Modified',
      accessor: (item: StaleItem) => (
        <span className="text-xs text-kms-slate-500 font-mono">
          {item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : new Date(item.createdAt).toLocaleDateString()}
        </span>
      ),
    },
  ];

  return (
    <AppShell requiredRole="ROLE_COMPLIANCE_OFFICER">
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-kms-slate-200 pb-3">
          <div>
            <Breadcrumb items={[{ label: 'Governance & Compliance' }, { label: 'Compliance Reports' }]} />
            <h1 className="text-xl font-bold text-kms-slate-900 tracking-tight flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-blue-700" />
              Compliance &amp; Retention Oversight Reports
            </h1>
            <p className="text-[11px] text-kms-slate-500 mt-1">
              FR-30 / FR-31 Auditable reports for stale content, storage utilization, and compliance governance posture.
            </p>
          </div>
          <Button variant="outline" size="sm" icon={<RefreshCw className="w-4 h-4" />} onClick={loadData}>
            Refresh Reports
          </Button>
        </div>

        {error && <Alert type="error">{error}</Alert>}

        {/* Overview Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-lg border border-kms-slate-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-amber-50 text-amber-700 rounded-lg">
              <FileClock className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-bold text-kms-slate-900">{staleItems.length}</div>
              <div className="text-xs text-kms-slate-500">Stale Content Items (&gt;{staleThreshold}d)</div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-kms-slate-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-blue-50 text-blue-700 rounded-lg">
              <HardDrive className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-bold text-kms-slate-900">
                {storageStats ? `${(storageStats.totalBytes / (1024 * 1024)).toFixed(1)} MB` : 'Loading...'}
              </div>
              <div className="text-xs text-kms-slate-500">Total Managed Storage Volume</div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-kms-slate-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-rose-50 text-rose-700 rounded-lg">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-bold text-kms-slate-900">
                {storageStats?.orphanedObjects ?? 0}
              </div>
              <div className="text-xs text-kms-slate-500">Orphaned Storage Objects</div>
            </div>
          </div>
        </div>

        {/* Stale & Orphaned Content Section */}
        <div className="bg-white rounded-lg border border-kms-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-kms-slate-900 flex items-center gap-2">
                <FileClock className="w-5 h-5 text-amber-600" />
                Stale &amp; Expired Content Review (FR-31)
              </h2>
              <p className="text-xs text-kms-slate-500">
                Documents with no recent access or modifications beyond threshold date eligible for compliance disposition review.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-kms-slate-600">Threshold:</span>
              <select
                value={staleThreshold}
                onChange={(e) => setStaleThreshold(Number(e.target.value))}
                className="text-xs border border-kms-slate-300 rounded px-2 py-1"
              >
                <option value={90}>90 Days</option>
                <option value={180}>180 Days</option>
                <option value={365}>365 Days (1 Year)</option>
                <option value={730}>730 Days (2 Years)</option>
              </select>
            </div>
          </div>

          {isLoading ? (
            <LoadingState message="Loading stale content analysis..." />
          ) : (
            <Table columns={staleColumns} data={staleItems} keyExtractor={(item) => item.id} emptyText="No stale content detected matching threshold criteria." />
          )}
        </div>
      </div>
    </AppShell>
  );
}
