'use client';

import React from 'react';
import { AppShell } from '@/src/components/layout/AppShell';
import { Breadcrumb } from '@/src/components/ui/Breadcrumb';
import { Button } from '@/src/components/ui/Button';
import { Input, Select } from '@/src/components/ui/Input';
import { Modal } from '@/src/components/ui/Modal';
import { Card } from '@/src/components/ui/Card';
import { Badge } from '@/src/components/ui/Badge';
import { LoadingState } from '@/src/components/ui/States';
import { Alert } from '@/src/components/ui/Alert';
import { kmsApi } from '@/src/lib/api';
import { GitPullRequestArrow, Plus, Pencil, Trash2, X, RefreshCw } from 'lucide-react';

interface TemplateRow {
  id: string;
  name: string;
  description?: string | null;
  documentTypeId?: string | null;
  documentTypeName?: string | null;
  isActive: boolean;
  steps: Array<{ stepNumber: number; approverId: string; approverUsername?: string | null }>;
}

interface DocTypeOption {
  id: string;
  name: string;
}

export default function ApprovalTemplatesPage() {
  const [rows, setRows] = React.useState<TemplateRow[]>([]);
  const [docTypes, setDocTypes] = React.useState<DocTypeOption[]>([]);
  const [users, setUsers] = React.useState<Array<{ id: string; label: string }>>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [formName, setFormName] = React.useState('');
  const [formDescription, setFormDescription] = React.useState('');
  const [formDocType, setFormDocType] = React.useState('');
  const [formActive, setFormActive] = React.useState('true');
  const [approverIds, setApproverIds] = React.useState<string[]>([]);
  const [pickerUserId, setPickerUserId] = React.useState('');
  const [isSaving, setIsSaving] = React.useState(false);

  const load = React.useCallback(() => {
    setIsLoading(true);
    setError(null);
    Promise.all([
      kmsApi.admin.listApprovalTemplates(),
      kmsApi.admin.getDocumentTypes().catch(() => []),
      kmsApi.admin.getUsers().catch(() => []),
    ])
      .then(([templates, types, users]) => {
        setRows(templates as TemplateRow[]);
        setDocTypes(types as DocTypeOption[]);
        setUsers((users as any[]).map((u) => ({ id: u.id, label: `${u.username} (${u.email})` })));
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Failed to load approval templates'))
      .finally(() => setIsLoading(false));
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditingId(null);
    setFormName('');
    setFormDescription('');
    setFormDocType('');
    setFormActive('true');
    setApproverIds([]);
    setIsModalOpen(true);
  };

  const openEdit = (t: TemplateRow) => {
    setEditingId(t.id);
    setFormName(t.name);
    setFormDescription(t.description || '');
    setFormDocType(t.documentTypeId || '');
    setFormActive(String(t.isActive));
    setApproverIds(t.steps.map((s) => s.approverId));
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) { setError('Template name is required.'); return; }
    if (approverIds.length === 0) { setError('At least one approver is required.'); return; }
    setIsSaving(true);
    try {
      const payload = {
        name: formName.trim(),
        description: formDescription.trim(),
        documentTypeId: formDocType || undefined,
        isActive: formActive === 'true',
        approverIds,
      };
      if (editingId) {
        await kmsApi.admin.updateApprovalTemplate(editingId, payload);
        setNotice(`Template "${payload.name}" updated.`);
      } else {
        await kmsApi.admin.createApprovalTemplate(payload as any);
        setNotice(`Template "${payload.name}" created.`);
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

  const handleDelete = async (t: TemplateRow) => {
    if (!window.confirm(`Delete template "${t.name}"?`)) return;
    try {
      await kmsApi.admin.deleteApprovalTemplate(t.id);
      setNotice(`Template "${t.name}" deleted.`);
      setError(null);
      load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  return (
    <AppShell requiredRole="ROLE_ADMIN">
      <div className="space-y-5">
        <div className="flex items-center justify-between border-b border-kms-slate-200 pb-3">
          <div>
            <Breadcrumb items={[{ label: 'Administration', href: '/admin' }, { label: 'Approval Workflows' }]} />
            <h1 className="text-xl font-bold text-kms-slate-900 tracking-tight flex items-center gap-2">
              <GitPullRequestArrow className="w-5 h-5 text-blue-700" />
              Approval Workflow Templates
            </h1>
            <p className="text-[11px] text-kms-slate-500 mt-1">
              FR-25 — define ordered approver routing for documents. Documents sent for approval move to UNDER_REVIEW and
              return to PUBLISHED when all steps approve.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />} onClick={openCreate}>
              Create Template
            </Button>
            <Button variant="outline" size="sm" icon={<RefreshCw className="w-4 h-4" />} onClick={load}>
              Refresh
            </Button>
          </div>
        </div>

        {notice && <Alert type="success">{notice}</Alert>}
        {error && <Alert type="error">{error}</Alert>}

        {isLoading ? (
          <LoadingState message="Loading templates..." />
        ) : rows.length === 0 ? (
          <Card title="No templates yet">
            <p className="text-xs text-kms-slate-500 py-3 text-center">
              Create a template with one or more ordered approvers to enable approval routing (FR-25).
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rows.map((t) => (
              <Card
                key={t.id}
                title={t.name}
                action={
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => openEdit(t)} title="Edit" className="p-1.5 rounded hover:bg-blue-50 text-blue-700">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDelete(t)} title="Delete" className="p-1.5 rounded hover:bg-red-50 text-red-600">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                }
              >
                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2">
                    <Badge label={t.isActive ? 'ACTIVE' : 'SUSPENDED'} variant={t.isActive ? 'green' : 'slate'} />
                    <Badge label={t.documentTypeName || 'ALL TYPES'} variant="blue" />
                  </div>
                  {t.description && <p className="text-slate-600">{t.description}</p>}
                  <div className="space-y-1 pt-1">
                    {t.steps.map((s) => (
                      <div key={s.stepNumber} className="flex items-center gap-2 text-[11px]">
                        <span className="font-mono font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded px-1.5">
                          Step {s.stepNumber}
                        </span>
                        <span className="text-slate-800 font-medium">{s.approverUsername}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? 'Edit Approval Template' : 'Create Approval Template'}>
          <div className="space-y-4">
            <Input label="Template Name" value={formName} onChange={(e) => setFormName(e.target.value)} required />
            <Input label="Description" value={formDescription} onChange={(e) => setFormDescription(e.target.value)} />
            <Select
              label="Applies to Document Type"
              value={formDocType}
              onChange={(e) => setFormDocType(e.target.value)}
              options={[
                { value: '', label: 'All document types' },
                ...docTypes.map((d) => ({ value: d.id, label: d.name })),
              ]}
            />

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">Approval Chain (in order)</label>
              {approverIds.length === 0 ? (
                <p className="text-[11px] text-slate-500">No approvers selected yet.</p>
              ) : (
                <div className="space-y-1">
                  {approverIds.map((id, idx) => {
                    const user = users.find((u) => u.id === id);
                    return (
                      <div key={id} className="flex items-center justify-between text-xs bg-slate-50 border border-slate-200 rounded p-2">
                        <span className="flex items-center gap-2">
                          <span className="font-mono font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded px-1.5">
                            Step {idx + 1}
                          </span>
                          {user?.label ?? id}
                        </span>
                        <button
                          onClick={() => setApproverIds(approverIds.filter((a) => a !== id))}
                          className="p-1 rounded hover:bg-red-50 text-red-600"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="flex items-end gap-2">
                <Select
                  value={pickerUserId}
                  onChange={(e) => setPickerUserId(e.target.value)}
                  options={[
                    { value: '', label: 'Select an approver...' },
                    ...users.filter((u) => !approverIds.includes(u.id)).map((u) => ({ value: u.id, label: u.label })),
                  ]}
                />
                <Button variant="secondary" size="sm" onClick={() => { if (pickerUserId) { setApproverIds([...approverIds, pickerUserId]); setPickerUserId(''); } }} disabled={!pickerUserId}>
                  Add Step
                </Button>
              </div>
            </div>

            <Select
              label="Status"
              value={formActive}
              onChange={(e) => setFormActive(e.target.value)}
              options={[
                { value: 'true', label: 'ACTIVE — available to launch' },
                { value: 'false', label: 'SUSPENDED' },
              ]}
            />

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <Button variant="secondary" size="sm" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleSave} disabled={isSaving}>
                {isSaving ? 'Saving...' : editingId ? 'Save Changes' : 'Create Template'}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </AppShell>
  );
}
