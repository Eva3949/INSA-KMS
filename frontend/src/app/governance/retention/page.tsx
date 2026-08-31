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
import { FileLock2, Plus, Archive, Trash2, Pencil, PlayCircle, Eye, ShieldAlert, CheckCircle } from 'lucide-react';

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

interface CandidateRow {
  documentId: string;
  title: string;
  policyId: string;
  policyName: string;
  dispositionAction: string;
  documentStatus: string;
  isLegalHoldActive: boolean;
  referenceDate: string;
  retentionDays: number;
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
  const [candidates, setCandidates] = React.useState<CandidateRow[]>([]);
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
    Promise.all([
      kmsApi.governance.getRetentionPolicies(),
      kmsApi.admin.getDocumentTypes().catch(() => []),
      kmsApi.governance.getRetentionCandidates().catch(() => []),
    ])
      .then(([policyData, typeData, candidateData]) => {
        setPolicies(policyData as PolicyRow[]);
        setDocTypes((typeData as DocTypeOption[]) ?? []);
        setCandidates((candidateData as CandidateRow[]) ?? []);
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
    const days = parseInt(formRetentionDays, 10);
    if (isNaN(days) || days < 1) {
      setError('Retention duration must be a positive integer.');
      return;
    }
    setIsSaving(true);
    try {
      if (editing) {
        await kmsApi.governance.updateRetentionPolicy(editing.id, {
          name: formName.trim(),
          description: formDescription.trim(),
          documentTypeId: formDocTypeId || null,
          retentionDays: days,
          dispositionAction: formDisposition,
          isActive: formIsActive === 'true',
        });
        setNotice(`Policy '${formName}' updated.`);
      } else {
        await kmsApi.governance.createRetentionPolicy({
          name: formName.trim(),
          description: formDescription.trim(),
          documentTypeId: formDocTypeId || undefined,
          retentionDays: days,
          dispositionAction: formDisposition,
        });
        setNotice(`Policy '${formName}' created.`);
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
    if (!window.confirm(`Delete retention policy '${policy.name}'?`)) return;
    try {
      await kmsApi.governance.deleteRetentionPolicy(policy.id);
      setNotice(`Policy '${policy.name}' deleted.`);
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
      const summary = await kmsApi.admin.runRetentionDispositions();
      setNotice(
        `Disposition run finished: ${summary.archived} archived, ${summary.purged} purged, ${summary.reviewFlagged} flagged for review. ${summary.skippedOnLegalHold} skipped due to active Legal Hold.`
      );
      setError(null);
      load();
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
        <div>
          <span className="font-semibold text-kms-slate-900 block">{pol.name}</span>
          {pol.description && <span className="text-xs text-kms-slate-500">{pol.description}</span>}
        </div>
      ),
    },
    {
      header: 'Scope (Doc Type)',
      accessor: (pol: PolicyRow) => (
        <span className="text-xs text-kms-slate-700">{pol.documentType?.name || 'All Document Types'}</span>
      ),
    },
    {
      header: 'Retention Period',
      accessor: (pol: PolicyRow) => (
        <span className="font-mono text-xs font-semibold text-blue-700">{formatDuration(pol.retentionDays)}</span>
      ),
    },
    {
      header: 'Disposition Action',
      accessor: (pol: PolicyRow) => {
        const action = (pol.dispositionAction || 'ARCHIVE').toUpperCase();
        const variant = action === 'PURGE' ? 'red' : action === 'REVIEW' ? 'amber' : 'blue';
        return <Badge label={action} variant={variant as any} />;
      },
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

  const candidateColumns = [
    {
      header: 'Document Title',
      accessor: (cand: CandidateRow) => (
        <div>
          <span className="font-semibold text-kms-slate-900 block">{cand.title}</span>
          <span className="text-[11px] text-kms-slate-400 font-mono">ID: {cand.documentId}</span>
        </div>
      ),
    },
    {
      header: 'Matching Policy',
      accessor: (cand: CandidateRow) => (
        <span className="text-xs text-kms-slate-700 font-medium">{cand.policyName}</span>
      ),
    },
    {
      header: 'Planned Action',
      accessor: (cand: CandidateRow) => {
        const action = (cand.dispositionAction || 'ARCHIVE').toUpperCase();
        const variant = action === 'PURGE' ? 'red' : action === 'REVIEW' ? 'amber' : 'blue';
        return <Badge label={action} variant={variant as any} />;
      },
    },
    {
      header: 'Legal Hold Status',
      accessor: (cand: CandidateRow) => (
        cand.isLegalHoldActive ? (
          <Badge variant="red" label="FROZEN BY LEGAL HOLD" />
        ) : (
          <Badge variant="green" label="READY FOR DISPOSITION" />
        )
      ),
    },
  ];

  return (
    <AppShell requiredRole="ROLE_COMPLIANCE_OFFICER">
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-kms-slate-200 pb-3">
          <div>
            <Breadcrumb items={[{ label: 'Governance & Compliance' }, { label: 'Retention Policies' }]} />
            <h1 className="text-xl font-bold text-kms-slate-900 tracking-tight flex items-center gap-2">
              <FileLock2 className="w-5 h-5 text-blue-700" />
              Retention Policies &amp; Automated Disposition Rules
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

        {/* Pending Disposition Queue */}
        <div className="bg-white rounded-lg border border-kms-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-kms-slate-900 flex items-center gap-2">
                <Archive className="w-5 h-5 text-blue-700" />
                Pending Disposition Review Queue (FR-28 Candidate Docs)
              </h2>
              <p className="text-xs text-kms-slate-500">
                Documents exceeding retention schedule thresholds eligible for disposition in the next daily cycle.
              </p>
            </div>
            <Badge variant="blue" label={`${candidates.length} Candidate(s)`} />
          </div>

          <Table columns={candidateColumns} data={candidates} keyExtractor={(cand) => `${cand.documentId}-${cand.policyId}`} emptyText="No candidate documents currently due for disposition." />
        </div>

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
