'use client';

import React from 'react';
import { AppShell } from '@/src/components/layout/AppShell';
import { Breadcrumb } from '@/src/components/ui/Breadcrumb';
import { Button } from '@/src/components/ui/Button';
import { Badge } from '@/src/components/ui/Badge';
import { Table } from '@/src/components/ui/Table';
import { Alert } from '@/src/components/ui/Alert';
import { ShieldAlert, Plus, FileText } from 'lucide-react';

export default function LegalHoldsPage() {
  const mockHolds = [
    {
      id: 'lh-1',
      caseNumber: 'LH-2026-09',
      title: 'Q3 Financial Audit & SEC Compliance Inquiry',
      description: 'Litigation hold freezing all financial statements and audit logs for 2025-2026.',
      frozenDocsCount: 182,
      createdBy: 'Sarah Jenkins (Compliance)',
      createdDate: '2026-08-01',
    },
  ];

  const columns = [
    {
      header: 'Case Number',
      accessor: (hold: typeof mockHolds[0]) => (
        <span className="font-mono font-bold text-xs text-amber-900 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
          {hold.caseNumber}
        </span>
      ),
    },
    {
      header: 'Hold Case Title',
      accessor: (hold: typeof mockHolds[0]) => (
        <div className="font-bold text-kms-slate-900 text-xs">{hold.title}</div>
      ),
    },
    {
      header: 'Frozen Content Volume',
      accessor: (hold: typeof mockHolds[0]) => (
        <span className="font-semibold text-kms-slate-800">{hold.frozenDocsCount} Documents Frozen</span>
      ),
    },
    {
      header: 'Issuing Officer',
      accessor: (hold: typeof mockHolds[0]) => <span className="text-xs text-kms-slate-600">{hold.createdBy}</span>,
    },
    {
      header: 'Created Date',
      accessor: (hold: typeof mockHolds[0]) => <span className="text-xs text-kms-slate-500">{hold.createdDate}</span>,
    },
    {
      header: 'Status',
      accessor: (hold: typeof mockHolds[0]) => (
        <Badge label="ACTIVE HOLD" stateBadge="LEGAL_HOLD" />
      ),
    },
  ];

  return (
    <AppShell requiredRole="ROLE_COMPLIANCE_OFFICER">
      <div className="space-y-5">
        <div className="flex items-center justify-between border-b border-kms-slate-200 pb-3">
          <div>
            <Breadcrumb items={[{ label: 'Governance & Compliance' }, { label: 'Legal Holds' }]} />
            <h1 className="text-xl font-bold text-kms-slate-900 tracking-tight flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-600" />
              Litigation Legal Holds Case Manager
            </h1>
          </div>

          <Button variant="danger" size="sm" icon={<Plus className="w-4 h-4" />}>
            Issue Legal Hold Case
          </Button>
        </div>

        <Alert type="legal-hold" title="OVERRIDING LEGAL COMPLIANCE ENFORCEMENT">
          Documents added to an active Legal Hold case are completely frozen against modification, soft deletion, and scheduled retention purges at the database trigger layer.
        </Alert>

        <Table
          columns={columns}
          data={mockHolds}
          keyExtractor={(item) => item.id}
          emptyText="No active legal holds."
        />
      </div>
    </AppShell>
  );
}


