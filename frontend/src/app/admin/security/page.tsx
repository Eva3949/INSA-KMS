'use client';

import React from 'react';
import { AppShell } from '@/src/components/layout/AppShell';
import { Breadcrumb } from '@/src/components/ui/Breadcrumb';
import { Button } from '@/src/components/ui/Button';
import { Card } from '@/src/components/ui/Card';
import { Table } from '@/src/components/ui/Table';
import { Badge } from '@/src/components/ui/Badge';
import { Pagination } from '@/src/components/ui/Pagination';
import { LoadingState } from '@/src/components/ui/States';
import { Input } from '@/src/components/ui/Input';
import { Alert } from '@/src/components/ui/Alert';
import { kmsApi } from '@/src/lib/api';
import { ShieldAlert, RefreshCw, Download, Send } from 'lucide-react';

interface AuditEvent {
  id: string;
  userId: string;
  userEmail?: string | null;
  action: string;
  resourceType: string;
  resourceId: string;
  ipAddress?: string | null;
  createdAt: string;
}

const HIGH_RISK = ['DELETED', 'PURGE', 'ROLE_CHANGED', 'PERMISSION', 'LEGAL_HOLD', 'SETTINGS_UPDATED', 'DEACTIVATED'];
const MEDIUM_RISK = ['CREATED', 'UPDATED', 'EXPORTED', 'RELEASED', 'RETENTION'];

function severityOf(action: string): { label: string; variant: 'red' | 'amber' | 'slate' } {
  if (HIGH_RISK.some((k) => action.includes(k))) return { label: 'HIGH', variant: 'red' };
  if (MEDIUM_RISK.some((k) => action.includes(k))) return { label: 'MEDIUM', variant: 'amber' };
  return { label: 'INFO', variant: 'slate' };
}

export default function AdminSecurityPage() {
  const [events, setEvents] = React.useState<AuditEvent[]>([]);
  const [page, setPage] = React.useState(0);
  const [totalPages, setTotalPages] = React.useState(1);
  const [totalElements, setTotalElements] = React.useState(0);
  const [filterAction, setFilterAction] = React.useState('');
  const [filterUser, setFilterUser] = React.useState('');
  const [filterFrom, setFilterFrom] = React.useState('');
  const [filterTo, setFilterTo] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [siemStatus, setSiemStatus] = React.useState<string | null>(null);

  const load = React.useCallback((targetPage: number) => {
    setIsLoading(true);
    setError(null);
    kmsApi.admin
      .getSecurityEvents(targetPage, 25, { action: filterAction || undefined, user: filterUser || undefined, from: filterFrom ? new Date(filterFrom).toISOString() : undefined, to: filterTo ? new Date(filterTo).toISOString() : undefined })
      .then((data: any) => {
        setEvents((data?.content ?? []) as AuditEvent[]);
        setTotalPages(data?.totalPages ?? 1);
        setTotalElements(data?.totalElements ?? 0);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Failed to load security events'))
      .finally(() => setIsLoading(false));
  }, []);

  React.useEffect(() => {
    load(page);
  }, [load, page]);

  const handleExport = () => {
    const token = typeof window !== 'undefined' ? sessionStorage.getItem('kms_access_token') : null;
    fetch(kmsApi.governance.exportAuditLogsUrl, {
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

  const handleForwardToSiem = () => {
    setSiemStatus('sending');
    setError(null);
    kmsApi.admin
      .forwardToSiem()
      .then((data) => {
        setSiemStatus('sent');
        if (data.forwarded) {
          setSiemStatus(`sent — ${data.forwarded} events forwarded`);
        }
        setTimeout(() => setSiemStatus(null), 5000);
      })
      .catch((err: unknown) => {
        setSiemStatus(null);
        setError(err instanceof Error ? err.message : 'SIEM forward failed');
      });
  };

  const columns = [
    {
      header: 'Event Action',
      accessor: (e: AuditEvent) => (
        <span className="font-mono text-xs font-bold text-kms-slate-900 flex items-center gap-1.5">
          <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
          {e.action}
        </span>
      ),
    },
    {
      header: 'Severity',
      accessor: (e: AuditEvent) => {
        const sev = severityOf(e.action);
        return <Badge label={sev.label} variant={sev.variant} />;
      },
    },
    {
      header: 'Actor',
      accessor: (e: AuditEvent) => (
        <span className="text-xs font-mono text-kms-slate-800">{e.userEmail || e.userId}</span>
      ),
    },
    {
      header: 'Resource',
      accessor: (e: AuditEvent) => (
        <span className="text-xs text-kms-slate-700">
          {e.resourceType}
          <span className="text-kms-slate-400 font-mono ml-1 text-[11px]">{e.resourceId?.slice(0, 8)}</span>
        </span>
      ),
    },
    {
      header: 'Source IP',
      accessor: (e: AuditEvent) => <span className="text-xs font-mono text-kms-slate-600">{e.ipAddress || '-'}</span>,
    },
    {
      header: 'Timestamp',
      accessor: (e: AuditEvent) => (
        <span className="text-xs text-kms-slate-500 font-mono">
          {e.createdAt ? new Date(e.createdAt).toLocaleString() : '-'}
        </span>
      ),
    },
  ];

  return (
    <AppShell requiredRole="ROLE_IT_SECURITY">
      <div className="space-y-5">
        <div className="flex items-center justify-between border-b border-kms-slate-200 pb-3">
          <div>
            <Breadcrumb items={[{ label: 'Administration', href: '/admin' }, { label: 'Security Alerts' }]} />
            <h1 className="text-xl font-bold text-kms-slate-900 tracking-tight flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-red-600" />
              Security Incident Alerts & Anomaly Monitoring
            </h1>
            <p className="text-[11px] text-kms-slate-500 mt-1">
              Immutable audit trail (FR-22) — {totalElements.toLocaleString()} recorded events
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" icon={<Download className="w-4 h-4" />} onClick={handleExport}>
              Export CSV (SIEM)
            </Button>
            <Button
              variant="outline"
              size="sm"
              icon={<Send className="w-4 h-4" />}
              onClick={handleForwardToSiem}
              disabled={siemStatus === 'sending'}
            >
              {siemStatus === 'sending' ? 'Forwarding...' : siemStatus ? siemStatus : 'Forward to SIEM'}
            </Button>
            <Button variant="outline" size="sm" icon={<RefreshCw className="w-4 h-4" />} onClick={() => load(page)}>
              Refresh
            </Button>
          </div>
        </div>

        {error && <Alert type="error">{error}</Alert>}

        <Card title="Filter Audit Events (FR-22)">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
            <Input label="Action" placeholder="e.g. DOCUMENT_DOWNLOAD" value={filterAction} onChange={(e) => { setFilterAction(e.target.value); setPage(0); }} />
            <Input label="User (id or email)" placeholder="e.g. admin" value={filterUser} onChange={(e) => { setFilterUser(e.target.value); setPage(0); }} />
            <Input label="From" type="date" value={filterFrom} onChange={(e) => { setFilterFrom(e.target.value); setPage(0); }} />
            <Input label="To" type="date" value={filterTo} onChange={(e) => { setFilterTo(e.target.value); setPage(0); }} />
          </div>
        </Card>

        {isLoading ? (
          <LoadingState message="Loading security events..." />
        ) : (
          <>
            <Table columns={columns} data={events} keyExtractor={(item) => item.id} emptyText="No security events recorded." />
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
