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
import { Tag as TagIcon, Plus, Pencil, Trash2 } from 'lucide-react';

interface TagRow {
  id: string;
  name: string;
  category: string;
  documentCount: number;
  createdAt: string;
}

export default function AdminTaxonomyPage() {
  const [rows, setRows] = React.useState<TagRow[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<TagRow | null>(null);
  const [formName, setFormName] = React.useState('');
  const [formCategory, setFormCategory] = React.useState('General');
  const [isSaving, setIsSaving] = React.useState(false);

  const load = React.useCallback(() => {
    setIsLoading(true);
    setError(null);
    kmsApi.admin
      .getTags()
      .then((data) => setRows(data as TagRow[]))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Failed to load tags'))
      .finally(() => setIsLoading(false));
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setFormName('');
    setFormCategory('General');
    setNotice(null);
    setIsModalOpen(true);
  };

  const openEdit = (tag: TagRow) => {
    setEditing(tag);
    setFormName(tag.name);
    setFormCategory(tag.category || 'General');
    setNotice(null);
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      setError('Tag name is required.');
      return;
    }
    setIsSaving(true);
    try {
      if (editing) {
        await kmsApi.admin.updateTag(editing.id, { name: formName.trim(), category: formCategory.trim() });
        setNotice(`Tag "#${formName.trim()}" updated.`);
      } else {
        await kmsApi.admin.createTag({ name: formName.trim(), category: formCategory.trim() });
        setNotice(`Tag "#${formName.trim()}" created.`);
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

  const handleDelete = async (tag: TagRow) => {
    if (!window.confirm(`Delete tag "#${tag.name}"? It will be detached from all tagged documents.`)) {
      return;
    }
    try {
      await kmsApi.admin.deleteTag(tag.id);
      setNotice(`Tag "#${tag.name}" deleted.`);
      setError(null);
      load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  const columns = [
    {
      header: 'Tag Name',
      accessor: (t: TagRow) => (
        <span className="font-bold text-xs text-kms-slate-900 bg-kms-slate-100 px-2 py-1 rounded border border-kms-slate-300 flex items-center gap-1.5 w-fit">
          <TagIcon className="w-3 h-3 text-kms-slate-500" />
          #{t.name}
        </span>
      ),
    },
    {
      header: 'Category Taxonomy',
      accessor: (t: TagRow) => <span className="text-xs text-kms-slate-700">{t.category}</span>,
    },
    {
      header: 'Tagged Document Usage',
      accessor: (t: TagRow) => (
        <span className="font-mono text-xs font-semibold text-blue-700">{t.documentCount} Documents Tagged</span>
      ),
    },
    {
      header: 'Actions',
      accessor: (t: TagRow) => (
        <div className="flex items-center gap-1.5">
          <button onClick={() => openEdit(t)} title="Edit" className="p-1.5 rounded hover:bg-blue-50 text-blue-700">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => handleDelete(t)} title="Delete" className="p-1.5 rounded hover:bg-red-50 text-red-600">
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
            <Breadcrumb items={[{ label: 'Administration', href: '/admin' }, { label: 'Taxonomy & Tags' }]} />
            <h1 className="text-xl font-bold text-kms-slate-900 tracking-tight flex items-center gap-2">
              <TagIcon className="w-5 h-5 text-blue-700" />
              Taxonomy Keyword Tags & Controlled Vocabulary
            </h1>
          </div>

          <Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />} onClick={openCreate}>
            Add Taxonomy Tag
          </Button>
        </div>

        {notice && <Alert type="success">{notice}</Alert>}
        {error && <Alert type="error">{error}</Alert>}

        {isLoading ? (
          <LoadingState message="Loading taxonomy tags..." />
        ) : (
          <Table columns={columns} data={rows} keyExtractor={(item) => item.id} emptyText="No tags defined." />
        )}

        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editing ? `Edit Tag: #${editing.name}` : 'Add Taxonomy Tag'}
        >
          <div className="space-y-4">
            <Input label="Tag Name" value={formName} onChange={(e) => setFormName(e.target.value)} required />
            <Input label="Category" value={formCategory} onChange={(e) => setFormCategory(e.target.value)} helperText="e.g. Technical, Compliance, Finance" />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" size="sm" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleSave} disabled={isSaving}>
                {isSaving ? 'Saving...' : editing ? 'Save Changes' : 'Create Tag'}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </AppShell>
  );
}
