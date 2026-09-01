'use client';

import React from 'react';
import { AppShell } from '@/src/components/layout/AppShell';
import { Breadcrumb } from '@/src/components/ui/Breadcrumb';
import { Button } from '@/src/components/ui/Button';
import { Input, Select } from '@/src/components/ui/Input';
import { Modal } from '@/src/components/ui/Modal';
import { Table } from '@/src/components/ui/Table';
import { LoadingState, ErrorState } from '@/src/components/ui/States';
import { Alert } from '@/src/components/ui/Alert';
import { Badge } from '@/src/components/ui/Badge';
import { kmsApi } from '@/src/lib/api';
import { FileCheck2, Plus, Pencil, Trash2, ListPlus, Search, CheckCircle, XCircle, Power } from 'lucide-react';

interface DocTypeRow {
  id: string;
  name: string;
  description?: string | null;
  documentCount: number;
  createdAt: string;
  isActive?: boolean;
}

export default function AdminDocumentTypesPage() {
  const [rows, setRows] = React.useState<DocTypeRow[]>([]);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<DocTypeRow | null>(null);
  const [formName, setFormName] = React.useState('');
  const [formDescription, setFormDescription] = React.useState('');
  const [formIsActive, setFormIsActive] = React.useState('true');
  const [isSaving, setIsSaving] = React.useState(false);

  // Field schema editor (FR-06)
  const [fieldsType, setFieldsType] = React.useState<DocTypeRow | null>(null);
  const [typeFields, setTypeFields] = React.useState<Array<{ id: string; fieldKey: string; label: string; dataType: string; required: boolean }>>([]);
  const [fKey, setFKey] = React.useState('');
  const [fLabel, setFLabel] = React.useState('');
  const [fType, setFType] = React.useState('TEXT');
  const [fRequired, setFRequired] = React.useState('false');

  const load = React.useCallback((query?: string) => {
    setIsLoading(true);
    setError(null);
    const fetcher = query && query.trim()
      ? kmsApi.admin.searchDocumentTypes(query.trim())
      : kmsApi.admin.getDocumentTypes();

    fetcher
      .then((data) => setRows(data as DocTypeRow[]))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Failed to load document types'))
      .finally(() => setIsLoading(false));
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    load(searchQuery);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    load('');
  };

  const openCreate = () => {
    setEditing(null);
    setFormName('');
    setFormDescription('');
    setFormIsActive('true');
    setNotice(null);
    setError(null);
    setIsModalOpen(true);
  };

  const openEdit = (dt: DocTypeRow) => {
    setEditing(dt);
    setFormName(dt.name);
    setFormDescription(dt.description || '');
    setFormIsActive(dt.isActive !== false ? 'true' : 'false');
    setNotice(null);
    setError(null);
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    const trimmedName = formName.trim();
    if (!trimmedName) {
      setError('Document category / type name is required.');
      return;
    }
    if (trimmedName.length > 100) {
      setError('Name must not exceed 100 characters.');
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const payload = {
        name: trimmedName,
        description: formDescription.trim(),
        isActive: formIsActive === 'true',
      };
      if (editing) {
        await kmsApi.admin.updateDocumentType(editing.id, payload);
        setNotice(`Document category / type "${payload.name}" updated successfully.`);
      } else {
        await kmsApi.admin.createDocumentType(payload);
        setNotice(`Document category / type "${payload.name}" created successfully.`);
      }
      setIsModalOpen(false);
      load(searchQuery);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Save failed';
      if (msg.includes('409') || msg.toLowerCase().includes('already exists')) {
        setError(`Conflict: A document category / type with name "${trimmedName}" already exists.`);
      } else {
        setError(msg);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (dt: DocTypeRow) => {
    const isCurrentlyActive = dt.isActive !== false;
    const action = isCurrentlyActive ? 'deactivate' : 'activate';
    if (!window.confirm(`Are you sure you want to ${action} document category / type "${dt.name}"?`)) {
      return;
    }
    try {
      if (isCurrentlyActive) {
        await kmsApi.admin.deactivateDocumentType(dt.id);
        setNotice(`Document category / type "${dt.name}" deactivated.`);
      } else {
        await kmsApi.admin.activateDocumentType(dt.id);
        setNotice(`Document category / type "${dt.name}" activated.`);
      }
      load(searchQuery);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : `Failed to ${action} document type`);
    }
  };

  const handleDelete = async (dt: DocTypeRow) => {
    if (!window.confirm(`Delete document category / type "${dt.name}"? Only types not used by documents can be removed.`)) {
      return;
    }
    try {
      await kmsApi.admin.deleteDocumentType(dt.id);
      setNotice(`Document category / type "${dt.name}" deleted.`);
      load(searchQuery);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  const openFields = async (dt: DocTypeRow) => {
    setFieldsType(dt);
    try {
      setTypeFields((await kmsApi.admin.listTypeFields(dt.id)) as any);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load fields');
    }
  };

  const handleAddField = async () => {
    if (!fieldsType || !fKey.trim()) return;
    try {
      await kmsApi.admin.createTypeField(fieldsType.id, {
        fieldKey: fKey.trim(),
        label: fLabel.trim() || fKey.trim(),
        dataType: fType,
        required: fRequired === 'true',
      });
      setTypeFields((await kmsApi.admin.listTypeFields(fieldsType.id)) as any);
      setFKey('');
      setFLabel('');
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to add field');
    }
  };

  const handleDeleteField = async (fieldId: string) => {
    if (!fieldsType) return;
    try {
      await kmsApi.admin.deleteTypeField(fieldsType.id, fieldId);
      setTypeFields((await kmsApi.admin.listTypeFields(fieldsType.id)) as any);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete field');
    }
  };

  const columns = [
    {
      header: 'Category / Type Name',
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
      header: 'Status',
      accessor: (dt: DocTypeRow) => (
        dt.isActive !== false ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
            <CheckCircle className="w-3 h-3 text-emerald-600" /> Active
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
            <XCircle className="w-3 h-3 text-slate-400" /> Deactivated
          </span>
        )
      ),
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
      accessor: (dt: DocTypeRow) => {
        const isActive = dt.isActive !== false;
        return (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handleToggleActive(dt)}
              title={isActive ? 'Deactivate Category' : 'Activate Category'}
              className={`p-1.5 rounded transition-colors ${
                isActive
                  ? 'hover:bg-amber-50 text-amber-600 hover:text-amber-700'
                  : 'hover:bg-emerald-50 text-emerald-600 hover:text-emerald-700'
              }`}
            >
              <Power className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => openFields(dt)} title="Metadata fields (FR-06)" className="p-1.5 rounded hover:bg-emerald-50 text-emerald-700">
              <ListPlus className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => openEdit(dt)} title="Edit" className="p-1.5 rounded hover:bg-blue-50 text-blue-700">
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => handleDelete(dt)} title="Delete" className="p-1.5 rounded hover:bg-red-50 text-red-600">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <AppShell requiredRole="ROLE_ADMIN">
      <div className="space-y-5">
        <div className="flex items-center justify-between border-b border-kms-slate-200 pb-3">
          <div>
            <Breadcrumb items={[{ label: 'Administration', href: '/admin' }, { label: 'Document Categories & Types' }]} />
            <h1 className="text-xl font-bold text-kms-slate-900 tracking-tight flex items-center gap-2">
              <FileCheck2 className="w-5 h-5 text-blue-700" />
              Document Categories, Types &amp; Custom Metadata Schemas
            </h1>
          </div>

          <Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />} onClick={openCreate}>
            Create Category / Type
          </Button>
        </div>

        {notice && <Alert type="success">{notice}</Alert>}
        {error && <Alert type="error">{error}</Alert>}

        {/* Search Toolbar */}
        <div className="flex items-center justify-between gap-3 bg-white p-3 border border-kms-slate-200 rounded-lg shadow-xs">
          <form onSubmit={handleSearch} className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-kms-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search categories & types by name or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-kms-slate-300 rounded text-kms-slate-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
              />
            </div>
            <Button type="submit" variant="secondary" size="sm">
              Search
            </Button>
            {searchQuery && (
              <Button type="button" variant="ghost" size="sm" onClick={handleClearSearch}>
                Clear
              </Button>
            )}
          </form>

          <div className="text-xs text-kms-slate-500 font-medium">
            Total: <span className="font-semibold text-kms-slate-900">{rows.length}</span> categories
          </div>
        </div>

        {isLoading ? (
          <LoadingState message="Loading document categories & types..." />
        ) : (
          <Table columns={columns} data={rows} keyExtractor={(item) => item.id} emptyText="No document categories found." />
        )}

        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editing ? `Edit Category / Type: ${editing.name}` : 'Create Document Category / Type'}
        >
          <div className="space-y-4">
            <Input
              label="Category / Type Name"
              placeholder="e.g. Policy, Standard Operating Procedure, Report"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              required
              helperText="Maximum 100 characters. Must be unique."
            />
            <Input
              label="Description"
              placeholder="e.g. Governance and operational guidance documents"
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
            />
            {editing && (
              <Select
                label="Category Status"
                value={formIsActive}
                onChange={(e) => setFormIsActive(e.target.value)}
                options={[
                  { value: 'true', label: 'Active' },
                  { value: 'false', label: 'Deactivated' },
                ]}
              />
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" size="sm" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleSave} disabled={isSaving}>
                {isSaving ? 'Saving...' : editing ? 'Save Changes' : 'Create Category'}
              </Button>
            </div>
          </div>
        </Modal>

        <Modal
          isOpen={fieldsType !== null}
          onClose={() => setFieldsType(null)}
          title={fieldsType ? `Metadata Fields — ${fieldsType.name}` : ''}
          maxWidth="2xl"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-2 items-end">
              <Input label="Field Key" value={fKey} onChange={(e) => setFKey(e.target.value)} helperText="e.g. effective_date" />
              <Input label="Label" value={fLabel} onChange={(e) => setFLabel(e.target.value)} />
              <Select
                label="Data Type"
                value={fType}
                onChange={(e) => setFType(e.target.value)}
                options={[
                  { value: 'TEXT', label: 'TEXT' },
                  { value: 'NUMBER', label: 'NUMBER' },
                  { value: 'DATE', label: 'DATE' },
                  { value: 'BOOLEAN', label: 'BOOLEAN' },
                ]}
              />
              <Select
                label="Required"
                value={fRequired}
                onChange={(e) => setFRequired(e.target.value)}
                options={[
                  { value: 'false', label: 'Optional' },
                  { value: 'true', label: 'Required' },
                ]}
              />
              <Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />} onClick={handleAddField} disabled={!fKey.trim()}>
                Add Field
              </Button>
            </div>
            {typeFields.length === 0 ? (
              <p className="text-xs text-kms-slate-500 text-center py-4">No custom fields defined for this document type yet.</p>
            ) : (
              <div className="space-y-1.5">
                {typeFields.map((f) => (
                  <div key={f.id} className="flex items-center justify-between text-xs bg-kms-slate-50 border border-kms-slate-200 rounded p-2">
                    <span>
                      <span className="font-mono font-bold text-kms-slate-900">{f.fieldKey}</span>
                      <span className="text-kms-slate-500 ml-2">{f.label}</span>
                    </span>
                    <span className="flex items-center gap-2">
                      <Badge label={f.dataType} variant="blue" />
                      {f.required && <Badge label="REQUIRED" variant="amber" />}
                      <button onClick={() => handleDeleteField(f.id)} className="p-1 rounded hover:bg-red-50 text-red-600">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Modal>
      </div>
    </AppShell>
  );
}
