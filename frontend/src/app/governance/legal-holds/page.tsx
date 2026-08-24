'use client';

import React from 'react';
import { AppShell } from '@/src/components/layout/AppShell';
import { Breadcrumb } from '@/src/components/ui/Breadcrumb';
import { Button } from '@/src/components/ui/Button';
import { Badge } from '@/src/components/ui/Badge';
import { Table } from '@/src/components/ui/Table';
import { Alert } from '@/src/components/ui/Alert';
import { Modal } from '@/src/components/ui/Modal';
import { Input } from '@/src/components/ui/Input';
import { LoadingState } from '@/src/components/ui/States';
import { kmsApi } from '@/src/lib/api';
import { ShieldAlert, Plus, Unlock, FolderOpen, Trash2 } from 'lucide-react';

interface HoldRow {
  id: string;
  caseNumber: string;
  title: string;
  description?: string | null;
  isActive: boolean;
  releasedAt?: string | null;
  createdBy?: { username?: string; email?: string } | null;
  createdAt: string;
}

interface HoldItem {
  documentId: string;
  title: string;
  confidentialityLevel: string;
  status: string;
  isDeleted: boolean;
  placedAt: string;
}

export default function LegalHoldsPage() {
  const [holds, setHolds] = React.useState<HoldRow[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);

  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [formCase, setFormCase] = React.useState('');
  const [formTitle, setFormTitle] = React.useState('');
  const [formDescription, setFormDescription] = React.useState('');
  const [isSaving, setIsSaving] = React.useState(false);

  const [itemsHold, setItemsHold] = React.useState<HoldRow | null>(null);
  const [items, setItems] = React.useState<HoldItem[]>([]);
  const [isItemsLoading, setIsItemsLoading] = React.useState(false);
  const [newDocumentId, setNewDocumentId] = React.useState('');

  const load = React.useCallback(() => {
    setIsLoading(true);
    setError(null);
    kmsApi.governance
      .getLegalHolds()
      .then((data) => setHolds(data as HoldRow[]))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Failed to load legal holds'))
      .finally(() => setIsLoading(false));
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async () => {
    if (!formCase.trim() || !formTitle.trim()) {
      setError('Case number and title are required.');
      return;
    }
    setIsSaving(true);
    try {
      await kmsApi.governance.createLegalHold(formCase.trim(), formTitle.trim(), formDescription.trim());
      setNotice(`Legal hold ${formCase.trim()} issued.`);
      setIsCreateOpen(false);
      setFormCase('');
      setFormTitle('');
      setFormDescription('');
      setError(null);
      load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to issue legal hold');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRelease = async (hold: HoldRow) => {
    if (!window.confirm(`Release legal hold ${hold.caseNumber}? Documents will return to normal retention rules.`)) {
      return;
    }
    try {
      await kmsApi.governance.releaseLegalHold(hold.id);
      setNotice(`Legal hold ${hold.caseNumber} released.`);
      setError(null);
      load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Release failed');
    }
  };

  const openItems = async (hold: HoldRow) => {
    setItemsHold(hold);
    setItems([]);
    setNewDocumentId('');
    setIsItemsLoading(true);
    try {
      const data = await kmsApi.governance.getHoldItems(hold.id);
      setItems(data as HoldItem[]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load held documents');
    } finally {
      setIsItemsLoading(false);
    }
  };

  const handleAddItem = async () => {
    if (!itemsHold || !newDocumentId.trim()) return;
    try {
      await kmsApi.governance.addDocumentToHold(itemsHold.id, newDocumentId.trim());
      setNewDocumentId('');
      const data = await kmsApi.governance.getHoldItems(itemsHold.id);
      setItems(data as HoldItem[]);
      setNotice('Document frozen under legal hold.');
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to add document');
    }
  };

  const handleRemoveItem = async (documentId: string) => {
    if (!itemsHold) return;
    try {
      await kmsApi.governance.removeDocumentFromHold(itemsHold.id, documentId);
      const data = await kmsApi.governance.getHoldItems(itemsHold.id);
      setItems(data as HoldItem[]);
      setNotice('Document released from legal hold.');
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to remove document');
    }
  };

  const columns = [
    {
      header: 'Case Number',
      accessor: (hold: HoldRow) => (
        <span className="font-mono font-bold text-xs text-amber-900 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
          {hold.caseNumber}
        </span>
      ),
    },
    {
      header: 'Hold Case Title',
      accessor: (hold: HoldRow) => (
        <div className="text-xs">
          <span className="font-bold text-kms-slate-900">{hold.title}</span>
          {hold.description && <span className="block text-[11px] text-kms-slate-500">{hold.description}</span>}
        </div>
      ),
    },
    {
      header: 'Issuing Officer',
      accessor: (hold: HoldRow) => (
        <span className="text-xs text-kms-slate-600">{hold.createdBy?.username ?? '-'}</span>
      ),
    },
    {
      header: 'Created',
      accessor: (hold: HoldRow) => (
        <span className="text-xs text-kms-slate-500 font-mono">
          {hold.createdAt ? new Date(hold.createdAt).toLocaleDateString() : '-'}
        </span>
      ),
    },
    {
      header: 'Status',
      accessor: (hold: HoldRow) =>
        hold.isActive ? (
          <Badge label="ACTIVE HOLD" stateBadge="LEGAL_HOLD" />
        ) : (
          <Badge label={`RELEASED ${hold.releasedAt ? new Date(hold.releasedAt).toLocaleDateString() : ''}`} variant="slate" />
        ),
    },
    {
      header: 'Actions',
      accessor: (hold: HoldRow) => (
        <div className="flex items-center gap-1.5">
          <button onClick={() => openItems(hold)} title="Manage held documents" className="p-1.5 rounded hover:bg-blue-50 text-blue-700">
            <FolderOpen className="w-3.5 h-3.5" />
          </button>
          {hold.isActive && (
            <button onClick={() => handleRelease(hold)} title="Release hold" className="p-1.5 rounded hover:bg-emerald-50 text-emerald-700">
              <Unlock className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <AppShell requiredRole="ROLE_COMPLIANCE_OFFICER">
      <div className="space-y-5">
        <div className="flex items-center justify-between border-b border-kms-slate-200 pb-3">
          <div>
            <Breadcrumb items={[{ label: 'Governance & Compliance' }, { label: 'Legal Holds' }]} />
            <h1 className="text-xl font-bold text-kms-slate-900 tracking-tight flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-600" />
              Litigation Legal Holds Case Manager
            </h1>
          </div>

          <Button variant="danger" size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => setIsCreateOpen(true)}>
            Issue Legal Hold Case
          </Button>
        </div>

        <Alert type="legal-hold" title="OVERRIDING LEGAL COMPLIANCE ENFORCEMENT">
          Documents added to an active Legal Hold case are completely frozen against modification, soft deletion, and
          scheduled retention purges at the database trigger layer.
        </Alert>

        {notice && <Alert type="success">{notice}</Alert>}
        {error && <Alert type="error">{error}</Alert>}

        {isLoading ? (
          <LoadingState message="Loading legal hold cases..." />
        ) : (
          <Table columns={columns} data={holds} keyExtractor={(item) => item.id} emptyText="No legal holds recorded." />
        )}

        <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Issue Legal Hold Case">
          <div className="space-y-4">
            <Input label="Case Number" value={formCase} onChange={(e) => setFormCase(e.target.value)} required helperText="e.g. LH-2026-09" />
            <Input label="Case Title" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} required />
            <Input label="Description" value={formDescription} onChange={(e) => setFormDescription(e.target.value)} />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" size="sm" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button variant="danger" size="sm" onClick={handleCreate} disabled={isSaving}>
                {isSaving ? 'Issuing...' : 'Issue Hold'}
              </Button>
            </div>
          </div>
        </Modal>

        <Modal
          isOpen={itemsHold !== null}
          onClose={() => setItemsHold(null)}
          title={itemsHold ? `Documents under hold ${itemsHold.caseNumber}` : ''}
          maxWidth="2xl"
        >
          <div className="space-y-4">
            {itemsHold?.isActive && (
              <div className="flex items-end gap-2">
                <Input
                  label="Add Document by ID"
                  value={newDocumentId}
                  onChange={(e) => setNewDocumentId(e.target.value)}
                  helperText="Paste the document UUID to freeze it under this hold"
                />
                <Button variant="primary" size="sm" onClick={handleAddItem} disabled={!newDocumentId.trim()}>
                  Freeze
                </Button>
              </div>
            )}

            {isItemsLoading ? (
              <LoadingState message="Loading held documents..." />
            ) : items.length === 0 ? (
              <p className="text-xs text-kms-slate-500 text-center py-6">No documents are frozen under this hold yet.</p>
            ) : (
              <div className="space-y-1.5 max-h-80 overflow-y-auto">
                {items.map((item) => (
                  <div key={item.documentId} className="flex items-center justify-between text-xs bg-kms-slate-50 border border-kms-slate-200 rounded p-2">
                    <div className="min-w-0">
                      <span className="font-semibold text-kms-slate-900 block truncate">{item.title}</span>
                      <span className="font-mono text-[11px] text-kms-slate-500">
                        {item.documentId.slice(0, 8)} · {item.status} · frozen {new Date(item.placedAt).toLocaleDateString()}
                      </span>
                    </div>
                    {itemsHold?.isActive && (
                      <button
                        onClick={() => handleRemoveItem(item.documentId)}
                        title="Remove from hold"
                        className="p-1.5 rounded hover:bg-red-50 text-red-600 shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
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
