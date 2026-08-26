'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AppShell } from '@/src/components/layout/AppShell';
import { Button } from '@/src/components/ui/Button';
import { Badge } from '@/src/components/ui/Badge';
import { Table } from '@/src/components/ui/Table';
import { Card } from '@/src/components/ui/Card';
import { Breadcrumb } from '@/src/components/ui/Breadcrumb';
import { Pagination } from '@/src/components/ui/Pagination';
import { Modal } from '@/src/components/ui/Modal';
import { Input, Select } from '@/src/components/ui/Input';
import { LoadingState, EmptyState, ErrorState } from '@/src/components/ui/States';
import { 
  FileText, 
  Plus, 
  Filter, 
  Lock, 
  LockOpen,
  FileCheck, 
  Share2, 
  MoreVertical, 
  Trash2,
  Tag,
  FolderPlus,
  Loader2,
  ShieldCheck,
  History,
} from 'lucide-react';
import Link from 'next/link';
import { kmsApi } from '@/src/lib/api';
import { useAuth } from '@/src/lib/auth-context';

interface ApiDocument {
  id: string;
  title?: string;
  fileName?: string;
  department?: string;
  ownerDepartment?: { name?: string; code?: string };
  owner?: string;
  confidentialityLevel?: 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED';
  securityClassification?: 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED';
  currentVersion?: string | {
    versionNumber?: number;
    fileName?: string;
    storageObject?: {
      fileSizeBytes?: number;
      checksumSha256?: string;
    };
  };
  fileSizeBytes?: number;
  updatedAt?: string;
  isCheckedOut?: boolean;
}

function getDocDepartment(doc: ApiDocument): string {
  return doc.department || doc.ownerDepartment?.name || doc.ownerDepartment?.code || 'General';
}

function getDocClassification(doc: ApiDocument): 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED' {
  return (doc.securityClassification || doc.confidentialityLevel || 'INTERNAL') as any;
}

function getDocVersionString(doc: ApiDocument): string {
  if (!doc.currentVersion) return 'v1';
  if (typeof doc.currentVersion === 'string') return doc.currentVersion;
  return `v${doc.currentVersion.versionNumber || 1}`;
}

function getDocSizeBytes(doc: ApiDocument): number | undefined {
  if (typeof doc.fileSizeBytes === 'number') return doc.fileSizeBytes;
  if (typeof doc.currentVersion === 'object' && doc.currentVersion?.storageObject?.fileSizeBytes) {
    return doc.currentVersion.storageObject.fileSizeBytes;
  }
  return undefined;
}

function formatFileSize(bytes?: number): string {
  if (!bytes) return '?';
  const mb = bytes / (1024 * 1024);
  if (mb < 1) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${mb.toFixed(1)} MB`;
}

export default function DocumentLibraryPage() {
  const { roles } = useAuth();
  const canWrite = roles.includes('ROLE_ADMIN') || roles.includes('ROLE_CONTRIBUTOR');

  const [documents, setDocuments] = useState<ApiDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const PAGE_SIZE = 10;

  const [selectedDoc, setSelectedDoc] = useState<ApiDocument | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [filterClass, setFilterClass] = useState('ALL');
  const [lockStatuses, setLockStatuses] = useState<Record<string, { locked: boolean; lockedBy?: string }>>({});
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [checkinDocId, setCheckinDocId] = useState<string | null>(null);
  const [checkinFile, setCheckinFile] = useState<File | null>(null);
  const [checkinLoading, setCheckinLoading] = useState(false);
  const [libraryMessage, setLibraryMessage] = useState<string | null>(null);
  const [folderCreating, setFolderCreating] = useState(false);

  const loadDocuments = useCallback((page: number) => {
    setIsLoading(true);
    setError(null);
    kmsApi.documents.list(page, PAGE_SIZE)
      .then((data) => {
        let docs: ApiDocument[];
        if (Array.isArray(data)) {
          docs = data as ApiDocument[];
          setDocuments(docs);
          setTotalPages(1);
          setTotalItems(docs.length);
        } else {
          const paged = data as { content?: ApiDocument[]; totalPages?: number; totalElements?: number };
          docs = paged.content ?? [];
          setDocuments(docs);
          setTotalPages(paged.totalPages ?? 1);
          setTotalItems(paged.totalElements ?? 0);
        }
        docs.forEach((doc) => {
          kmsApi.documents.getLockStatus(doc.id)
            .then((status) => {
              setLockStatuses((prev) => ({ ...prev, [doc.id]: { locked: status.locked, lockedBy: status.lockedBy } }));
            })
            .catch(() => {});
        });
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Failed to load documents';
        setError(msg.includes('403') ? 'You do not have permission to view the document library.' : msg);
      })
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    loadDocuments(currentPage);
  }, [loadDocuments, currentPage]);

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    setFolderCreating(true);
    try {
      await kmsApi.folders.create({ name: newFolderName.trim() });
      setIsFolderModalOpen(false);
      setNewFolderName('');
      setLibraryMessage('Folder created successfully.');
      loadDocuments(currentPage);
    } catch (err: unknown) {
      setLibraryMessage(err instanceof Error ? err.message : 'Failed to create folder');
    } finally {
      setFolderCreating(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) setSelectedIds(documents.map((d) => d.id));
    else setSelectedIds([]);
  };

  const handleSelectRow = (id: string) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]);
  };

  const filteredDocs = documents.filter((doc) => {
    const classification = getDocClassification(doc);
    if (filterClass !== 'ALL' && classification !== filterClass) return false;
    return true;
  });

  const handleCheckout = async (docId: string) => {
    setCheckoutLoading(docId);
    try {
      await kmsApi.documents.checkout(docId);
      const status = await kmsApi.documents.getLockStatus(docId);
      setLockStatuses((prev) => ({ ...prev, [docId]: { locked: status.locked, lockedBy: status.lockedBy } }));
      setDocuments((prev) => prev.map((d) => d.id === docId ? { ...d, isCheckedOut: true } : d));
      setLibraryMessage('Document checked out successfully.');
    } catch (err: unknown) {
      setLibraryMessage(err instanceof Error ? err.message : 'Checkout failed');
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
      setDocuments((prev) => prev.map((d) => d.id === docId ? { ...d, isCheckedOut: false } : d));
      setCheckinDocId(null);
      setCheckinFile(null);
      setLibraryMessage('Document checked in successfully.');
    } catch (err: unknown) {
      setLibraryMessage(err instanceof Error ? err.message : 'Check-in failed');
    } finally {
      setCheckinLoading(false);
    }
  };

  const columns = [
    {
      header: '',
      accessor: (doc: ApiDocument) => (
        <input
          type="checkbox"
          checked={selectedIds.includes(doc.id)}
          onChange={() => handleSelectRow(doc.id)}
          className="rounded border-kms-slate-300 text-blue-600 focus:ring-blue-500"
        />
      ),
      className: 'w-8',
    },
    {
      header: 'Title',
      accessor: (doc: ApiDocument) => (
        <div className="flex items-center gap-2.5">
          <FileText className="w-4 h-4 text-blue-700 shrink-0" />
          <div>
            <Link href={`/preview/${doc.id}`} className="font-medium text-kms-slate-900 hover:text-blue-800">
              {doc.title || doc.fileName || doc.id}
            </Link>
            {doc.isCheckedOut && (
              <span className="ml-2">
                <Badge label="CHECKED OUT" stateBadge="CHECKED_OUT" />
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      header: 'Department',
      accessor: (doc: ApiDocument) => <span className="text-xs text-kms-slate-600">{getDocDepartment(doc)}</span>,
    },
    {
      header: 'Version',
      accessor: (doc: ApiDocument) => (
        <Link href={`/versions/${doc.id}`} className="font-mono text-xs text-blue-700 hover:underline font-bold">
          {getDocVersionString(doc)}
        </Link>
      ),
    },
    {
      header: 'Classification',
      accessor: (doc: ApiDocument) => {
        const cls = getDocClassification(doc);
        return <Badge label={cls} classification={cls} />;
      },
    },
    {
      header: 'Size',
      accessor: (doc: ApiDocument) => <span className="text-xs text-kms-slate-500">{formatFileSize(getDocSizeBytes(doc))}</span>,
    },
    {
      header: 'Actions',
      accessor: (doc: ApiDocument) => (
        <div className="flex items-center gap-1">
          <Link href={`/preview/${doc.id}`}>
            <Button variant="ghost" size="sm" icon={<FileCheck className="w-3.5 h-3.5" />} title="Preview" />
          </Link>
          <Link href={`/share/${doc.id}`}>
            <Button variant="ghost" size="sm" icon={<Share2 className="w-3.5 h-3.5" />} title="Share" />
          </Link>
          <Link href={`/versions/${doc.id}`}>
            <Button variant="ghost" size="sm" icon={<History className="w-3.5 h-3.5" />} title="Version History" />
          </Link>
        </div>
      ),
    },
  ];

  return (
    <AppShell>
      <div className="space-y-5">
        {/* Header & Breadcrumb */}
        <div className="flex items-center justify-between border-b border-kms-slate-200 pb-3">
          <div>
            <Breadcrumb items={[{ label: 'Document Library' }]} />
            <h1 className="text-xl font-bold text-kms-slate-900 tracking-tight">
              Document Library Workspace
            </h1>
          </div>

          {canWrite && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                icon={<FolderPlus className="w-4 h-4" />}
                onClick={() => setIsFolderModalOpen(true)}
              >
                New Folder
              </Button>
              <Link href="/upload">
                <Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />}>
                  Upload Document
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Bulk Actions Bar */}
        {selectedIds.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 p-2.5 rounded flex items-center justify-between text-xs text-blue-900">
            <div className="font-semibold flex items-center gap-2">
              <span>{selectedIds.length} item(s) selected</span>
              <button onClick={() => setSelectedIds([])} className="text-[11px] text-blue-700 hover:underline font-normal">
                Clear Selection
              </button>
            </div>
            {canWrite && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  icon={<Tag className="w-3.5 h-3.5" />}
                  onClick={async () => {
                    const tag = window.prompt('Enter tag name:');
                    if (!tag) return;
                    try {
                      await kmsApi.documents.bulk({ operation: 'tag', documentIds: selectedIds, tags: [tag] });
                      setLibraryMessage('Tags applied successfully.');
                      setSelectedIds([]);
                      loadDocuments(currentPage);
                    } catch (err: unknown) {
                      setLibraryMessage(err instanceof Error ? err.message : 'Failed to apply tags');
                    }
                  }}
                >
                  Bulk Tag
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  icon={<Trash2 className="w-3.5 h-3.5" />}
                  onClick={async () => {
                    if (!window.confirm(`Delete ${selectedIds.length} selected document(s)?`)) return;
                    try {
                      for (const id of selectedIds) {
                        await kmsApi.documents.delete(id);
                      }
                      setLibraryMessage('Documents deleted successfully.');
                      setSelectedIds([]);
                      loadDocuments(currentPage);
                    } catch (err: unknown) {
                      setLibraryMessage(err instanceof Error ? err.message : 'Failed to delete documents');
                    }
                  }}
                >
                  Delete Selected
                </Button>
              </div>
            )}
          </div>
        )}

        {libraryMessage && (
          <div className="p-3 bg-blue-50 border border-blue-200 text-blue-900 text-xs rounded flex items-center justify-between">
            <div className="flex items-center gap-2 font-medium">
              <ShieldCheck className="w-4 h-4 text-blue-700" />
              <span>{libraryMessage}</span>
            </div>
            <button onClick={() => setLibraryMessage(null)} className="text-blue-700 font-bold hover:underline">
              Dismiss
            </button>
          </div>
        )}

        {/* Filter Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 border border-kms-slate-200 rounded shadow-xs">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-kms-slate-600 font-semibold">
              <Filter className="w-3.5 h-3.5 text-kms-slate-400" />
              <span>Filter:</span>
            </div>
            <Select
              options={[
                { label: 'All Classifications', value: 'ALL' },
                { label: 'PUBLIC', value: 'PUBLIC' },
                { label: 'INTERNAL', value: 'INTERNAL' },
                { label: 'CONFIDENTIAL', value: 'CONFIDENTIAL' },
                { label: 'RESTRICTED', value: 'RESTRICTED' },
              ]}
              value={filterClass}
              onChange={(e) => setFilterClass(e.target.value)}
              className="w-44"
            />
          </div>
          <div className="text-xs text-kms-slate-500 font-medium">
            Showing <span className="font-semibold text-kms-slate-800">{filteredDocs.length}</span>
            {totalItems > documents.length && ` of ${totalItems} total`} items
          </div>
        </div>

        {/* Content Area */}
        {isLoading && <LoadingState message="Loading documents..." />}
        {error && <ErrorState title="Failed to load documents" message={error} onRetry={() => loadDocuments(currentPage)} />}

        {!isLoading && !error && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className={`space-y-4 ${selectedDoc ? 'lg:col-span-3' : 'lg:col-span-4'}`}>
              {filteredDocs.length === 0 ? (
                <EmptyState
                  title="No documents found"
                  message="The repository is empty or no documents match your current filters."
                  action={canWrite ? (
                    <Link href="/upload">
                      <Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />}>
                        Upload First Document
                      </Button>
                    </Link>
                  ) : undefined}
                />
              ) : (
                <>
                  <Table
                    columns={columns}
                    data={filteredDocs}
                    keyExtractor={(item: ApiDocument) => item.id}
                    emptyText="No documents match your active filters."
                  />
                  <Pagination
                    currentPage={currentPage + 1}
                    totalPages={totalPages}
                    totalItems={totalItems}
                    pageSize={PAGE_SIZE}
                    onPageChange={(page) => setCurrentPage(page - 1)}
                  />
                </>
              )}
            </div>

            {/* Metadata Inspector Drawer */}
            {selectedDoc && (
              <div className="kms-card p-4 space-y-4 bg-white border border-kms-slate-300">
                <div className="flex items-center justify-between border-b border-kms-slate-200 pb-2">
                  <h3 className="text-xs font-bold text-kms-slate-800 uppercase tracking-wide">
                    Metadata Inspector
                  </h3>
                  <button onClick={() => setSelectedDoc(null)} className="text-xs text-kms-slate-400 hover:text-kms-slate-700 font-bold">
                    ?
                  </button>
                </div>

                <div>
                  <div className="text-xs font-semibold text-kms-slate-900 mb-1">{selectedDoc.title || selectedDoc.fileName}</div>
                  <Badge label={getDocClassification(selectedDoc)} classification={getDocClassification(selectedDoc)} />
                </div>

                <div className="space-y-2 text-xs divide-y divide-kms-slate-100">
                  <div className="pt-2 flex justify-between text-kms-slate-600">
                    <span>Department:</span>
                    <span className="font-medium text-kms-slate-900">{getDocDepartment(selectedDoc)}</span>
                  </div>
                  <div className="pt-2 flex justify-between text-kms-slate-600">
                    <span>Version:</span>
                    <span className="font-mono font-bold text-blue-800">{getDocVersionString(selectedDoc)}</span>
                  </div>
                  <div className="pt-2 flex justify-between text-kms-slate-600">
                    <span>File Size:</span>
                    <span className="font-medium text-kms-slate-900">{formatFileSize(getDocSizeBytes(selectedDoc))}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-kms-slate-200 space-y-2">
                  <Link href={`/preview/${selectedDoc.id}`}>
                    <Button variant="primary" size="sm" className="w-full justify-center" icon={<FileCheck className="w-4 h-4" />}>
                      Open Preview
                    </Button>
                  </Link>
                  <Link href={`/versions/${selectedDoc.id}`}>
                    <Button variant="outline" size="sm" className="w-full justify-center">
                      Version History
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Create Folder Modal */}
        <Modal
          isOpen={isFolderModalOpen}
          onClose={() => setIsFolderModalOpen(false)}
          title="Create New Directory Folder"
          subtitle="Folders organize documents hierarchically within department boundaries."
          footer={
            <>
              <Button variant="outline" size="sm" onClick={() => { setIsFolderModalOpen(false); setNewFolderName(''); }}>Cancel</Button>
              <Button variant="primary" size="sm" onClick={handleCreateFolder} disabled={folderCreating || !newFolderName.trim()}>
                {folderCreating ? 'Creating...' : 'Create Folder'}
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <Input
              label="Folder Name"
              placeholder="e.g. Standard Operating Procedures 2026"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              required
            />
          </div>
        </Modal>
      </div>
    </AppShell>
  );
}
