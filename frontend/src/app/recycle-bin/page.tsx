'use client';

import React from 'react';
import { AppShell } from '@/src/components/layout/AppShell';
import { Breadcrumb } from '@/src/components/ui/Breadcrumb';
import { Button } from '@/src/components/ui/Button';
import { Table } from '@/src/components/ui/Table';
import { Badge } from '@/src/components/ui/Badge';
import { LoadingState } from '@/src/components/ui/States';
import { Alert } from '@/src/components/ui/Alert';
import { kmsApi } from '@/src/lib/api';
import { useAuth } from '@/src/lib/auth-context';
import { Trash2, RotateCcw, FileText, RefreshCw } from 'lucide-react';

interface DeletedRow {
  id: string;
  title?: string;
  fileName?: string;
  owner?: string;
  deletedAt?: string;
  daysRemaining: number;
  retentionDays: number;
  confidentialityLevel?: 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED';
  fileSizeBytes?: number;
}

function formatDate(iso?: string): string {
  return iso ? new Date(iso).toLocaleString() : '—';
}

export default function RecycleBinPage() {
  const { roles } = useAuth();
  const isAdmin = roles.includes('ROLE_ADMIN');

  const [rows, setRows] = React.useState<DeletedRow[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isBusy, setIsBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);

  const load = React.useCallback(() => {
    setIsLoading(true);
    setError(null);
    kmsApi.documents
      .recycleBin()
      .then((data) => setRows((data ?? []) as DeletedRow[]))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Could not load the recycle bin'))
      .finally(() => setIsLoading(false));
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const handleRestore = async (doc: DeletedRow) => {
    setIsBusy(true);
    try {
      await kmsApi.documents.restore(doc.id);
      setNotice(`"${doc.title || doc.fileName}" restored.`);
      setError(null);
      load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Restore failed');
    } finally {
      setIsBusy(false);
    }
  };

  const handlePurgeNow = async () => {
    if (!window.confirm('Permanently purge all documents whose recovery window has expired? This cannot be undone.')) {
      return;
    }
    setIsBusy(true);
    setNotice(null);
    try {
      const result = await kmsApi.admin.purgeRecycleBin();
      setNotice(
        `Purge complete — ${result.purged} document(s) permanently deleted` +
        (result.skippedOnLegalHold ? `, ${result.skippedOnLegalHold} skipped under legal hold.` : '.')
      );
      setError(null);
      load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Purge failed');
    } finally {
      setIsBusy(false);
    }
  };

  const columns = [
    {
      header: 'Title',
      accessor: (doc: DeletedRow) => (
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-kms-slate-400 shrink-0" />
          <span className="font-medium text-kms-slate-800 line-through">{doc.title || doc.fileName || doc.id}</span>
        </div>
      ),
    },
    { header: 'Owner', accessor: (doc: DeletedRow) => <span className="text-xs text-kms-slate-600">{doc.owner || '—'}</span> },
    {
      header: 'Classification',
      accessor: (doc: DeletedRow) => (
        <Badge
          label={doc.confidentialityLevel || 'INTERNAL'}
          classification={(doc.confidentialityLevel || 'INTERNAL') as any}
        />
      ),
    },
    {
      header: 'Deleted',
      accessor: (doc: DeletedRow) => <span className="text-xs text-kms-slate-500 font-mono">{formatDate(doc.deletedAt)}</span>,
    },
    {
      header: 'Auto-Purge In',
      accessor: (doc: DeletedRow) => (
        <Badge
          label={doc.daysRemaining <= 3 ? `${doc.daysRemaining}d — PURGE IMMINENT` : `${doc.daysRemaining} days`}
          variant={doc.daysRemaining <= 3 ? 'red' : doc.daysRemaining <= 10 ? 'amber' : 'slate'}
        />
      ),
    },
    {
      header: 'Actions',
      accessor: (doc: DeletedRow) => (
        <Button
          variant="outline"
          size="sm"
          icon={<RotateCcw className="w-3.5 h-3.5" />}
          onClick={() => handleRestore(doc)}
          disabled={isBusy}
        >
          Restore
        </Button>
      ),
    },
  ];

  return (
    <AppShell>
      <div className="space-y-5">
        <div className="flex items-center justify-between border-b border-kms-slate-200 pb-3">
          <div>
            <Breadcrumb items={[{ label: 'Workspace' }, { label: 'Recycle Bin' }]} />
            <h1 className="text-xl font-bold text-kms-slate-900 tracking-tight flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-600" />
              Recycle Bin &amp; Recovery
            </h1>
            <p className="text-[11px] text-kms-slate-500 mt-1">
              FR-08 — deleted documents remain recoverable for the configured window
              {rows[0]?.retentionDays ? ` (${rows[0].retentionDays} days)` : ''}, then are purged automatically at 03:00.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Button variant="danger" size="sm" onClick={handlePurgeNow} disabled={isBusy}>
                Purge Expired Now
              </Button>
            )}
            <Button variant="outline" size="sm" icon={<RefreshCw className="w-4 h-4" />} onClick={load}>
              Refresh
            </Button>
          </div>
        </div>

        <Alert type="info">
          Documents frozen under an active Legal Hold are never purged, even after the window expires (FR-29).
        </Alert>

        {notice && <Alert type="success">{notice}</Alert>}
        {error && <Alert type="error">{error}</Alert>}

        {isLoading ? (
          <LoadingState message="Loading recycle bin..." />
        ) : (
          <Table columns={columns} data={rows} keyExtractor={(item) => item.id} emptyText="The recycle bin is empty." />
        )}
      </div>
    </AppShell>
  );
}
