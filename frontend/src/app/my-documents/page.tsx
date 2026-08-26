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
import { User, FileText, RefreshCw, Upload, Lock, LockOpen, Share2, Trash2, History, FileCheck, Loader2, MoreVertical } from 'lucide-react';
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
  const [lockStatuses, setLockStatuses] = React.useState<Record<string, { locked: boolean; lockedBy?: string }>>({});
  const [checkoutLoading, setCheckoutLoading] = React.useState<string | null>(null);
  const [checkinDocId, setCheckinDocId] = React.useState<string | null>(null);
  const [checkinFile, setCheckinFile] = React.useState<File | null>(null);
  const [checkinLoading, setCheckinLoading] = React.useState(false);
  const [actionMessage, setActionMessage] = React.useState<string | null>(null);
  const [selectedDoc, setSelectedDoc] = React.useState<DocRow | null>(null);

  const load = React.useCallback((targetPage: number) => {
    setIsLoading(true);
    setError(null);
    kmsApi.documents
      .mine(targetPage, PAGE_SIZE)
      .then((data: any) => {
        const fetchedDocs = (data?.content ?? []) as DocRow[];
        setDocs(fetchedDocs);
        setTotalPages(data?.totalPages ?? 1);
        setTotalItems(data?.totalElements ?? 0);
        fetchedDocs.forEach((d) => {
          kmsApi.documents.getLockStatus(d.id)
            .then((status) => setLockStatuses((prev) => ({ ...prev, [d.id]: { locked: status.locked, lockedBy: status.lockedBy } })))
            .catch(() => {});
        });
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Could not load your documents'))
      .finally(() => setIsLoading(false));
  }, []);

  React.useEffect(() => {
    load(page);
  }, [load, page]);

  const handleCheckout = async (docId: string) => {
    setCheckoutLoading(docId);
    try {
      await kmsApi.documents.checkout(docId);
      const status = await kmsApi.documents.getLockStatus(docId);
      setLockStatuses((prev) => ({ ...prev, [docId]: { locked: status.locked, lockedBy: status.lockedBy } }));
      setActionMessage('Document checked out successfully.');
    } catch (err: unknown) {
      setActionMessage(err instanceof Error ? err.message : 'Checkout failed');
    } finally {
      setCheckoutLoading(null);
    }
  };

  const handleCheckin = async (docId: string) => {
    if (!checkinFile) return;
    setCheckinLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', checkinFile);
      await kmsApi.documents.checkin(docId, formData);
      const status = await kmsApi.documents.getLockStatus(docId);
      setLockStatuses((prev) => ({ ...prev, [docId]: { locked: status.locked, lockedBy: status.lockedBy } }));
      setCheckinDocId(null);
      setCheckinFile(null);
      setActionMessage('Document checked in successfully.');
    } catch (err: unknown) {
      setActionMessage(err instanceof Error ? err.message : 'Check-in failed');
    } finally {
      setCheckinLoading(false);
    }
  };

  const handleDelete = async (doc: DocRow) => {
    if (!window.confirm(`Delete "${doc.title || doc.fileName || doc.id}"?`)) return;
    try {
      await kmsApi.documents.delete(doc.id);
      setActionMessage('Document deleted successfully.');
      load(page);
    } catch (err: unknown) {
      setActionMessage(err instanceof Error ? err.message : 'Delete failed');
    }
  };

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
    {
      header: 'Actions',
      accessor: (doc: DocRow) => {
        const lock = lockStatuses[doc.id];
        const isCheckedOut = lock?.locked;
        const isLockedByMe = lock?.locked && lock.lockedBy === 'current';
        return (
          <div className="flex items-center gap-1">
            <Link href={`/preview/${doc.id}`}>
              <Button variant="ghost" size="sm" icon={<FileCheck className="w-3.5 h-3.5" />} title="Preview" />
            </Link>
            {isCheckedOut ? (
              isLockedByMe ? (
                <Button
                  variant="ghost"
                  size="sm"
                  icon={checkinLoading && checkinDocId === doc.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LockOpen className="w-3.5 h-3.5 text-emerald-600" />}
                  title="Check In"
                  onClick={() => setCheckinDocId(checkinDocId === doc.id ? null : doc.id)}
                />
              ) : (
                <span className="flex items-center gap-1 text-[10px] text-amber-700 font-medium" title={`Locked by ${lock?.lockedBy || 'another user'}`}>
                  <Lock className="w-3 h-3" /> Locked
                </span>
              )
            ) : (
              <Button
                variant="ghost"
                size="sm"
                icon={checkoutLoading === doc.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
                title="Check Out"
                onClick={() => handleCheckout(doc.id)}
                disabled={checkoutLoading === doc.id}
              />
            )}
            <Link href={`/share/${doc.id}`}>
              <Button variant="ghost" size="sm" icon={<Share2 className="w-3.5 h-3.5" />} title="Share" />
            </Link>
            <Link href={`/versions/${doc.id}`}>
              <Button variant="ghost" size="sm" icon={<History className="w-3.5 h-3.5" />} title="Version History" />
            </Link>
            <Button
              variant="ghost"
              size="sm"
              icon={<Trash2 className="w-3.5 h-3.5 text-red-500" />}
              title="Delete"
              onClick={() => handleDelete(doc)}
            />
            {checkinDocId === doc.id && (
              <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => { setCheckinDocId(null); setCheckinFile(null); }}>
                <div className="bg-white rounded-lg p-5 shadow-xl max-w-sm w-full space-y-4" onClick={(e) => e.stopPropagation()}>
                  <h3 className="text-sm font-bold text-kms-slate-900">Check In Document</h3>
                  <p className="text-xs text-kms-slate-600">Upload the updated file to check this document back in.</p>
                  <input
                    type="file"
                    onChange={(e) => setCheckinFile(e.target.files?.[0] || null)}
                    className="text-xs text-kms-slate-700 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => { setCheckinDocId(null); setCheckinFile(null); }}>Cancel</Button>
                    <Button variant="primary" size="sm" onClick={() => handleCheckin(doc.id)} disabled={!checkinFile || checkinLoading}>
                      {checkinLoading ? 'Checking In...' : 'Check In'}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      },
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

        {actionMessage && (
          <div className="p-3 bg-blue-50 border border-blue-200 text-blue-900 text-xs rounded flex items-center justify-between">
            <div className="flex items-center gap-2 font-medium">
              <FileCheck className="w-4 h-4 text-blue-700" />
              <span>{actionMessage}</span>
            </div>
            <button onClick={() => setActionMessage(null)} className="text-blue-700 font-bold hover:underline">Dismiss</button>
          </div>
        )}

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
