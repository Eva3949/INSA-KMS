'use client';

import React from 'react';
import { AppShell } from '@/src/components/layout/AppShell';
import { Breadcrumb } from '@/src/components/ui/Breadcrumb';
import { Table } from '@/src/components/ui/Table';
import { Badge } from '@/src/components/ui/Badge';
import { Clock, FileText } from 'lucide-react';
import Link from 'next/link';

export default function RecentDocumentsPage() {
  const mockRecent = [
    {
      id: 'doc-1',
      title: 'KMS_Security_Architecture_v2.pdf',
      action: 'Opened Preview Workspace',
      accessedAt: '10 minutes ago',
      classification: 'RESTRICTED' as const,
    },
    {
      id: 'doc-3',
      title: 'Q3_Financial_Performance_Audit.xlsx',
      action: 'Downloaded Binary',
      accessedAt: '2 hours ago',
      classification: 'CONFIDENTIAL' as const,
    },
  ];

  const columns = [
    {
      header: 'Title',
      accessor: (doc: typeof mockRecent[0]) => (
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-blue-700 shrink-0" />
          <Link href={`/preview/${doc.id}`} className="font-medium text-kms-slate-900 hover:text-blue-800">
            {doc.title}
          </Link>
        </div>
      ),
    },
    {
      header: 'Activity Action',
      accessor: (doc: typeof mockRecent[0]) => (
        <span className="text-xs font-semibold text-kms-slate-700">{doc.action}</span>
      ),
    },
    {
      header: 'Accessed Time',
      accessor: (doc: typeof mockRecent[0]) => <span className="text-xs text-kms-slate-500">{doc.accessedAt}</span>,
    },
    {
      header: 'Classification',
      accessor: (doc: typeof mockRecent[0]) => (
        <Badge label={doc.classification} classification={doc.classification} />
      ),
    },
  ];

  return (
    <AppShell>
      <div className="space-y-5">
        <div className="border-b border-kms-slate-200 pb-3">
          <Breadcrumb items={[{ label: 'Workspace' }, { label: 'Recent Documents' }]} />
          <h1 className="text-xl font-bold text-kms-slate-900 tracking-tight flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-700" />
            Recently Viewed & Accessed Documents
          </h1>
        </div>

        <Table
          columns={columns}
          data={mockRecent}
          keyExtractor={(item) => item.id}
          emptyText="No recent document activity."
        />
      </div>
    </AppShell>
  );
}
