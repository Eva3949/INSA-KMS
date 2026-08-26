'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/src/components/layout/AppShell';
import { Breadcrumb } from '@/src/components/ui/Breadcrumb';
import { Table } from '@/src/components/ui/Table';
import { Badge } from '@/src/components/ui/Badge';
import { LoadingState, EmptyState, ErrorState } from '@/src/components/ui/States';
import { Star, FileText } from 'lucide-react';
import Link from 'next/link';
import { kmsApi } from '@/src/lib/api';

interface FavoriteDoc {
  id: string;
  title?: string;
  fileName?: string;
  department?: string | { name?: string; code?: string };
  owner?: string;
  author?: string;
  currentVersion?: string | { versionNumber?: number };
  version?: string;
  confidentialityLevel?: string;
  securityClassification?: string;
  classification?: string;
  fileSizeBytes?: number;
}

function getDocTitle(doc: FavoriteDoc): string {
  return doc.title || doc.fileName || doc.id;
}

function getDocDepartment(doc: FavoriteDoc): string {
  if (!doc.department) return 'General';
  if (typeof doc.department === 'string') return doc.department;
  return doc.department.name || doc.department.code || 'General';
}

function getDocOwner(doc: FavoriteDoc): string {
  return doc.owner || doc.author || 'Unknown';
}

function getDocVersion(doc: FavoriteDoc): string {
  if (doc.version) return doc.version;
  if (!doc.currentVersion) return 'v1';
  if (typeof doc.currentVersion === 'string') return doc.currentVersion;
  return `v${doc.currentVersion.versionNumber || 1}`;
}

function getDocClassification(doc: FavoriteDoc): string {
  return doc.securityClassification || doc.confidentialityLevel || doc.classification || 'INTERNAL';
}

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<FavoriteDoc[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    kmsApi.documents.getFavorites()
      .then((data) => {
        setFavorites(Array.isArray(data) ? data : []);
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Failed to load favorites';
        setError(msg);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const columns = [
    {
      header: 'Title',
      accessor: (doc: FavoriteDoc) => (
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-blue-700 shrink-0" />
          <Link href={`/preview/${doc.id}`} className="font-medium text-kms-slate-900 hover:text-blue-800">
            {getDocTitle(doc)}
          </Link>
        </div>
      ),
    },
    {
      header: 'Department',
      accessor: (doc: FavoriteDoc) => <span className="text-xs text-kms-slate-600">{getDocDepartment(doc)}</span>,
    },
    {
      header: 'Owner',
      accessor: (doc: FavoriteDoc) => <span className="text-xs text-kms-slate-600">{getDocOwner(doc)}</span>,
    },
    {
      header: 'Version',
      accessor: (doc: FavoriteDoc) => (
        <span className="font-mono text-xs text-blue-700 font-bold">{getDocVersion(doc)}</span>
      ),
    },
    {
      header: 'Classification',
      accessor: (doc: FavoriteDoc) => {
        const cls = getDocClassification(doc);
        return <Badge label={cls} classification={cls as any} />;
      },
    },
    {
      header: 'Actions',
      accessor: (doc: FavoriteDoc) => (
        <button
          onClick={async () => {
            try {
              await kmsApi.documents.toggleFavorite(doc.id);
              setFavorites((prev) => prev.filter((f) => f.id !== doc.id));
            } catch (err) {
              alert(err instanceof Error ? err.message : 'Failed to remove favorite');
            }
          }}
          className="p-1 rounded hover:bg-amber-50 text-amber-500 hover:text-amber-600"
          title="Remove from Favorites"
        >
          <Star className="w-4 h-4 fill-amber-400" />
        </button>
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

        {isLoading && <LoadingState message="Loading favorites..." />}
        {error && <ErrorState title="Failed to load favorites" message={error} onRetry={() => {
          setIsLoading(true);
          setError(null);
          kmsApi.documents.getFavorites()
            .then((data) => setFavorites(Array.isArray(data) ? data : []))
            .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Failed to load favorites'))
            .finally(() => setIsLoading(false));
        }} />}

        {!isLoading && !error && (
          <Table
            columns={columns}
            data={favorites}
            keyExtractor={(item) => item.id}
            emptyText="No favorite documents bookmarked."
          />
        )}
      </div>
    </AppShell>
  );
}
