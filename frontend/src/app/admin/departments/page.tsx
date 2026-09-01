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
import { BarChart2, Plus, Building, Pencil, Trash2, Search, CheckCircle, XCircle, Power } from 'lucide-react';

interface DeptRow {
  id: string;
  name: string;
  code: string;
  storageQuotaBytes: number;
  usedBytes: number;
  documentCount: number;
  userCount: number;
  usagePercent: number;
  isActive?: boolean;
}

const GB = 1024 * 1024 * 1024;

function formatBytes(bytes: number): string {
  const gb = bytes / GB;
  if (gb >= 1) return `${gb.toFixed(1)} GB`;
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(0)} MB`;
}

export default function AdminDepartmentsPage() {
  const [rows, setRows] = React.useState<DeptRow[]>([]);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<DeptRow | null>(null);
  const [formName, setFormName] = React.useState('');
  const [formCode, setFormCode] = React.useState('');
  const [formQuotaGb, setFormQuotaGb] = React.useState('100');
  const [formIsActive, setFormIsActive] = React.useState('true');
  const [isSaving, setIsSaving] = React.useState(false);

  const load = React.useCallback((query?: string) => {
    setIsLoading(true);
    setError(null);
    const fetcher = query && query.trim()
      ? kmsApi.admin.searchDepartments(query.trim())
      : kmsApi.admin.getDepartments();

    fetcher
      .then((data) => setRows(data as DeptRow[]))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Failed to load departments'))
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
    setFormCode('');
    setFormQuotaGb('100');
    setFormIsActive('true');
    setNotice(null);
    setError(null);
    setIsModalOpen(true);
  };

  const openEdit = (dept: DeptRow) => {
    setEditing(dept);
    setFormName(dept.name);
    setFormCode(dept.code);
    setFormQuotaGb(String(Math.max(1, Math.round(dept.storageQuotaBytes / GB))));
    setFormIsActive(dept.isActive !== false ? 'true' : 'false');
    setNotice(null);
    setError(null);
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    const trimmedName = formName.trim();
    const trimmedCode = formCode.trim().toUpperCase();

    if (!trimmedName) {
      setError('Department name is required.');
      return;
    }
    if (trimmedName.length > 100) {
      setError('Department name must be 100 characters or fewer.');
      return;
    }
    if (!trimmedCode) {
      setError('Department code is required.');
      return;
    }
    if (trimmedCode.length > 20) {
      setError('Department code must be 20 characters or fewer.');
      return;
    }
    if (!/^[A-Z0-9_-]+$/.test(trimmedCode)) {
      setError('Department code may only contain uppercase letters, numbers, hyphens, and underscores.');
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const payload = {
        name: trimmedName,
        code: trimmedCode,
        storageQuotaBytes: Math.round(Number(formQuotaGb) * GB),
        isActive: formIsActive === 'true',
      };
      if (editing) {
        await kmsApi.admin.updateDepartment(editing.id, payload);
        setNotice(`Department "${payload.name}" updated successfully.`);
      } else {
        await kmsApi.admin.createDepartment(payload);
        setNotice(`Department "${payload.name}" created successfully.`);
      }
      setIsModalOpen(false);
      load(searchQuery);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Save failed';
      if (msg.includes('409') || msg.toLowerCase().includes('already exists')) {
        setError(`Conflict: A department with name "${trimmedName}" or code "${trimmedCode}" already exists.`);
      } else {
        setError(msg);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (dept: DeptRow) => {
    const isCurrentlyActive = dept.isActive !== false;
    const action = isCurrentlyActive ? 'deactivate' : 'activate';
    if (!window.confirm(`Are you sure you want to ${action} department "${dept.name}"?`)) {
      return;
    }
    try {
      if (isCurrentlyActive) {
        await kmsApi.admin.deactivateDepartment(dept.id);
        setNotice(`Department "${dept.name}" deactivated.`);
      } else {
        await kmsApi.admin.activateDepartment(dept.id);
        setNotice(`Department "${dept.name}" activated.`);
      }
      load(searchQuery);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : `Failed to ${action} department`);
    }
  };

  const handleDelete = async (dept: DeptRow) => {
    if (!window.confirm(`Delete department "${dept.name}"? This is only possible when it has no users, documents or folders.`)) {
      return;
    }
    try {
      await kmsApi.admin.deleteDepartment(dept.id);
      setNotice(`Department "${dept.name}" deleted.`);
      load(searchQuery);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  const columns = [
    {
      header: 'Dept Code',
      accessor: (dept: DeptRow) => (
        <span className="font-mono font-bold text-xs text-kms-slate-900 bg-kms-slate-100 px-2 py-0.5 rounded border border-kms-slate-300">
          {dept.code}
        </span>
      ),
    },
    {
      header: 'Department Name',
      accessor: (dept: DeptRow) => (
        <div className="font-semibold text-kms-slate-900 text-xs flex items-center gap-2">
          <Building className="w-4 h-4 text-blue-700" />
          {dept.name}
        </div>
      ),
    },
    {
      header: 'Status',
      accessor: (dept: DeptRow) => (
        dept.isActive !== false ? (
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
      header: 'Allocated Quota',
      accessor: (dept: DeptRow) => <span className="font-mono text-xs">{formatBytes(dept.storageQuotaBytes)}</span>,
    },
    {
      header: 'Current Consumption',
      accessor: (dept: DeptRow) => (
        <div className="space-y-1 w-48">
          <div className="flex justify-between text-[11px] font-mono">
            <span>{formatBytes(dept.usedBytes)}</span>
            <span className="font-bold">{dept.usagePercent}%</span>
          </div>
          <div className="w-full bg-kms-slate-200 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-1.5 rounded-full ${dept.usagePercent > 80 ? 'bg-red-600' : 'bg-blue-600'}`}
              style={{ width: `${Math.min(100, dept.usagePercent)}%` }}
            />
          </div>
        </div>
      ),
    },
    { header: 'Documents', accessor: (dept: DeptRow) => <span className="font-mono text-xs">{dept.documentCount}</span> },
    { header: 'Users', accessor: (dept: DeptRow) => <span className="font-mono text-xs">{dept.userCount}</span> },
    {
      header: 'Actions',
      accessor: (dept: DeptRow) => {
        const isActive = dept.isActive !== false;
        return (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handleToggleActive(dept)}
              title={isActive ? 'Deactivate Department' : 'Activate Department'}
              className={`p-1.5 rounded transition-colors ${
                isActive
                  ? 'hover:bg-amber-50 text-amber-600 hover:text-amber-700'
                  : 'hover:bg-emerald-50 text-emerald-600 hover:text-emerald-700'
              }`}
            >
              <Power className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => openEdit(dept)} title="Edit quota / details" className="p-1.5 rounded hover:bg-blue-50 text-blue-700">
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => handleDelete(dept)} title="Delete" className="p-1.5 rounded hover:bg-red-50 text-red-600">
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
            <Breadcrumb items={[{ label: 'Administration', href: '/admin' }, { label: 'Departments & Quotas' }]} />
            <h1 className="text-xl font-bold text-kms-slate-900 tracking-tight flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-blue-700" />
              Departments &amp; Storage Quota Allocation
            </h1>
          </div>

          <Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />} onClick={openCreate}>
            Create Department
          </Button>
        </div>

        {notice && <Alert type="success">{notice}</Alert>}
        {error && <Alert type="error">{error}</Alert>}

        {/* Search & Filter Toolbar */}
        <div className="flex items-center justify-between gap-3 bg-white p-3 border border-kms-slate-200 rounded-lg shadow-xs">
          <form onSubmit={handleSearch} className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-kms-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search departments by name or code..."
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
            Total: <span className="font-semibold text-kms-slate-900">{rows.length}</span> departments
          </div>
        </div>

        {isLoading ? (
          <LoadingState message="Loading departments..." />
        ) : (
          <Table columns={columns} data={rows} keyExtractor={(item) => item.id} emptyText="No departments found." />
        )}

        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editing ? `Edit Department: ${editing.name}` : 'Create Department'}
        >
          <div className="space-y-4">
            <Input
              label="Department Name"
              placeholder="e.g. Information Technology"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              required
              helperText="Maximum 100 characters. Must be unique."
            />
            <Input
              label="Department Code"
              placeholder="e.g. ITSEC"
              value={formCode}
              onChange={(e) => setFormCode(e.target.value.toUpperCase())}
              required
              helperText="Uppercase alphanumeric (e.g. ENG, HR, FIN). Maximum 20 characters. Must be unique."
            />
            <Select
              label="Storage Quota"
              value={String(formQuotaGb)}
              onChange={(e) => setFormQuotaGb(e.target.value)}
              options={[
                { value: '10', label: '10 GB' },
                { value: '50', label: '50 GB' },
                { value: '100', label: '100 GB (default)' },
                { value: '500', label: '500 GB' },
                { value: '1024', label: '1 TB' },
              ]}
            />
            {editing && (
              <Select
                label="Department Status"
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
                {isSaving ? 'Saving...' : editing ? 'Save Changes' : 'Create Department'}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </AppShell>
  );
}
