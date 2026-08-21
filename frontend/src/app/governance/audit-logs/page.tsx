'use client';

import React from 'react';
import { AppShell } from '@/src/components/layout/AppShell';
import { Breadcrumb } from '@/src/components/ui/Breadcrumb';
import { Button } from '@/src/components/ui/Button';
import { Badge } from '@/src/components/ui/Badge';
import { Table } from '@/src/components/ui/Table';
import { Input, Select } from '@/src/components/ui/Input';
import { FileText, Download, Filter, ShieldCheck, Lock } from 'lucide-react';

export default function SecurityAuditLogsPage() {
  const mockAuditLogs = [
    {
      id: 'audit-101',
      userId: 's.jenkins@enterprise.internal',
      action: 'DOCUMENT_UPLOAD',
      resourceType: 'DOCUMENT',
      resourceId: 'doc-1',
      ipAddress: '192.168.1.45',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      timestamp: '2026-08-18 14:32:01',
    },
    {
      id: 'audit-102',
      userId: 'm.scott@enterprise.internal',
      action: 'LEGAL_HOLD_APPLY',
      resourceType: 'LEGAL_HOLD',
      resourceId: 'LH-2026-09',
      ipAddress: '192.168.1.110',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X)',
      timestamp: '2026-08-18 15:01:44',
    },
    {
      id: 'audit-103',
      userId: 'd.chen@enterprise.internal',
      action: 'CHECKOUT',
      resourceType: 'DOCUMENT',
      resourceId: 'doc-4',
      ipAddress: '192.168.1.88',
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64)',
      timestamp: '2026-08-18 16:12:10',
    },
  ];

  const columns = [
    {
      header: 'Timestamp',
      accessor: (log: typeof mockAuditLogs[0]) => (
        <span className="font-mono text-xs text-kms-slate-700 font-semibold">{log.timestamp}</span>
      ),
    },
    {
      header: 'User Identity',
      accessor: (log: typeof mockAuditLogs[0]) => (
        <span className="text-xs text-kms-slate-900 font-medium">{log.userId}</span>
      ),
    },
    {
      header: 'Action Event',
      accessor: (log: typeof mockAuditLogs[0]) => (
        <span className="font-mono text-xs bg-kms-slate-100 text-blue-800 px-2 py-0.5 rounded font-bold border border-kms-slate-300">
          {log.action}
        </span>
      ),
    },
    {
      header: 'Target Resource',
      accessor: (log: typeof mockAuditLogs[0]) => (
        <span className="text-xs text-kms-slate-600">
          {log.resourceType}: <strong className="font-mono">{log.resourceId}</strong>
        </span>
      ),
    },
    {
      header: 'Client IP Address',
      accessor: (log: typeof mockAuditLogs[0]) => (
        <span className="font-mono text-xs text-kms-slate-500">{log.ipAddress}</span>
      ),
    },
  ];

  return (
    <AppShell requiredRole="ROLE_IT_SECURITY">
      <div className="space-y-5">
        <div className="flex items-center justify-between border-b border-kms-slate-200 pb-3">
          <div>
            <Breadcrumb items={[{ label: 'Governance & Compliance' }, { label: 'Security Audit Logs' }]} />
            <h1 className="text-xl font-bold text-kms-slate-900 tracking-tight flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-blue-700" />
              Immutable Security Audit Logs & Access Trail
            </h1>
          </div>

          <Button variant="outline" size="sm" icon={<Download className="w-4 h-4" />}>
            Export Audit Ledger (CSV / JSON)
          </Button>
        </div>

        {/* Audit Filter Toolbar */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-white p-3 border border-kms-slate-200 rounded shadow-xs">
          <Input label="Filter by User" placeholder="User ID / Email..." />
          <Select
            label="Action Type"
            options={[
              { label: 'All Action Events', value: 'ALL' },
              { label: 'DOCUMENT_UPLOAD', value: 'DOCUMENT_UPLOAD' },
              { label: 'DOCUMENT_DELETE', value: 'DOCUMENT_DELETE' },
              { label: 'CHECKOUT', value: 'CHECKOUT' },
              { label: 'LEGAL_HOLD_APPLY', value: 'LEGAL_HOLD_APPLY' },
            ]}
          />
          <Input label="Start Date" type="date" />
          <Input label="End Date" type="date" />
        </div>

        <Table
          columns={columns}
          data={mockAuditLogs}
          keyExtractor={(item) => item.id}
          emptyText="No audit logs match criteria."
        />
      </div>
    </AppShell>
  );
}


