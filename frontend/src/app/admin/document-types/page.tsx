'use client';

import React from 'react';
import { AppShell } from '@/src/components/layout/AppShell';
import { Breadcrumb } from '@/src/components/ui/Breadcrumb';
import { Button } from '@/src/components/ui/Button';
import { Table } from '@/src/components/ui/Table';
import { FileCheck2, Plus } from 'lucide-react';

export default function AdminDocumentTypesPage() {
  const mockTypes = [
    { id: 'dt-1', name: 'Policy / Standard', description: 'Institutional governance policies and procedural standards.', fieldsCount: 5 },
    { id: 'dt-2', name: 'Contract / Legal Agreement', description: 'Vendor, client, and employee legal agreements.', fieldsCount: 8 },
    { id: 'dt-3', name: 'Financial Audit Report', description: 'Quarterly and annual financial audit ledgers.', fieldsCount: 6 },
  ];

  const columns = [
    {
      header: 'Document Type Name',
      accessor: (dt: typeof mockTypes[0]) => (
        <div className="font-bold text-kms-slate-900 text-xs flex items-center gap-2">
          <FileCheck2 className="w-4 h-4 text-blue-700" />
          {dt.name}
        </div>
      ),
    },
    {
      header: 'Description',
      accessor: (dt: typeof mockTypes[0]) => <span className="text-xs text-kms-slate-600">{dt.description}</span>,
    },
    {
      header: 'Metadata Fields Count',
      accessor: (dt: typeof mockTypes[0]) => (
        <span className="font-mono text-xs text-kms-slate-800 bg-kms-slate-100 px-2 py-0.5 rounded border border-kms-slate-300">
          {dt.fieldsCount} Fields Required
        </span>
      ),
    },
  ];

  return (
    <AppShell requiredRole="ROLE_ADMIN">
      <div className="space-y-5">
        <div className="flex items-center justify-between border-b border-kms-slate-200 pb-3">
          <div>
            <Breadcrumb items={[{ label: 'Administration', href: '/admin' }, { label: 'Document Types' }]} />
            <h1 className="text-xl font-bold text-kms-slate-900 tracking-tight flex items-center gap-2">
              <FileCheck2 className="w-5 h-5 text-blue-700" />
              Document Types & Custom Metadata Schemas
            </h1>
          </div>

          <Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />}>
            Create Document Type
          </Button>
        </div>

        <Table
          columns={columns}
          data={mockTypes}
          keyExtractor={(item) => item.id}
          emptyText="No document types defined."
        />
      </div>
    </AppShell>
  );
}

