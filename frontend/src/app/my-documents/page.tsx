'use client';

import React from 'react';
import { AppShell } from '@/src/components/layout/AppShell';
import { Breadcrumb } from '@/src/components/ui/Breadcrumb';
import { Table } from '@/src/components/ui/Table';
import { Badge } from '@/src/components/ui/Badge';
import { Button } from '@/src/components/ui/Button';
import { Pagination } from '@/src/components/ui/Pagination';
import { LoadingState } from '@/src/components/ui/States';
import { Alert } from '@/src/components/ui/Alert';
import { kmsApi } from '@/src/lib/api';
import { User, FileText, RefreshCw, Upload } from 'lucide-react';
import Link from 'next/link';

interface DocRow {
  id: string;
  title?: string;
  fileName?: string;
  department?: string;
  confidentialityLevel?: 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED';
  currentVersion?: { versionNumber?: number };
  fileSizeBytes?: number;
  updatedAt?: string;
  documentType?: string;
}

const PAGE_SIZE = 20;

function formatSize(bytes?: number): string {
  if (!bytes) return '—';
  const mb = bytes / (1024 * 1024);
  if (mb < 1) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${mb.toFixed(1)} MB`;
}

export default function MyDocumentsPage() {
  const [docs, setDocs] = React.useState<DocRow[]>([]);
  const [page, setPage] = React.useState(0);
  const [totalPages, setTotalPages] = React.useState(1);
  const [totalItems, setTotalItems] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback((targetPage: number) => {
    setIsLoading(true);
    setError(null);
    kmsApi.documents
      .mine(targetPage, PAGE_SIZE)
      .then((data: any) => {
        setDocs((data?.content ?? []) as DocRow[]);
        setTotalPages(data?.totalPages ?? 1);
        setTotalItems(data?.totalElements ?? 0);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Could not load your documents'))
      .finally(() => setIsLoading(false));
  }, []);

  React.useEffect(() => {
    load(page);
  }, [load, page]);

  const columns = [
    {
      header: 'Title',
      accessor: (doc: DocRow) => (
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-blue-700 shrink-0" />
          <Link href={`/preview/${doc.id}`} className="font-medium text-kms-slate-900 hover:text-blue-800">
            {doc.title || doc.fileName || doc.id}
          </Link>
        </div>
      ),
    },
    {
      header: 'Type',
      accessor: (doc: DocRow) => <span className="text-xs text-kms-slate-600">{doc.documentType || '—'}</span>,
    },
    {
      header: 'Department',
      accessor: (doc: DocRow) => <span className="text-xs text-kms-slate-600">{doc.department || '—'}</span>,
    },
    {
      header: 'Version',
      accessor: (doc: DocRow) => (
        <span className="font-mono text-xs text-blue-700 font-bold">v{doc.currentVersion?.versionNumber ?? 1}</span>
      ),
    },
    {
      header: 'Classification',
      accessor: (doc: DocRow) => (
        <Badge
          label={doc.confidentialityLevel || 'INTERNAL'}
          classification={(doc.confidentialityLevel || 'INTERNAL') as any}
        />
      ),
    },
    {
      header: 'Size',
      accessor: (doc: DocRow) => <span className="font-mono text-xs text-kms-slate-600">{formatSize(doc.fileSizeBytes)}</span>,
    },
    {
      header: 'Modified',
      accessor: (doc: DocRow) => (
        <span className="text-xs text-kms-slate-500">
          {doc.updatedAt ? new Date(doc.updatedAt).toLocaleString() : '—'}
        </span>
      ),
    },
  ];

  return (
    <AppShell>
      <div className="space-y-5">
        <div className="flex items-center justify-between border-b border-kms-slate-200 pb-3">
          <div>
            <Breadcrumb items={[{ label: 'Workspace' }, { label: 'My Documents' }]} />
            <h1 className="text-xl font-bold text-kms-slate-900 tracking-tight flex items-center gap-2">
              <User className="w-5 h-5 text-blue-700" />
              My Authored &amp; Owned Documents
            </h1>
            <p className="text-[11px] text-kms-slate-500 mt-1">{totalItems} document(s) authored by you</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/upload">
              <Button variant="primary" size="sm" icon={<Upload className="w-4 h-4" />}>
                Upload
              </Button>
            </Link>
            <Button variant="outline" size="sm" icon={<RefreshCw className="w-4 h-4" />} onClick={() => load(page)}>
              Refresh
            </Button>
          </div>
        </div>

        {error && <Alert type="error">{error}</Alert>}

        {isLoading ? (
          <LoadingState message="Loading your documents..." />
        ) : (
          <>
            <Table
              columns={columns}
              data={docs}
              keyExtractor={(item) => item.id}
              emptyText="You have not authored any documents yet."
            />
            {totalPages > 1 && (
              <Pagination
                currentPage={page + 1}
                totalPages={totalPages}
                totalItems={totalItems}
                pageSize={PAGE_SIZE}
                onPageChange={(p) => setPage(p - 1)}
              />
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
