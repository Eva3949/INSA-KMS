'use client';

import React from 'react';
import { AppShell } from '@/src/components/layout/AppShell';
import { Breadcrumb } from '@/src/components/ui/Breadcrumb';
import { Table } from '@/src/components/ui/Table';
import { Badge } from '@/src/components/ui/Badge';
import { User, FileText } from 'lucide-react';
import Link from 'next/link';

export default function MyDocumentsPage() {
  const mockMyDocs = [
    {
      id: 'doc-1',
      title: 'KMS_Security_Architecture_v2.pdf',
      department: 'IT Security',
      version: 'v2.4',
      classification: 'RESTRICTED' as const,
      size: '4.2 MB',
      modified: '2026-08-18',
    },
  ];

  const columns = [
    {
      header: 'Title',
      accessor: (doc: typeof mockMyDocs[0]) => (
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-blue-700 shrink-0" />
          <Link href={`/preview/${doc.id}`} className="font-medium text-kms-slate-900 hover:text-blue-800">
            {doc.title}
          </Link>
        </div>
      ),
    },
    {
      header: 'Department',
      accessor: (doc: typeof mockMyDocs[0]) => <span className="text-xs text-kms-slate-600">{doc.department}</span>,
    },
    {
      header: 'Version',
      accessor: (doc: typeof mockMyDocs[0]) => (
        <span className="font-mono text-xs text-blue-700 font-bold">{doc.version}</span>
      ),
    },
    {
      header: 'Classification',
      accessor: (doc: typeof mockMyDocs[0]) => (
        <Badge label={doc.classification} classification={doc.classification} />
      ),
    },
    {
      header: 'Modified',
      accessor: (doc: typeof mockMyDocs[0]) => <span className="text-xs text-kms-slate-500">{doc.modified}</span>,
    },
  ];

  return (
    <AppShell>
      <div className="space-y-5">
        <div className="border-b border-kms-slate-200 pb-3">
          <Breadcrumb items={[{ label: 'Workspace' }, { label: 'My Documents' }]} />
          <h1 className="text-xl font-bold text-kms-slate-900 tracking-tight flex items-center gap-2">
            <User className="w-5 h-5 text-blue-700" />
            My Authored & Owned Documents
          </h1>
        </div>

        <Table
          columns={columns}
          data={mockMyDocs}
          keyExtractor={(item) => item.id}
          emptyText="You have not authored any documents yet."
        />
      </div>
    </AppShell>
  );
}
