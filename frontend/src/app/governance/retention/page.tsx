'use client';

import React from 'react';
import { AppShell } from '@/src/components/layout/AppShell';
import { Breadcrumb } from '@/src/components/ui/Breadcrumb';
import { Button } from '@/src/components/ui/Button';
import { Badge } from '@/src/components/ui/Badge';
import { Table } from '@/src/components/ui/Table';
import { Alert } from '@/src/components/ui/Alert';
import { FileLock2, Plus, Clock, Archive, Trash2 } from 'lucide-react';

export default function RetentionPoliciesPage() {
  const mockPolicies = [
    {
      id: 'ret-1',
      name: 'Financial Audit Records Schedule',
      documentType: 'Financial Report / Audit',
      retentionYears: '7 Years',
      dispositionAction: 'ARCHIVE',
      activeRulesCount: 3,
      status: 'ACTIVE',
    },
    {
      id: 'ret-2',
      name: 'Temporary Draft Cleanup Rule',
      documentType: 'Draft Document',
      retentionYears: '180 Days',
      dispositionAction: 'DELETE',
      activeRulesCount: 1,
      status: 'ACTIVE',
    },
  ];

  const columns = [
    {
      header: 'Policy Name',
      accessor: (pol: typeof mockPolicies[0]) => (
        <div className="font-semibold text-kms-slate-900 flex items-center gap-2">
          <FileLock2 className="w-4 h-4 text-blue-700 shrink-0" />
          {pol.name}
        </div>
      ),
    },
    {
      header: 'Target Document Type',
      accessor: (pol: typeof mockPolicies[0]) => <span className="text-xs text-kms-slate-700">{pol.documentType}</span>,
    },
    {
      header: 'Retention Duration',
      accessor: (pol: typeof mockPolicies[0]) => (
        <span className="font-mono text-xs font-bold text-kms-slate-800 bg-kms-slate-100 px-2 py-0.5 rounded border border-kms-slate-300">
          {pol.retentionYears}
        </span>
      ),
    },
    {
      header: 'Automated Disposition',
      accessor: (pol: typeof mockPolicies[0]) => (
        <Badge
          label={pol.dispositionAction}
          variant={pol.dispositionAction === 'ARCHIVE' ? 'blue' : 'red'}
          icon={pol.dispositionAction === 'ARCHIVE' ? <Archive className="w-3 h-3 text-blue-600" /> : <Trash2 className="w-3 h-3 text-red-600" />}
        />
      ),
    },
    {
      header: 'Status',
      accessor: (pol: typeof mockPolicies[0]) => (
        <Badge label={pol.status} variant="green" />
      ),
    },
  ];

  return (
    <AppShell requiredRole="ROLE_COMPLIANCE_OFFICER">
      <div className="space-y-5">
        <div className="flex items-center justify-between border-b border-kms-slate-200 pb-3">
          <div>
            <Breadcrumb items={[{ label: 'Governance & Compliance' }, { label: 'Retention Policies' }]} />
            <h1 className="text-xl font-bold text-kms-slate-900 tracking-tight flex items-center gap-2">
              <FileLock2 className="w-5 h-5 text-blue-700" />
              Retention Policies & Automated Disposition Rules
            </h1>
          </div>

          <Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />}>
            Create Retention Schedule
          </Button>
        </div>

        <Alert type="info">
          Retention policies automatically archive or dispose of documents when their lifecycle retention duration expires. Retention purges are overridden by active Legal Holds.
        </Alert>

        <Table
          columns={columns}
          data={mockPolicies}
          keyExtractor={(item) => item.id}
          emptyText="No retention policies defined."
        />
      </div>
    </AppShell>
  );
}


