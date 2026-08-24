'use client';

import React from 'react';
import { AppShell } from '@/src/components/layout/AppShell';
import { Breadcrumb } from '@/src/components/ui/Breadcrumb';
import { Button } from '@/src/components/ui/Button';
import { Badge } from '@/src/components/ui/Badge';
import { Table } from '@/src/components/ui/Table';
import { Alert } from '@/src/components/ui/Alert';
import { Modal } from '@/src/components/ui/Modal';
import { Input, Select } from '@/src/components/ui/Input';
import { LoadingState } from '@/src/components/ui/States';
import { kmsApi } from '@/src/lib/api';
import { FileLock2, Plus, Archive, Trash2, Pencil, PlayCircle, Eye } from 'lucide-react';

interface PolicyRow {
  id: string;
  name: string;
  description?: string | null;
  documentType?: { id: string; name: string } | null;
  retentionDays?: number | null;
  dispositionAction: string;
  isActive: boolean;
  createdAt: string;
}

interface DocTypeOption {
  id: string;
  name: string;
}

function formatDuration(days?: number | null): string {
  if (!days) return 'Not set';
  if (days % 365 === 0) return `${days / 365} Year${days / 365 > 1 ? 's' : ''}`;
  return `${days} Days`;
}

export default function RetentionPoliciesPage() {
  const [policies, setPolicies] = React.useState<PolicyRow[]>([]);
  const [docTypes, setDocTypes] = React.useState<DocTypeOption[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<PolicyRow | null>(null);
  const [formName, setFormName] = React.useState('');
  const [formDescription, setFormDescription] = React.useState('');
  const [formDocTypeId, setFormDocTypeId] = React.useState('');
  const [formRetentionDays, setFormRetentionDays] = React.useState('2555');
  const [formDisposition, setFormDisposition] = React.useState('ARCHIVE');
  const [formIsActive, setFormIsActive] = React.useState('true');
  const [isSaving, setIsSaving] = React.useState(false);
  const [isRunning, setIsRunning] = React.useState(false);

  const load = React.useCallback(() => {
    setIsLoading(true);
    setError(null);
    Promise.all([kmsApi.governance.getRetentionPolicies(), kmsApi.admin.getDocumentTypes().catch(() => [])])
      .then(([policyData, typeData]) => {
        setPolicies(policyData as PolicyRow[]);
        setDocTypes((typeData as DocTypeOption[]) ?? []);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Failed to load retention policies'))
      .finally(() => setIsLoading(false));
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setFormName('');
    setFormDescription('');
    setFormDocTypeId(docTypes[0]?.id ?? '');
    setFormRetentionDays('2555');
    setFormDisposition('ARCHIVE');
    setFormIsActive('true');
    setNotice(null);
    setIsModalOpen(true);
  };

  const openEdit = (policy: PolicyRow) => {
    setEditing(policy);
    setFormName(policy.name);
    setFormDescription(policy.description || '');
    setFormDocTypeId(policy.documentType?.id ?? '');
    setFormRetentionDays(String(policy.retentionDays ?? 2555));
    setFormDisposition(policy.dispositionAction || 'ARCHIVE');
    setFormIsActive(String(policy.isActive));
    setNotice(null);
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      setError('Policy name is required.');
      return;
    }
    setIsSaving(true);
    try {
      const payload = {
        name: formName.trim(),
        description: formDescription.trim(),
        documentTypeId: formDocTypeId || undefined,
        retentionDays: Number(formRetentionDays),
        dispositionAction: formDisposition,
      };
      if (editing) {
        await kmsApi.governance.updateRetentionPolicy(editing.id, { ...payload, isActive: formIsActive === 'true' });
        setNotice(`Retention schedule "${payload.name}" updated.`);
      } else {
        await kmsApi.governance.createRetentionPolicy(payload as any);
        setNotice(`Retention schedule "${payload.name}" created.`);
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

  const handleDelete = async (policy: PolicyRow) => {
    if (!window.confirm(`Delete retention schedule "${policy.name}"?`)) return;
    try {
      await kmsApi.governance.deleteRetentionPolicy(policy.id);
      setNotice(`Retention schedule "${policy.name}" deleted.`);
      setError(null);
      load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  const handleRunNow = async () => {
    setIsRunning(true);
    setNotice(null);
    try {
      const result = await kmsApi.admin.runRetentionDispositions();
      setNotice(
        `Disposition run complete — archived: ${result.archived}, purged: ${result.purged}, review: ${result.reviewFlagged}, skipped under legal hold: ${result.skippedOnLegalHold}.`
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Disposition run failed');
    } finally {
      setIsRunning(false);
    }
  };

  const columns = [
    {
      header: 'Policy Name',
      accessor: (pol: PolicyRow) => (
        <div className="font-semibold text-kms-slate-900 flex items-center gap-2 text-xs">
          <FileLock2 className="w-4 h-4 text-blue-700 shrink-0" />
          <span>
            {pol.name}
            {pol.description && <span className="block text-[11px] font-normal text-kms-slate-500">{pol.description}</span>}
          </span>
        </div>
      ),
    },
    {
      header: 'Target Document Type',
      accessor: (pol: PolicyRow) => (
        <span className="text-xs text-kms-slate-700">{pol.documentType?.name ?? 'All types'}</span>
      ),
    },
    {
      header: 'Retention Duration',
      accessor: (pol: PolicyRow) => (
        <span className="font-mono text-xs font-bold text-kms-slate-800 bg-kms-slate-100 px-2 py-0.5 rounded border border-kms-slate-300">
          {formatDuration(pol.retentionDays)}
        </span>
      ),
    },
    {
      header: 'Automated Disposition',
      accessor: (pol: PolicyRow) => (
        <Badge
          label={pol.dispositionAction}
          variant={pol.dispositionAction === 'ARCHIVE' ? 'blue' : pol.dispositionAction === 'REVIEW' ? 'amber' : 'red'}
          icon={
            pol.dispositionAction === 'ARCHIVE' ? (
              <Archive className="w-3 h-3 text-blue-600" />
            ) : pol.dispositionAction === 'REVIEW' ? (
              <Eye className="w-3 h-3 text-amber-600" />
            ) : (
              <Trash2 className="w-3 h-3 text-red-600" />
            )
          }
        />
      ),
    },
    {
      header: 'Status',
      accessor: (pol: PolicyRow) => (
        <Badge label={pol.isActive ? 'ACTIVE' : 'SUSPENDED'} variant={pol.isActive ? 'green' : 'slate'} />
      ),
    },
    {
      header: 'Actions',
      accessor: (pol: PolicyRow) => (
        <div className="flex items-center gap-1.5">
          <button onClick={() => openEdit(pol)} title="Edit schedule" className="p-1.5 rounded hover:bg-blue-50 text-blue-700">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => handleDelete(pol)} title="Delete schedule" className="p-1.5 rounded hover:bg-red-50 text-red-600">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <AppShell requiredRole="ROLE_COMPLIANCE_OFFICER">
      <div className="space-y-5">
        <div className="flex items-center justify-between border-b border-kms-slate-200 pb-3">
          <div>
            <Breadcrumb items={[{ label: 'Governance & Compliance' }, { label: 'Retention Policies' }]} />
            <h1 className="text-xl font-bold text-kms-slate-900 tracking-tight flex items-center gap-2">
              <FileLock2 className="w-5 h-5 text-blue-700" />
              Retention Policies & Automated Disposition Rules
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" icon={<PlayCircle className="w-4 h-4" />} onClick={handleRunNow} disabled={isRunning}>
              {isRunning ? 'Running...' : 'Run Disposition Now'}
            </Button>
            <Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />} onClick={openCreate}>
              Create Retention Schedule
            </Button>
          </div>
        </div>

        <Alert type="info">
          Retention schedules automatically archive, flag for review or purge documents when their retention duration
          expires. The disposition engine runs daily and always skips documents frozen under an active Legal Hold.
        </Alert>

        {notice && <Alert type="success">{notice}</Alert>}
        {error && <Alert type="error">{error}</Alert>}

        {isLoading ? (
          <LoadingState message="Loading retention schedules..." />
        ) : (
          <Table columns={columns} data={policies} keyExtractor={(item) => item.id} emptyText="No retention policies defined." />
        )}

        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editing ? `Edit Schedule: ${editing.name}` : 'Create Retention Schedule'}
        >
          <div className="space-y-4">
            <Input label="Policy Name" value={formName} onChange={(e) => setFormName(e.target.value)} required />
            <Input label="Description" value={formDescription} onChange={(e) => setFormDescription(e.target.value)} />
            <Select
              label="Target Document Type"
              value={formDocTypeId}
              onChange={(e) => setFormDocTypeId(e.target.value)}
              options={[{ value: '', label: 'All document types' }, ...docTypes.map((t) => ({ value: t.id, label: t.name }))]}
            />
            <Input
              label="Retention Duration (days)"
              type="number"
              value={formRetentionDays}
              onChange={(e) => setFormRetentionDays(e.target.value)}
              helperText="e.g. 2555 = 7 years, 365 = 1 year, 180 = 6 months"
              required
            />
            <Select
              label="Disposition Action"
              value={formDisposition}
              onChange={(e) => setFormDisposition(e.target.value)}
              options={[
                { value: 'ARCHIVE', label: 'ARCHIVE — mark archived, keep content' },
                { value: 'REVIEW', label: 'REVIEW — flag as under review' },
                { value: 'PURGE', label: 'PURGE — move to recycle bin' },
              ]}
            />
            {editing && (
              <Select
                label="Status"
                value={formIsActive}
                onChange={(e) => setFormIsActive(e.target.value)}
                options={[
                  { value: 'true', label: 'ACTIVE — schedule enforced' },
                  { value: 'false', label: 'SUSPENDED — not enforced' },
                ]}
              />
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" size="sm" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleSave} disabled={isSaving}>
                {isSaving ? 'Saving...' : editing ? 'Save Changes' : 'Create Schedule'}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </AppShell>
  );
}
