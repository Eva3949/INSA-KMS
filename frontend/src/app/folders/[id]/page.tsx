'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/src/components/layout/AppShell';
import { Breadcrumb } from '@/src/components/ui/Breadcrumb';
import { Button } from '@/src/components/ui/Button';
import { Badge } from '@/src/components/ui/Badge';
import { Table } from '@/src/components/ui/Table';
import { LoadingState, ErrorState } from '@/src/components/ui/States';
import { Folder, FileText, Plus, FolderPlus, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { kmsApi } from '@/src/lib/api';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081/api/v1';

interface Subfolder {
  id: string;
  name: string;
}

interface FolderDocument {
  id: string;
  title: string;
  owner?: string;
  version?: string;
  classification?: string;
  size?: string;
  modified?: string;
}

interface FolderData {
  id: string;
  name: string;
  parentId: string | null;
  children: Subfolder[];
  documents: FolderDocument[];
}

export default function FolderExplorerPage({ params }: { params: { id: string } }) {
  const folderId = params.id;
  const [folder, setFolder] = useState<FolderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creatingFolder, setCreatingFolder] = useState(false);

  const fetchFolder = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = sessionStorage.getItem('kms_access_token');
      const res = await fetch(`${API_BASE_URL}/folders/${folderId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Failed to fetch folder (${res.status})`);
      const data: FolderData = await res.json();
      setFolder(data);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFolder();
  }, [folderId]);

  const columns = [
    {
      header: 'Name',
      accessor: (file: FolderDocument) => (
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-blue-700 shrink-0" />
          <Link href={`/preview/${file.id}`} className="font-medium text-kms-slate-900 hover:text-blue-800">
            {file.title}
          </Link>
        </div>
      ),
    },
    {
      header: 'Owner',
      accessor: (file: FolderDocument) => <span className="text-xs text-kms-slate-600">{file.owner || '—'}</span>,
    },
    {
      header: 'Version',
      accessor: (file: FolderDocument) => (
        <span className="font-mono text-xs text-blue-700 font-bold">{file.version || '—'}</span>
      ),
    },
    {
      header: 'Classification',
      accessor: (file: FolderDocument) =>
        file.classification ? (
          <Badge label={file.classification} classification={file.classification as any} />
        ) : (
          <span className="text-xs text-kms-slate-400">—</span>
        ),
    },
    {
      header: 'Size',
      accessor: (file: FolderDocument) => <span className="text-xs text-kms-slate-500">{file.size || '—'}</span>,
    },
    {
      header: 'Modified',
      accessor: (file: FolderDocument) => <span className="text-xs text-kms-slate-500">{file.modified || '—'}</span>,
    },
  ];

  const subfolders = folder?.children || [];
  const documents = folder?.documents || [];

  return (
    <AppShell>
      <div className="space-y-5">
        <div className="flex items-center justify-between border-b border-kms-slate-200 pb-3">
          <div>
            <Breadcrumb
              items={[
                { label: 'Document Library', href: '/library' },
                { label: folder?.name || `Folder #${folderId}` },
              ]}
            />
            <h1 className="text-xl font-bold text-kms-slate-900 tracking-tight flex items-center gap-2">
              <Folder className="w-5 h-5 text-blue-700" />
              Directory Explorer: {folder?.name || `Folder #${folderId}`}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" icon={<FolderPlus className="w-4 h-4" />} onClick={async () => {
              const name = window.prompt('New subfolder name:');
              if (!name?.trim()) return;
              setCreatingFolder(true);
              try {
                await kmsApi.folders.create({ name: name.trim(), parentId: folderId });
                fetchFolder();
              } catch (err) {
                alert(err instanceof Error ? err.message : 'Failed to create subfolder');
              } finally {
                setCreatingFolder(false);
              }
            }} disabled={creatingFolder}>
              New Subfolder
            </Button>
            <Link href={`/upload?folderId=${folderId}`}>
              <Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />}>
                Upload to Folder
              </Button>
            </Link>
          </div>
        </div>

        {loading && <LoadingState message="Loading folder contents..." />}
        {error && <ErrorState message={error} onRetry={fetchFolder} />}

        {!loading && !error && (
          <>
            {subfolders.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-kms-slate-700 uppercase tracking-wider">Subdirectories</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {subfolders.map((sub) => (
                    <Link
                      key={sub.id}
                      href={`/folders/${sub.id}`}
                      className="kms-card p-3 flex items-center justify-between hover:border-blue-500 hover:shadow-xs transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <Folder className="w-5 h-5 text-amber-500 group-hover:text-blue-600 transition-colors shrink-0" />
                        <div>
                          <div className="text-xs font-semibold text-kms-slate-800 group-hover:text-blue-800">
                            {sub.name}
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-kms-slate-400 group-hover:text-blue-600" />
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2 pt-2">
              <h3 className="text-xs font-bold text-kms-slate-700 uppercase tracking-wider">Documents in Directory</h3>
              <Table
                columns={columns}
                data={documents}
                keyExtractor={(item) => item.id}
                emptyText="No documents in this folder."
              />
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
