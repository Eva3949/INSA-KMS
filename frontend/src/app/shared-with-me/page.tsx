'use client';

import React from 'react';
import { AppShell } from '@/src/components/layout/AppShell';
import { Breadcrumb } from '@/src/components/ui/Breadcrumb';
import { Table } from '@/src/components/ui/Table';
import { Badge } from '@/src/components/ui/Badge';
import { Users, FileText } from 'lucide-react';
import Link from 'next/link';

export default function SharedWithMePage() {
  const mockShared = [
    {
      id: 'doc-2',
      title: 'HR_Employee_Onboarding_Policy.docx',
      sharedBy: 'Michael Scott',
      department: 'Human Resources',
      permission: 'VIEW (Read-only)',
      classification: 'CONFIDENTIAL' as const,
      sharedDate: '2026-08-15',
    },
  ];

  const columns = [
    {
      header: 'Title',
      accessor: (doc: typeof mockShared[0]) => (
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-blue-700 shrink-0" />
          <Link href={`/preview/${doc.id}`} className="font-medium text-kms-slate-900 hover:text-blue-800">
            {doc.title}
          </Link>
        </div>
      ),
    },
    {
      header: 'Shared By',
      accessor: (doc: typeof mockShared[0]) => <span className="text-xs text-kms-slate-600">{doc.sharedBy}</span>,
    },
    {
      header: 'Granted Permission',
      accessor: (doc: typeof mockShared[0]) => (
        <Badge label={doc.permission} variant="purple" />
      ),
    },
    {
      header: 'Classification',
      accessor: (doc: typeof mockShared[0]) => (
        <Badge label={doc.classification} classification={doc.classification} />
      ),
    },
    {
      header: 'Shared Date',
      accessor: (doc: typeof mockShared[0]) => <span className="text-xs text-kms-slate-500">{doc.sharedDate}</span>,
    },
  ];

  return (
    <AppShell>
      <div className="space-y-5">
        <div className="border-b border-kms-slate-200 pb-3">
          <Breadcrumb items={[{ label: 'Workspace' }, { label: 'Shared With Me' }]} />
          <h1 className="text-xl font-bold text-kms-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-700" />
            Documents Shared With Me & My Groups
          </h1>
        </div>

        <Table
          columns={columns}
          data={mockShared}
          keyExtractor={(item) => item.id}
          emptyText="No documents have been explicitly shared with you."
        />
      </div>
    </AppShell>
  );
}
