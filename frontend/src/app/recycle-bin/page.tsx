'use client';

import React from 'react';
import { AppShell } from '@/src/components/layout/AppShell';
import { Breadcrumb } from '@/src/components/ui/Breadcrumb';
import { Button } from '@/src/components/ui/Button';
import { Table } from '@/src/components/ui/Table';
import { Badge } from '@/src/components/ui/Badge';
import { Alert } from '@/src/components/ui/Alert';
import { Trash2, RotateCcw, FileText } from 'lucide-react';

export default function RecycleBinPage() {
  const mockDeleted = [
    {
      id: 'doc-99',
      title: 'Old_Marketing_Campaign_Draft_2025.docx',
      deletedBy: 'Michael Scott',
      deletedDate: '2026-08-10',
      daysRemaining: 20,
      classification: 'INTERNAL' as const,
    },
  ];

  const columns = [
    {
      header: 'Title',
      accessor: (doc: typeof mockDeleted[0]) => (
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-kms-slate-400 shrink-0" />
          <span className="font-medium text-kms-slate-800 line-through">{doc.title}</span>
        </div>
      ),
    },
    {
      header: 'Deleted By',
      accessor: (doc: typeof mockDeleted[0]) => <span className="text-xs text-kms-slate-600">{doc.deletedBy}</span>,
    },
    {
      header: 'Deletion Date',
      accessor: (doc: typeof mockDeleted[0]) => <span className="text-xs text-kms-slate-500">{doc.deletedDate}</span>,
    },
    {
      header: 'Purge Countdown',
      accessor: (doc: typeof mockDeleted[0]) => (
        <span className="font-mono text-xs text-amber-800 bg-amber-50 px-2 py-0.5 rounded font-bold border border-amber-200">
          {doc.daysRemaining} days left
        </span>
      ),
    },
    {
      header: 'Classification',
      accessor: (doc: typeof mockDeleted[0]) => (
        <Badge label={doc.classification} classification={doc.classification} />
      ),
    },
    {
      header: 'Actions',
      accessor: (doc: typeof mockDeleted[0]) => (
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" icon={<RotateCcw className="w-3.5 h-3.5 text-emerald-700" />}>
            Restore File
          </Button>
          <Button variant="danger" size="sm" icon={<Trash2 className="w-3.5 h-3.5" />}>
            Purge Now
          </Button>
        </div>
      ),
    },
  ];

  return (
    <AppShell>
      <div className="space-y-5">
        <div className="border-b border-kms-slate-200 pb-3">
          <Breadcrumb items={[{ label: 'Workspace' }, { label: 'Recycle Bin' }]} />
          <h1 className="text-xl font-bold text-kms-slate-900 tracking-tight flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-red-600" />
            Recycle Bin & Recoverable Soft-Deleted Content
          </h1>
        </div>

        <Alert type="warning">
          Items in the Recycle Bin will be permanently purged automatically after 30 days unless restored or placed under an active Legal Hold.
        </Alert>

        <Table
          columns={columns}
          data={mockDeleted}
          keyExtractor={(item) => item.id}
          emptyText="Recycle bin is currently empty."
        />
      </div>
    </AppShell>
  );
}
