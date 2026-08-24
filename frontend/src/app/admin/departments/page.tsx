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
import { kmsApi } from '@/src/lib/api';
import { BarChart2, Plus, Building, Pencil, Trash2 } from 'lucide-react';

interface DeptRow {
  id: string;
  name: string;
  code: string;
  storageQuotaBytes: number;
  usedBytes: number;
  documentCount: number;
  userCount: number;
  usagePercent: number;
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
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<DeptRow | null>(null);
  const [formName, setFormName] = React.useState('');
  const [formCode, setFormCode] = React.useState('');
  const [formQuotaGb, setFormQuotaGb] = React.useState('100');
  const [isSaving, setIsSaving] = React.useState(false);

  const load = React.useCallback(() => {
    setIsLoading(true);
    setError(null);
    kmsApi.admin
      .getDepartments()
      .then((data) => setRows(data as DeptRow[]))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Failed to load departments'))
      .finally(() => setIsLoading(false));
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setFormName('');
    setFormCode('');
    setFormQuotaGb('100');
    setNotice(null);
    setIsModalOpen(true);
  };

  const openEdit = (dept: DeptRow) => {
    setEditing(dept);
    setFormName(dept.name);
    setFormCode(dept.code);
    setFormQuotaGb(String(Math.max(1, Math.round(dept.storageQuotaBytes / GB))));
    setNotice(null);
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formName.trim() || !formCode.trim()) {
      setError('Department name and code are required.');
      return;
    }
    setIsSaving(true);
    try {
      const payload = {
        name: formName.trim(),
        code: formCode.trim().toUpperCase(),
        storageQuotaBytes: Math.round(Number(formQuotaGb) * GB),
      };
      if (editing) {
        await kmsApi.admin.updateDepartment(editing.id, payload);
        setNotice(`Department "${payload.name}" updated.`);
      } else {
        await kmsApi.admin.createDepartment(payload);
        setNotice(`Department "${payload.name}" created.`);
      }
      setIsModalOpen(false);
      load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (dept: DeptRow) => {
    if (!window.confirm(`Delete department "${dept.name}"? This is only possible when it has no users, documents or folders.`)) {
      return;
    }
    try {
      await kmsApi.admin.deleteDepartment(dept.id);
      setNotice(`Department "${dept.name}" deleted.`);
      load();
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
      accessor: (dept: DeptRow) => (
        <div className="flex items-center gap-1.5">
          <button onClick={() => openEdit(dept)} title="Edit quota / details" className="p-1.5 rounded hover:bg-blue-50 text-blue-700">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => handleDelete(dept)} title="Delete" className="p-1.5 rounded hover:bg-red-50 text-red-600">
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
            <Breadcrumb items={[{ label: 'Administration', href: '/admin' }, { label: 'Departments & Quotas' }]} />
            <h1 className="text-xl font-bold text-kms-slate-900 tracking-tight flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-blue-700" />
              Departments & Storage Quota Allocation
            </h1>
          </div>

          <Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />} onClick={openCreate}>
            Create Department
          </Button>
        </div>

        {notice && <Alert type="success">{notice}</Alert>}
        {error && <Alert type="error">{error}</Alert>}

        {isLoading ? (
          <LoadingState message="Loading departments..." />
        ) : (
          <Table columns={columns} data={rows} keyExtractor={(item) => item.id} emptyText="No departments defined." />
        )}

        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editing ? `Edit Department: ${editing.name}` : 'Create Department'}
        >
          <div className="space-y-4">
            <Input label="Department Name" value={formName} onChange={(e) => setFormName(e.target.value)} required />
            <Input label="Department Code" value={formCode} onChange={(e) => setFormCode(e.target.value)} required />
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
