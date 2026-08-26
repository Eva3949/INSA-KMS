'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/src/components/layout/AppShell';
import { Breadcrumb } from '@/src/components/ui/Breadcrumb';
import { Table } from '@/src/components/ui/Table';
import { Badge } from '@/src/components/ui/Badge';
import { LoadingState, EmptyState, ErrorState } from '@/src/components/ui/States';
import { Users, FileText } from 'lucide-react';
import Link from 'next/link';
import { kmsApi } from '@/src/lib/api';

interface SharedDoc {
  id: string;
  title?: string;
  fileName?: string;
  confidentialityLevel?: string;
  securityClassification?: string;
  classification?: string;
  permissionLevel?: string;
  permission?: string;
  sharedAt?: string;
  sharedDate?: string;
  sharedBy?: string;
  owner?: string;
}

function getDocTitle(doc: SharedDoc): string {
  return doc.title || doc.fileName || doc.id;
}

function getDocClassification(doc: SharedDoc): string {
  return doc.securityClassification || doc.confidentialityLevel || doc.classification || 'INTERNAL';
}

function getDocPermission(doc: SharedDoc): string {
  return doc.permissionLevel || doc.permission || 'VIEW';
}

function getDocSharedDate(doc: SharedDoc): string {
  const raw = doc.sharedAt || doc.sharedDate;
  if (!raw) return '';
  try {
    return new Date(raw).toLocaleDateString('en-CA');
  } catch {
    return raw;
  }
}

export default function SharedWithMePage() {
  const [sharedDocs, setSharedDocs] = useState<SharedDoc[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    kmsApi.documents.getSharedWithMe()
      .then((data) => {
        setSharedDocs(Array.isArray(data) ? data : []);
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Failed to load shared documents';
        setError(msg);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const columns = [
    {
      header: 'Title',
      accessor: (doc: SharedDoc) => (
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-blue-700 shrink-0" />
          <Link href={`/preview/${doc.id}`} className="font-medium text-kms-slate-900 hover:text-blue-800">
            {getDocTitle(doc)}
          </Link>
        </div>
      ),
    },
    {
      header: 'Shared By',
      accessor: (doc: SharedDoc) => (
        <span className="text-xs text-kms-slate-600">{doc.sharedBy || doc.owner || '—'}</span>
      ),
    },
    {
      header: 'Granted Permission',
      accessor: (doc: SharedDoc) => (
        <Badge label={getDocPermission(doc)} variant="purple" />
      ),
    },
    {
      header: 'Classification',
      accessor: (doc: SharedDoc) => {
        const cls = getDocClassification(doc);
        return <Badge label={cls} classification={cls as any} />;
      },
    },
    {
      header: 'Shared Date',
      accessor: (doc: SharedDoc) => (
        <span className="text-xs text-kms-slate-500">{getDocSharedDate(doc)}</span>
      ),
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

        {isLoading && <LoadingState message="Loading shared documents..." />}
        {error && <ErrorState title="Failed to load shared documents" message={error} onRetry={() => {
          setIsLoading(true);
          setError(null);
          kmsApi.documents.getSharedWithMe()
            .then((data) => setSharedDocs(Array.isArray(data) ? data : []))
            .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Failed to load shared documents'))
            .finally(() => setIsLoading(false));
        }} />}

        {!isLoading && !error && (
          <Table
            columns={columns}
            data={sharedDocs}
            keyExtractor={(item) => item.id}
            emptyText="No documents have been explicitly shared with you."
          />
        )}
      </div>
    </AppShell>
  );
}
