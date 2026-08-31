'use client';

import React from 'react';
import { AppShell } from '@/src/components/layout/AppShell';
import { Breadcrumb } from '@/src/components/ui/Breadcrumb';
import { Button } from '@/src/components/ui/Button';
import { Badge } from '@/src/components/ui/Badge';
import { Table } from '@/src/components/ui/Table';
import { Pagination } from '@/src/components/ui/Pagination';
import { LoadingState } from '@/src/components/ui/States';
import { Input, Select } from '@/src/components/ui/Input';
import { Alert } from '@/src/components/ui/Alert';
import { ShieldCheck, Download, RefreshCw } from 'lucide-react';

interface AuditLogEntry {
  id: string;
  userId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081/api/v1';

const HIGH_RISK = ['DELETE', 'PURGE', 'ROLE_CHANGED', 'PERMISSION', 'LEGAL_HOLD', 'SETTINGS_UPDATED', 'DEACTIVATED', 'DELETED'];
const MEDIUM_RISK = ['CREATED', 'UPDATED', 'EXPORTED', 'RELEASED', 'RETENTION', 'UPLOAD'];

function severityOf(action: string): { label: string; variant: 'red' | 'amber' | 'slate' } {
  if (HIGH_RISK.some((k) => action.toUpperCase().includes(k))) return { label: 'HIGH', variant: 'red' };
  if (MEDIUM_RISK.some((k) => action.toUpperCase().includes(k))) return { label: 'MEDIUM', variant: 'amber' };
  return { label: 'INFO', variant: 'slate' };
}

export default function SecurityAuditLogsPage() {
  const [logs, setLogs] = React.useState<AuditLogEntry[]>([]);
  const [page, setPage] = React.useState(0);
  const [totalPages, setTotalPages] = React.useState(1);
  const [totalElements, setTotalElements] = React.useState(0);
  const [filterAction, setFilterAction] = React.useState('');
  const [filterUser, setFilterUser] = React.useState('');
  const [filterFrom, setFilterFrom] = React.useState('');
  const [filterTo, setFilterTo] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback((targetPage: number) => {
    setIsLoading(true);
    setError(null);
    const params = new URLSearchParams({ page: String(targetPage), size: '25' });
    if (filterAction) params.set('action', filterAction);
    if (filterUser) params.set('user', filterUser);
    if (filterFrom) params.set('from', new Date(filterFrom).toISOString());
    if (filterTo) params.set('to', new Date(filterTo).toISOString());

    const token = typeof window !== 'undefined' ? sessionStorage.getItem('kms_access_token') : null;
    fetch(`${API_BASE}/governance/audit-logs?${params.toString()}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load audit logs [${res.status}]`);
        return res.json();
      })
      .then((data: any) => {
        setLogs(data?.content ?? []);
        setTotalPages(data?.totalPages ?? 1);
        setTotalElements(data?.totalElements ?? 0);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Failed to load audit logs'))
      .finally(() => setIsLoading(false));
  }, [filterAction, filterUser, filterFrom, filterTo]);

  React.useEffect(() => {
    load(page);
  }, [load, page]);

  const handleExport = () => {
    const token = typeof window !== 'undefined' ? sessionStorage.getItem('kms_access_token') : null;
    fetch(`${API_BASE}/governance/audit-logs/export`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((res) => {
        if (!res.ok) throw new Error(`Export failed [${res.status}]`);
        return res.blob();
      })
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'kms-audit-logs.csv';
        link.click();
        window.URL.revokeObjectURL(url);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Export failed'));
  };

  const columns = [
    {
      header: 'Timestamp',
      accessor: (log: AuditLogEntry) => (
        <span className="font-mono text-xs text-kms-slate-700 font-semibold">
          {log.createdAt ? new Date(log.createdAt).toLocaleString() : '-'}
        </span>
      ),
    },
    {
      header: 'User Identity',
      accessor: (log: AuditLogEntry) => (
        <span className="text-xs text-kms-slate-900 font-medium font-mono">{log.userId}</span>
      ),
    },
    {
      header: 'Action Event',
      accessor: (log: AuditLogEntry) => {
        const sev = severityOf(log.action);
        return (
          <div className="flex items-center gap-1.5">
            <Badge label={sev.label} variant={sev.variant} />
            <span className="font-mono text-xs bg-kms-slate-100 text-blue-800 px-2 py-0.5 rounded font-bold border border-kms-slate-300">
              {log.action}
            </span>
          </div>
        );
      },
    },
    {
      header: 'Target Resource',
      accessor: (log: AuditLogEntry) => (
        <span className="text-xs text-kms-slate-600">
          {log.resourceType}: <strong className="font-mono">{log.resourceId?.slice(0, 8)}</strong>
        </span>
      ),
    },
    {
      header: 'Client IP',
      accessor: (log: AuditLogEntry) => (
        <span className="font-mono text-xs text-kms-slate-500">{log.ipAddress || '-'}</span>
      ),
    },
  ];

  return (
    <AppShell requiredRole="ROLE_COMPLIANCE_OFFICER">
      <div className="space-y-5">
        <div className="flex items-center justify-between border-b border-kms-slate-200 pb-3">
          <div>
            <Breadcrumb items={[{ label: 'Governance & Compliance' }, { label: 'Security Audit Logs' }]} />
            <h1 className="text-xl font-bold text-kms-slate-900 tracking-tight flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-blue-700" />
              Immutable Security Audit Logs & Access Trail
            </h1>
            <p className="text-[11px] text-kms-slate-500 mt-1">
              FR-22 immutable audit trail — {totalElements.toLocaleString()} recorded events
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" icon={<Download className="w-4 h-4" />} onClick={handleExport}>
              Export Audit Ledger (CSV)
            </Button>
            <Button variant="outline" size="sm" icon={<RefreshCw className="w-4 h-4" />} onClick={() => load(page)}>
              Refresh
            </Button>
          </div>
        </div>

        {error && <Alert type="error">{error}</Alert>}

        {/* Audit Filter Toolbar */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-white p-3 border border-kms-slate-200 rounded shadow-xs items-end">
          <Input
            label="Filter by User"
            placeholder="User ID / Email..."
            value={filterUser}
            onChange={(e) => { setFilterUser(e.target.value); setPage(0); }}
          />
          <Input
            label="Action Type"
            placeholder="e.g. DOCUMENT_UPLOAD"
            value={filterAction}
            onChange={(e) => { setFilterAction(e.target.value); setPage(0); }}
          />
          <Input
            label="Start Date"
            type="date"
            value={filterFrom}
            onChange={(e) => { setFilterFrom(e.target.value); setPage(0); }}
          />
          <Input
            label="End Date"
            type="date"
            value={filterTo}
            onChange={(e) => { setFilterTo(e.target.value); setPage(0); }}
          />
        </div>

        {isLoading ? (
          <LoadingState message="Loading audit logs..." />
        ) : (
          <>
            <Table
              columns={columns}
              data={logs}
              keyExtractor={(item) => item.id}
              emptyText="No audit logs match criteria."
            />
            {totalPages > 1 && (
              <Pagination
                currentPage={page + 1}
                totalPages={totalPages}
                totalItems={totalElements}
                pageSize={25}
                onPageChange={(p) => setPage(p - 1)}
              />
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
