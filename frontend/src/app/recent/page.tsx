'use client';

import React from 'react';
import { AppShell } from '@/src/components/layout/AppShell';
import { Breadcrumb } from '@/src/components/ui/Breadcrumb';
import { Table } from '@/src/components/ui/Table';
import { Badge } from '@/src/components/ui/Badge';
import { Button } from '@/src/components/ui/Button';
import { LoadingState } from '@/src/components/ui/States';
import { Alert } from '@/src/components/ui/Alert';
import { kmsApi } from '@/src/lib/api';
import { Clock, FileText, RefreshCw } from 'lucide-react';
import Link from 'next/link';

interface RecentRow {
  id: string;
  title?: string;
  fileName?: string;
  department?: string;
  owner?: string;
  confidentialityLevel?: 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED';
  currentVersion?: { versionNumber?: number };
  lastAccessedAt?: string;
}

function relativeTime(iso?: string): string {
  if (!iso) return '—';
  const then = new Date(iso).getTime();
  const mins = Math.max(0, Math.round((Date.now() - then) / 60000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  return `${days} d ago`;
}

export default function RecentDocumentsPage() {
  const [docs, setDocs] = React.useState<RecentRow[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(() => {
    setIsLoading(true);
    setError(null);
    kmsApi.documents
      .recent(25)
      .then((data) => setDocs((data ?? []) as RecentRow[]))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Could not load recent documents'))
      .finally(() => setIsLoading(false));
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const columns = [
    {
      header: 'Title',
      accessor: (doc: RecentRow) => (
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-blue-700 shrink-0" />
          <Link href={`/preview/${doc.id}`} className="font-medium text-kms-slate-900 hover:text-blue-800">
            {doc.title || doc.fileName || doc.id}
          </Link>
        </div>
      ),
    },
    {
      header: 'Department',
      accessor: (doc: RecentRow) => <span className="text-xs text-kms-slate-600">{doc.department || '—'}</span>,
    },
    {
      header: 'Owner',
      accessor: (doc: RecentRow) => <span className="text-xs text-kms-slate-600">{doc.owner || '—'}</span>,
    },
    {
      header: 'Version',
      accessor: (doc: RecentRow) => (
        <span className="font-mono text-xs text-blue-700 font-bold">v{doc.currentVersion?.versionNumber ?? 1}</span>
      ),
    },
    {
      header: 'Classification',
      accessor: (doc: RecentRow) => (
        <Badge
          label={doc.confidentialityLevel || 'INTERNAL'}
          classification={(doc.confidentialityLevel || 'INTERNAL') as any}
        />
      ),
    },
    {
      header: 'Last Opened',
      accessor: (doc: RecentRow) => (
        <span className="text-xs text-kms-slate-500" title={doc.lastAccessedAt || ''}>
          {relativeTime(doc.lastAccessedAt)}
        </span>
      ),
    },
  ];

  return (
    <AppShell>
      <div className="space-y-5">
        <div className="flex items-center justify-between border-b border-kms-slate-200 pb-3">
          <div>
            <Breadcrumb items={[{ label: 'Workspace' }, { label: 'Recent' }]} />
            <h1 className="text-xl font-bold text-kms-slate-900 tracking-tight flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-700" />
              Recently Accessed Documents
            </h1>
            <p className="text-[11px] text-kms-slate-500 mt-1">
              Derived from your own audit trail (FR-22) — only documents you are authorised to see
            </p>
          </div>
          <Button variant="outline" size="sm" icon={<RefreshCw className="w-4 h-4" />} onClick={load}>
            Refresh
          </Button>
        </div>

        {error && <Alert type="error">{error}</Alert>}

        {isLoading ? (
          <LoadingState message="Loading recent activity..." />
        ) : (
          <Table
            columns={columns}
            data={docs}
            keyExtractor={(item) => item.id}
            emptyText="No documents opened yet. Open a document from the library and it will appear here."
          />
        )}
      </div>
    </AppShell>
  );
}
