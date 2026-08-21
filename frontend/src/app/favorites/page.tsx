'use client';

import React from 'react';
import { AppShell } from '@/src/components/layout/AppShell';
import { Breadcrumb } from '@/src/components/ui/Breadcrumb';
import { Table } from '@/src/components/ui/Table';
import { Badge } from '@/src/components/ui/Badge';
import { Star, FileText } from 'lucide-react';
import Link from 'next/link';

export default function FavoritesPage() {
  const mockFavorites = [
    {
      id: 'doc-4',
      title: 'Enterprise_Architecture_Guidelines.pdf',
      department: 'Engineering',
      owner: 'David Chen',
      version: 'v4.1',
      classification: 'INTERNAL' as const,
      modified: '2026-08-01',
    },
  ];

  const columns = [
    {
      header: 'Title',
      accessor: (doc: typeof mockFavorites[0]) => (
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
      accessor: (doc: typeof mockFavorites[0]) => <span className="text-xs text-kms-slate-600">{doc.department}</span>,
    },
    {
      header: 'Owner',
      accessor: (doc: typeof mockFavorites[0]) => <span className="text-xs text-kms-slate-600">{doc.owner}</span>,
    },
    {
      header: 'Version',
      accessor: (doc: typeof mockFavorites[0]) => (
        <span className="font-mono text-xs text-blue-700 font-bold">{doc.version}</span>
      ),
    },
    {
      header: 'Classification',
      accessor: (doc: typeof mockFavorites[0]) => (
        <Badge label={doc.classification} classification={doc.classification} />
      ),
    },
  ];

  return (
    <AppShell>
      <div className="space-y-5">
        <div className="border-b border-kms-slate-200 pb-3">
          <Breadcrumb items={[{ label: 'Workspace' }, { label: 'Favorites' }]} />
          <h1 className="text-xl font-bold text-kms-slate-900 tracking-tight flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
            Bookmarked & Favorite Documents
          </h1>
        </div>

        <Table
          columns={columns}
          data={mockFavorites}
          keyExtractor={(item) => item.id}
          emptyText="No favorite documents bookmarked."
        />
      </div>
    </AppShell>
  );
}
