'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/src/components/layout/AppShell';
import { Breadcrumb } from '@/src/components/ui/Breadcrumb';
import { Table } from '@/src/components/ui/Table';
import { Badge } from '@/src/components/ui/Badge';
import { Button } from '@/src/components/ui/Button';
import { LoadingState } from '@/src/components/ui/States';
import { Alert } from '@/src/components/ui/Alert';
import { kmsApi } from '@/src/lib/api';
import { Folder, FolderPlus, ChevronRight, RefreshCw } from 'lucide-react';
import Link from 'next/link';

interface FolderRow {
  id: string;
  name: string;
  parentId: string | null;
  departmentId: string | null;
  departmentName: string | null;
  ownerUsername: string | null;
  confidentialityLevel: string;
  isDeleted: boolean;
  createdAt: string;
}

export default function FoldersListPage() {
  const [folders, setFolders] = useState<FolderRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const load = () => {
    setIsLoading(true);
    setError(null);
    kmsApi.folders
      .list()
      .then((data: any) => {
        setFolders(Array.isArray(data) ? data : []);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Could not load folders'))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async () => {
    if (!newFolderName.trim()) return;
    setIsCreating(true);
    try {
      await kmsApi.folders.create({ name: newFolderName.trim() });
      setShowCreateModal(false);
      setNewFolderName('');
      setActionMessage('Folder created successfully.');
      load();
    } catch (err: unknown) {
      setActionMessage(err instanceof Error ? err.message : 'Failed to create folder');
    } finally {
      setIsCreating(false);
    }
  };

  const columns = [
    {
      header: 'Folder',
      accessor: (f: FolderRow) => (
        <div className="flex items-center gap-2">
          <Folder className="w-4 h-4 text-amber-500 shrink-0" />
          <Link href={`/folders/${f.id}`} className="font-medium text-kms-slate-900 hover:text-blue-800">
            {f.name}
          </Link>
        </div>
      ),
    },
    {
      header: 'Department',
      accessor: (f: FolderRow) => <span className="text-xs text-kms-slate-600">{f.departmentName || '—'}</span>,
    },
    {
      header: 'Owner',
      accessor: (f: FolderRow) => <span className="text-xs text-kms-slate-600">{f.ownerUsername || '—'}</span>,
    },
    {
      header: 'Classification',
      accessor: (f: FolderRow) => (
        <Badge label={f.confidentialityLevel || 'INTERNAL'} classification={(f.confidentialityLevel || 'INTERNAL') as any} />
      ),
    },
    {
      header: 'Created',
      accessor: (f: FolderRow) => (
        <span className="text-xs text-kms-slate-500">
          {f.createdAt ? new Date(f.createdAt).toLocaleDateString() : '—'}
        </span>
      ),
    },
    {
      header: '',
      accessor: (f: FolderRow) => (
        <Link href={`/folders/${f.id}`}>
          <Button variant="ghost" size="sm" icon={<ChevronRight className="w-3.5 h-3.5" />} title="Open Folder" />
        </Link>
      ),
    },
  ];

  return (
    <AppShell>
      <div className="space-y-5">
        <div className="flex items-center justify-between border-b border-kms-slate-200 pb-3">
          <div>
            <Breadcrumb items={[{ label: 'Workspace' }, { label: 'Folders' }]} />
            <h1 className="text-xl font-bold text-kms-slate-900 tracking-tight flex items-center gap-2">
              <Folder className="w-5 h-5 text-amber-500" />
              Document Folders
            </h1>
            <p className="text-[11px] text-kms-slate-500 mt-1">{folders.length} folder(s) you have access to</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="primary" size="sm" icon={<FolderPlus className="w-4 h-4" />} onClick={() => setShowCreateModal(true)}>
              New Folder
            </Button>
            <Button variant="outline" size="sm" icon={<RefreshCw className="w-4 h-4" />} onClick={load}>
              Refresh
            </Button>
          </div>
        </div>

        {error && <Alert type="error">{error}</Alert>}

        {actionMessage && (
          <div className="p-3 bg-blue-50 border border-blue-200 text-blue-900 text-xs rounded flex items-center justify-between">
            <div className="flex items-center gap-2 font-medium">
              <Folder className="w-4 h-4 text-blue-700" />
              <span>{actionMessage}</span>
            </div>
            <button onClick={() => setActionMessage(null)} className="text-blue-700 font-bold hover:underline">Dismiss</button>
          </div>
        )}

        {isLoading ? (
          <LoadingState message="Loading folders..." />
        ) : (
          <Table
            columns={columns}
            data={folders}
            keyExtractor={(item) => item.id}
            emptyText="No folders found. Create your first folder to organize documents."
          />
        )}

        {showCreateModal && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setShowCreateModal(false)}>
            <div className="bg-white rounded-lg p-5 shadow-xl max-w-sm w-full space-y-4" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-sm font-bold text-kms-slate-900">Create New Folder</h3>
              <p className="text-xs text-kms-slate-600">Folders organize documents hierarchically.</p>
              <input
                type="text"
                placeholder="Folder name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                autoFocus
              />
              <div className="flex justify-end gap-2 pt-1">
                <Button variant="outline" size="sm" onClick={() => { setShowCreateModal(false); setNewFolderName(''); }}>Cancel</Button>
                <Button variant="primary" size="sm" onClick={handleCreate} disabled={isCreating || !newFolderName.trim()}>
                  {isCreating ? 'Creating...' : 'Create Folder'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
