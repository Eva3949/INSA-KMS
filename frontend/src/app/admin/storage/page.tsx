'use client';

import React from 'react';
import { AppShell } from '@/src/components/layout/AppShell';
import { Breadcrumb } from '@/src/components/ui/Breadcrumb';
import { Card } from '@/src/components/ui/Card';
import { Button } from '@/src/components/ui/Button';
import { Table } from '@/src/components/ui/Table';
import { LoadingState } from '@/src/components/ui/States';
import { Alert } from '@/src/components/ui/Alert';
import { kmsApi } from '@/src/lib/api';
import { HardDrive, RefreshCw, CheckCircle2, AlertTriangle, Copy } from 'lucide-react';

interface StorageStats {
  totalObjects: number;
  totalBytes: number;
  orphanedObjects: number;
  duplicateChecksums: Array<{ checksumSha256: string; copies: number; wastedBytes: number }>;
}

interface StorageObjectRow {
  id: string;
  storagePath: string;
  fileSizeBytes: number;
  checksumSha256: string;
  createdAt: string;
  versionReferences: number;
  isOrphaned: boolean;
}

function formatBytes(bytes: number): string {
  if (!bytes) return '0 B';
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) return `${gb.toFixed(2)} GB`;
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}

export default function AdminStorageIntegrityPage() {
  const [stats, setStats] = React.useState<StorageStats | null>(null);
  const [objects, setObjects] = React.useState<StorageObjectRow[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(() => {
    setIsLoading(true);
    setError(null);
    Promise.all([kmsApi.admin.getStorageStats(), kmsApi.admin.getStorageObjects(50)])
      .then(([statsData, objectsData]) => {
        setStats(statsData as StorageStats);
        setObjects(objectsData as StorageObjectRow[]);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Failed to load storage data'))
      .finally(() => setIsLoading(false));
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const columns = [
    {
      header: 'Storage Path',
      accessor: (obj: StorageObjectRow) => (
        <span className="font-mono text-xs text-kms-slate-800 font-semibold truncate max-w-xs block" title={obj.storagePath}>
          {obj.storagePath}
        </span>
      ),
    },
    {
      header: 'File Size',
      accessor: (obj: StorageObjectRow) => <span className="text-xs text-kms-slate-600">{formatBytes(obj.fileSizeBytes)}</span>,
    },
    {
      header: 'SHA-256 Binary Checksum Hash',
      accessor: (obj: StorageObjectRow) => (
        <span className="font-mono text-[11px] bg-kms-slate-100 text-kms-slate-700 px-2 py-0.5 rounded border border-kms-slate-300 truncate max-w-xs block" title={obj.checksumSha256}>
          {obj.checksumSha256}
        </span>
      ),
    },
    {
      header: 'References',
      accessor: (obj: StorageObjectRow) => (
        <span className="font-mono text-xs text-kms-slate-800">{obj.versionReferences} versions</span>
      ),
    },
    {
      header: 'Integrity Status',
      accessor: (obj: StorageObjectRow) =>
        obj.isOrphaned ? (
          <span className="inline-flex items-center gap-1 text-[10px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded font-sans uppercase font-bold border border-amber-200">
            <AlertTriangle className="w-3 h-3 text-amber-600" /> ORPHANED
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-sans uppercase font-bold border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> REFERENCED
          </span>
        ),
    },
  ];

  return (
    <AppShell requiredRole="ROLE_ADMIN">
      <div className="space-y-5">
        <div className="flex items-center justify-between border-b border-kms-slate-200 pb-3">
          <div>
            <Breadcrumb items={[{ label: 'Administration', href: '/admin' }, { label: 'Storage & Integrity' }]} />
            <h1 className="text-xl font-bold text-kms-slate-900 tracking-tight flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-blue-700" />
              Physical File Storage & SHA-256 Checksum Integrity Ledger
            </h1>
          </div>

          <Button variant="outline" size="sm" icon={<RefreshCw className="w-4 h-4" />} onClick={load}>
            Re-scan Storage
          </Button>
        </div>

        {error && <Alert type="error">{error}</Alert>}

        {isLoading ? (
          <LoadingState message="Scanning storage objects..." />
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-xs font-semibold text-kms-slate-500 uppercase tracking-wide">Storage Objects</p>
                <p className="text-2xl font-bold text-kms-slate-900 mt-1 font-mono">{stats?.totalObjects ?? 0}</p>
              </div>
              <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4">
                <p className="text-xs font-semibold text-kms-slate-500 uppercase tracking-wide">Total Bytes Stored</p>
                <p className="text-2xl font-bold text-kms-slate-900 mt-1 font-mono">{formatBytes(stats?.totalBytes ?? 0)}</p>
              </div>
              <div className={`${(stats?.orphanedObjects ?? 0) > 0 ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'} border rounded-lg p-4`}>
                <p className="text-xs font-semibold text-kms-slate-500 uppercase tracking-wide">Orphaned Objects</p>
                <p className="text-2xl font-bold text-kms-slate-900 mt-1 font-mono">{stats?.orphanedObjects ?? 0}</p>
                <p className="text-[11px] text-kms-slate-500 mt-1">No document version references</p>
              </div>
              <div className={`${(stats?.duplicateChecksums?.length ?? 0) > 0 ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'} border rounded-lg p-4`}>
                <p className="text-xs font-semibold text-kms-slate-500 uppercase tracking-wide">Duplicate Checksums</p>
                <p className="text-2xl font-bold text-kms-slate-900 mt-1 font-mono">{stats?.duplicateChecksums?.length ?? 0}</p>
                <p className="text-[11px] text-kms-slate-500 mt-1">Deduplication candidates (BR-06)</p>
              </div>
            </div>

            {(stats?.duplicateChecksums?.length ?? 0) > 0 && (
              <Card title="Duplicate Content Detection (SHA-256 collisions)">
                <div className="space-y-2">
                  {stats!.duplicateChecksums.map((dup) => (
                    <div key={dup.checksumSha256} className="flex items-center justify-between text-xs bg-kms-slate-50 border border-kms-slate-200 rounded p-2">
                      <span className="font-mono text-[11px] text-kms-slate-700 truncate max-w-md flex items-center gap-1.5">
                        <Copy className="w-3 h-3 text-amber-600 shrink-0" />
                        {dup.checksumSha256}
                      </span>
                      <span className="font-semibold text-kms-slate-900">
                        {dup.copies} copies · {formatBytes(dup.wastedBytes)}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            <Table columns={columns} data={objects} keyExtractor={(item) => item.id} emptyText="No storage objects registered." />
          </>
        )}
      </div>
    </AppShell>
  );
}
