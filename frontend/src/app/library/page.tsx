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
  FileCheck, 
  Share2, 
  FolderPlus,
  ShieldCheck,
  History,
  LayoutGrid,
  List,
  Eye,
  BookOpen,
  Building2,
  Calendar,
  HardDrive
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

function extractArticleCoverImage(doc: any): string | null {
  const text = doc.articleContent || doc.extractedText || doc.content || '';
  if (!text) return null;

  const mdMatch = text.match(/!\[.*?\]\((.*?)\)/);
  if (mdMatch && mdMatch[1]) {
    return mdMatch[1];
  }

  const htmlMatch = text.match(/<img[^>]*src=["']([^"']+)["']/i);
  if (htmlMatch && htmlMatch[1]) {
    return htmlMatch[1];
  }

  return null;
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

  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [selectedDoc, setSelectedDoc] = useState<ApiDocument | null>(null);
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [filterClass, setFilterClass] = useState('ALL');
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

  const filteredDocs = documents.filter((doc) => {
    if (filterClass === 'ALL') return true;
    return getDocClassification(doc) === filterClass;
  });

  const columns = [
    {
      header: 'Title',
      accessor: (doc: ApiDocument & { isArticle?: boolean; knowledgeType?: string }) => {
        const isArt = doc.isArticle || doc.fileName?.endsWith('.md') || doc.knowledgeType === 'SOP';
        const targetUrl = isArt ? `/articles/${doc.id}` : `/preview/${doc.id}`;
        return (
          <div className="flex items-center gap-2.5">
            <FileText className={`w-4 h-4 shrink-0 ${isArt ? 'text-emerald-600' : 'text-blue-700'}`} />
            <div>
              <Link href={targetUrl} className="font-medium text-kms-slate-900 hover:text-blue-800 flex items-center gap-1.5">
                {doc.title || doc.fileName || doc.id}
                {isArt && <Badge label={doc.knowledgeType || 'ARTICLE'} variant="blue" />}
              </Link>
              {doc.isCheckedOut && (
                <span className="ml-2">
                  <Badge label="CHECKED OUT" stateBadge="CHECKED_OUT" />
                </span>
              )}
            </div>
          </div>
        );
      },
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
      accessor: (doc: ApiDocument & { isArticle?: boolean }) => {
        const isArt = doc.isArticle || doc.fileName?.endsWith('.md');
        const targetUrl = isArt ? `/articles/${doc.id}` : `/preview/${doc.id}`;
        return (
          <div className="flex items-center gap-1">
            <Link href={targetUrl}>
              <Button variant="ghost" size="sm" icon={<FileCheck className="w-3.5 h-3.5" />} title="View / Preview" />
            </Link>
            <Link href={`/share/${doc.id}`}>
              <Button variant="ghost" size="sm" icon={<Share2 className="w-3.5 h-3.5" />} title="Share" />
            </Link>
            <Link href={`/versions/${doc.id}`}>
              <Button variant="ghost" size="sm" icon={<History className="w-3.5 h-3.5" />} title="Version History" />
            </Link>
          </div>
        );
      },
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
              Document &amp; Knowledge Library
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
                <Button variant="outline" size="sm" icon={<Plus className="w-4 h-4" />}>
                  Upload Document
                </Button>
              </Link>
              <Link href="/articles/create">
                <Button variant="primary" size="sm" icon={<FileText className="w-4 h-4" />}>
                  Create Article
                </Button>
              </Link>
            </div>
          )}
        </div>

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

        {/* Filter & View Mode Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 border border-kms-slate-200 rounded-lg shadow-xs">
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

          <div className="flex items-center gap-4">
            <div className="text-xs text-kms-slate-500 font-medium">
              Showing <span className="font-semibold text-kms-slate-800">{filteredDocs.length}</span>
              {totalItems > documents.length && ` of ${totalItems} total`} items
            </div>

            <div className="flex items-center gap-1 bg-kms-slate-100 p-1 rounded-lg border border-kms-slate-200">
              <button
                onClick={() => setViewMode('grid')}
                title="Grid Card View"
                className={`p-1.5 rounded-md text-xs font-medium transition-all ${
                  viewMode === 'grid' ? 'bg-blue-600 text-white shadow-xs' : 'text-kms-slate-600 hover:text-kms-slate-900'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                title="Table List View"
                className={`p-1.5 rounded-md text-xs font-medium transition-all ${
                  viewMode === 'table' ? 'bg-blue-600 text-white shadow-xs' : 'text-kms-slate-600 hover:text-kms-slate-900'
                }`}
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
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
                    <div className="flex items-center gap-2">
                      <Link href="/upload">
                        <Button variant="outline" size="sm" icon={<Plus className="w-4 h-4" />}>
                          Upload Document
                        </Button>
                      </Link>
                      <Link href="/articles/create">
                        <Button variant="primary" size="sm" icon={<FileText className="w-4 h-4" />}>
                          Create Article
                        </Button>
                      </Link>
                    </div>
                  ) : undefined}
                />
              ) : (
                <>
                  {viewMode === 'grid' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                      {filteredDocs.map((doc: ApiDocument & { isArticle?: boolean; knowledgeType?: string }) => {
                        const isArt = doc.isArticle || doc.fileName?.endsWith('.md') || doc.knowledgeType === 'SOP';
                        const coverImg = isArt ? extractArticleCoverImage(doc) : null;
                        const targetUrl = isArt ? `/articles/${doc.id}` : `/preview/${doc.id}`;
                        const cls = getDocClassification(doc);
                        const dept = getDocDepartment(doc);
                        const versionStr = getDocVersionString(doc);
                        const sizeStr = formatFileSize(getDocSizeBytes(doc));

                        return (
                          <div
                            key={doc.id}
                            className="bg-white/95 backdrop-blur-xs border border-kms-slate-200/90 hover:border-blue-500/70 rounded-2xl overflow-hidden shadow-2xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between group hover:-translate-y-1"
                          >
                            <div>
                              {/* Top Banner Header: Cover Image vs Color Accent Header */}
                              {coverImg ? (
                                <div className="relative h-48 w-full bg-kms-slate-950 overflow-hidden">
                                  <img
                                    src={coverImg}
                                    alt={doc.title || 'Article Cover'}
                                    className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-700 opacity-90"
                                    onError={(e) => {
                                      (e.currentTarget.parentElement as HTMLElement).style.display = 'none';
                                    }}
                                  />
                                  {/* Multi-stop gradient overlay for max contrast & legibility */}
                                  <div className="absolute inset-0 bg-gradient-to-t from-kms-slate-950 via-kms-slate-900/50 to-black/30 p-4 flex flex-col justify-between">
                                    <div className="flex items-center justify-between gap-2">
                                      <div className="flex items-center gap-1.5">
                                        <Badge label={doc.knowledgeType || 'ARTICLE'} variant="blue" />
                                        <Badge label={cls} classification={cls} />
                                      </div>
                                      {doc.isCheckedOut && <Badge label="CHECKED OUT" stateBadge="CHECKED_OUT" />}
                                    </div>

                                    <div className="space-y-1">
                                      <div className="flex items-center gap-1.5 text-[10px] text-blue-200 font-semibold uppercase tracking-wider">
                                        <BookOpen className="w-3 h-3 text-blue-300" />
                                        <span>Knowledge Article</span>
                                      </div>
                                      <Link
                                        href={targetUrl}
                                        className="text-base font-extrabold text-white group-hover:text-blue-200 transition-colors line-clamp-2 leading-snug drop-shadow-md"
                                      >
                                        {doc.title || doc.fileName || doc.id}
                                      </Link>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="p-5 pb-3 space-y-3">
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-1.5">
                                      <Badge label={doc.knowledgeType || (isArt ? 'ARTICLE' : 'DOCUMENT')} variant={isArt ? 'blue' : 'slate'} />
                                      <Badge label={cls} classification={cls} />
                                    </div>
                                    {doc.isCheckedOut && <Badge label="CHECKED OUT" stateBadge="CHECKED_OUT" />}
                                  </div>

                                  <div className="flex items-start gap-3.5 pt-1">
                                    <div className={`p-3 rounded-xl shrink-0 shadow-xs transition-transform group-hover:rotate-3 ${
                                      isArt 
                                        ? 'bg-gradient-to-br from-emerald-500 to-teal-700 text-white shadow-emerald-200/50' 
                                        : 'bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-blue-200/50'
                                    }`}>
                                      {isArt ? <BookOpen className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                      <Link
                                        href={targetUrl}
                                        className="text-base font-extrabold text-kms-slate-900 group-hover:text-blue-700 transition-colors line-clamp-2 leading-snug"
                                      >
                                        {doc.title || doc.fileName || doc.id}
                                      </Link>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Card Body Details */}
                              <div className="p-5 pt-2 space-y-3">
                                {/* Department & Meta Pill Bar */}
                                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-kms-slate-600 pt-2 border-t border-kms-slate-100">
                                  <div className="flex items-center gap-1.5 bg-kms-slate-50 px-2.5 py-1 rounded-md border border-kms-slate-200/70 font-medium">
                                    <Building2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                    <span className="truncate max-w-[120px]">{dept}</span>
                                  </div>

                                  <div className="flex items-center gap-1 font-mono text-[10px] font-bold bg-blue-50 text-blue-800 px-2 py-1 rounded-md border border-blue-200/60">
                                    <span>{versionStr}</span>
                                  </div>
                                </div>

                                {/* Additional Stats Strip */}
                                <div className="flex items-center justify-between text-[11px] text-kms-slate-500 font-medium px-0.5">
                                  <div className="flex items-center gap-1.5">
                                    <Calendar className="w-3.5 h-3.5 text-kms-slate-400 shrink-0" />
                                    <span>{new Date(doc.updatedAt || Date.now()).toLocaleDateString()}</span>
                                  </div>

                                  <div className="flex items-center gap-1.5">
                                    <HardDrive className="w-3.5 h-3.5 text-kms-slate-400 shrink-0" />
                                    <span>{sizeStr}</span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Card Footer Actions */}
                            <div className="p-5 pt-0">
                              <div className="flex items-center justify-between gap-2 pt-3 border-t border-kms-slate-100">
                                <Link href={targetUrl} className="flex-1">
                                  <button className={`w-full text-xs font-bold py-2.5 px-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-xs group-hover:shadow-md ${
                                    isArt
                                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white'
                                      : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white'
                                  }`}>
                                    {isArt ? <BookOpen className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    <span>{isArt ? 'Read Article' : 'Preview Document'}</span>
                                  </button>
                                </Link>

                                <div className="flex items-center gap-1">
                                  <Link href={`/share/${doc.id}`}>
                                    <button title="Share Document" className="p-2 text-kms-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg border border-kms-slate-200/80 transition-colors">
                                      <Share2 className="w-4 h-4" />
                                    </button>
                                  </Link>
                                  <Link href={`/versions/${doc.id}`}>
                                    <button title="Version History" className="p-2 text-kms-slate-500 hover:text-purple-700 hover:bg-purple-50 rounded-lg border border-kms-slate-200/80 transition-colors">
                                      <History className="w-4 h-4" />
                                    </button>
                                  </Link>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <Table
                      columns={columns}
                      data={filteredDocs}
                      keyExtractor={(item: ApiDocument) => item.id}
                      emptyText="No documents match your active filters."
                    />
                  )}

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
                    ✕
                  </button>
                </div>

                <div>
                  <label className="text-[10px] uppercase text-kms-slate-400 font-bold">Title</label>
                  <p className="text-xs font-bold text-kms-slate-900">{selectedDoc.title || selectedDoc.fileName}</p>
                </div>

                <div>
                  <label className="text-[10px] uppercase text-kms-slate-400 font-bold">Classification</label>
                  <div className="mt-1">
                    <Badge label={getDocClassification(selectedDoc)} classification={getDocClassification(selectedDoc)} />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] uppercase text-kms-slate-400 font-bold">Department</label>
                  <p className="text-xs text-kms-slate-700">{getDocDepartment(selectedDoc)}</p>
                </div>

                <div>
                  <label className="text-[10px] uppercase text-kms-slate-400 font-bold">Version</label>
                  <p className="text-xs font-mono font-bold text-blue-700">{getDocVersionString(selectedDoc)}</p>
                </div>

                <div className="pt-2 border-t border-kms-slate-200 flex flex-col gap-2">
                  <Link href={`/preview/${selectedDoc.id}`}>
                    <Button variant="primary" size="sm" className="w-full" icon={<FileCheck className="w-3.5 h-3.5" />}>
                      Open Preview
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* New Folder Modal */}
      <Modal isOpen={isFolderModalOpen} onClose={() => setIsFolderModalOpen(false)} title="Create New Folder">
        <div className="space-y-4">
          <Input
            label="Folder Name"
            placeholder="e.g., Q3 Financial Reports"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setIsFolderModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleCreateFolder} disabled={folderCreating}>
              {folderCreating ? 'Creating...' : 'Create Folder'}
            </Button>
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}
