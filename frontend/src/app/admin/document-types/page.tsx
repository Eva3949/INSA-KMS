'use client';

import React from 'react';
import { AppShell } from '@/src/components/layout/AppShell';
import { Breadcrumb } from '@/src/components/ui/Breadcrumb';
import { Button } from '@/src/components/ui/Button';
import { Input } from '@/src/components/ui/Input';
import { Modal } from '@/src/components/ui/Modal';
import { Table } from '@/src/components/ui/Table';
import { LoadingState, ErrorState } from '@/src/components/ui/States';
import { Alert } from '@/src/components/ui/Alert';
import { kmsApi } from '@/src/lib/api';
import { FileCheck2, Plus, Pencil, Trash2 } from 'lucide-react';

interface DocTypeRow {
  id: string;
  name: string;
  description?: string | null;
  documentCount: number;
  createdAt: string;
}

export default function AdminDocumentTypesPage() {
  const [rows, setRows] = React.useState<DocTypeRow[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<DocTypeRow | null>(null);
  const [formName, setFormName] = React.useState('');
  const [formDescription, setFormDescription] = React.useState('');
  const [isSaving, setIsSaving] = React.useState(false);

  const load = React.useCallback(() => {
    setIsLoading(true);
    setError(null);
    kmsApi.admin
      .getDocumentTypes()
      .then((data) => setRows(data as DocTypeRow[]))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Failed to load document types'))
      .finally(() => setIsLoading(false));
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setFormName('');
    setFormDescription('');
    setNotice(null);
    setIsModalOpen(true);
  };

  const openEdit = (dt: DocTypeRow) => {
    setEditing(dt);
    setFormName(dt.name);
    setFormDescription(dt.description || '');
    setNotice(null);
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      setError('Document type name is required.');
      return;
    }
    setIsSaving(true);
    try {
      const payload = { name: formName.trim(), description: formDescription.trim() };
      if (editing) {
        await kmsApi.admin.updateDocumentType(editing.id, payload);
        setNotice(`Document type "${payload.name}" updated.`);
      } else {
        await kmsApi.admin.createDocumentType(payload);
        setNotice(`Document type "${payload.name}" created.`);
      }
      setIsModalOpen(false);
      setError(null);
      load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (dt: DocTypeRow) => {
    if (!window.confirm(`Delete document type "${dt.name}"? Only types not used by documents can be removed.`)) {
      return;
    }
    try {
      await kmsApi.admin.deleteDocumentType(dt.id);
      setNotice(`Document type "${dt.name}" deleted.`);
      setError(null);
      load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  const columns = [
    {
      header: 'Document Type Name',
      accessor: (dt: DocTypeRow) => (
        <div className="font-bold text-kms-slate-900 text-xs flex items-center gap-2">
          <FileCheck2 className="w-4 h-4 text-blue-700" />
          {dt.name}
        </div>
      ),
    },
    {
      header: 'Description',
      accessor: (dt: DocTypeRow) => <span className="text-xs text-kms-slate-600">{dt.description || '-'}</span>,
    },
    {
      header: 'Documents In Use',
      accessor: (dt: DocTypeRow) => (
        <span className="font-mono text-xs text-kms-slate-800 bg-kms-slate-100 px-2 py-0.5 rounded border border-kms-slate-300">
          {dt.documentCount} Documents
        </span>
      ),
    },
    {
      header: 'Actions',
      accessor: (dt: DocTypeRow) => (
        <div className="flex items-center gap-1.5">
          <button onClick={() => openEdit(dt)} title="Edit" className="p-1.5 rounded hover:bg-blue-50 text-blue-700">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => handleDelete(dt)} title="Delete" className="p-1.5 rounded hover:bg-red-50 text-red-600">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <AppShell requiredRole="ROLE_ADMIN">
      <div className="space-y-5">
        <div className="flex items-center justify-between border-b border-kms-slate-200 pb-3">
          <div>
            <Breadcrumb items={[{ label: 'Administration', href: '/admin' }, { label: 'Document Types' }]} />
            <h1 className="text-xl font-bold text-kms-slate-900 tracking-tight flex items-center gap-2">
              <FileCheck2 className="w-5 h-5 text-blue-700" />
              Document Types & Custom Metadata Schemas
            </h1>
          </div>

          <Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />} onClick={openCreate}>
            Create Document Type
          </Button>
        </div>

        {notice && <Alert type="success">{notice}</Alert>}
        {error && <Alert type="error">{error}</Alert>}

        {isLoading ? (
          <LoadingState message="Loading document types..." />
        ) : (
          <Table columns={columns} data={rows} keyExtractor={(item) => item.id} emptyText="No document types defined." />
        )}

        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editing ? `Edit Document Type: ${editing.name}` : 'Create Document Type'}
        >
          <div className="space-y-4">
            <Input label="Type Name" value={formName} onChange={(e) => setFormName(e.target.value)} required />
            <Input label="Description" value={formDescription} onChange={(e) => setFormDescription(e.target.value)} />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" size="sm" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleSave} disabled={isSaving}>
                {isSaving ? 'Saving...' : editing ? 'Save Changes' : 'Create Type'}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </AppShell>
  );
}
