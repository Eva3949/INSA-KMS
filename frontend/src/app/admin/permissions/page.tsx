'use client';

import React from 'react';
import { AppShell } from '@/src/components/layout/AppShell';
import { Breadcrumb } from '@/src/components/ui/Breadcrumb';
import { Button } from '@/src/components/ui/Button';
import { Card } from '@/src/components/ui/Card';
import { Input, Select } from '@/src/components/ui/Input';
import { Table } from '@/src/components/ui/Table';
import { Badge } from '@/src/components/ui/Badge';
import { Alert } from '@/src/components/ui/Alert';
import { LoadingState } from '@/src/components/ui/States';
import { kmsApi } from '@/src/lib/api';
import { KeyRound, Plus, Trash2, FolderTree, FileText, RefreshCw } from 'lucide-react';

interface FolderRow {
  id: string;
  name: string;
  departmentName?: string | null;
  confidentialityLevel: string;
  ownerUsername?: string | null;
}

interface PermissionRow {
  id: string;
  subjectType: string;
  subjectId: string;
  subjectLabel: string;
  permissionLevel: string;
}

interface Subjects {
  users: Array<{ id: string; label: string; active: boolean }>;
  groups: Array<{ id: string; label: string }>;
  roles: string[];
  permissionLevels: string[];
}

const LEVEL_VARIANT: Record<string, 'slate' | 'blue' | 'amber' | 'red'> = {
  VIEW: 'slate',
  EDIT: 'blue',
  DELETE: 'amber',
  ADMIN: 'red',
};

export default function AdminPermissionsPage() {
  const [scope, setScope] = React.useState<'FOLDER' | 'DOCUMENT'>('FOLDER');

  const [folders, setFolders] = React.useState<FolderRow[]>([]);
  const [selectedFolderId, setSelectedFolderId] = React.useState('');
  const [documentId, setDocumentId] = React.useState('');
  const [activeDocumentId, setActiveDocumentId] = React.useState('');

  const [subjects, setSubjects] = React.useState<Subjects | null>(null);
  const [permissions, setPermissions] = React.useState<PermissionRow[]>([]);

  const [subjectType, setSubjectType] = React.useState('USER');
  const [subjectId, setSubjectId] = React.useState('');
  const [permissionLevel, setPermissionLevel] = React.useState('VIEW');

  const [isLoading, setIsLoading] = React.useState(true);
  const [isBusy, setIsBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);

  // Initial load: folder list + assignable subjects
  React.useEffect(() => {
    setIsLoading(true);
    Promise.all([kmsApi.folders.list(), kmsApi.permissions.getSubjects()])
      .then(([folderData, subjectData]) => {
        const rows = folderData as FolderRow[];
        setFolders(rows);
        setSubjects(subjectData as Subjects);
        if (rows.length > 0) setSelectedFolderId(rows[0].id);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Failed to load access control data'))
      .finally(() => setIsLoading(false));
  }, []);

  const loadPermissions = React.useCallback(() => {
    if (scope === 'FOLDER' && !selectedFolderId) {
      setPermissions([]);
      return;
    }
    if (scope === 'DOCUMENT' && !activeDocumentId) {
      setPermissions([]);
      return;
    }
    setIsBusy(true);
    const request =
      scope === 'FOLDER'
        ? kmsApi.permissions.listFolder(selectedFolderId)
        : kmsApi.permissions.listDocument(activeDocumentId);
    request
      .then((data) => {
        setPermissions(data as PermissionRow[]);
        setError(null);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Failed to load permissions'))
      .finally(() => setIsBusy(false));
  }, [scope, selectedFolderId, activeDocumentId]);

  React.useEffect(() => {
    loadPermissions();
  }, [loadPermissions]);

  // Reset the subject picker whenever the subject type changes
  React.useEffect(() => {
    if (!subjects) return;
    if (subjectType === 'USER') setSubjectId(subjects.users[0]?.id ?? '');
    else if (subjectType === 'GROUP') setSubjectId(subjects.groups[0]?.id ?? '');
    else setSubjectId(subjects.roles[0] ?? '');
  }, [subjectType, subjects]);

  const subjectOptions = React.useMemo(() => {
    if (!subjects) return [];
    if (subjectType === 'USER') return subjects.users.map((u) => ({ value: u.id, label: u.label }));
    if (subjectType === 'GROUP') return subjects.groups.map((g) => ({ value: g.id, label: g.label }));
    return subjects.roles.map((r) => ({ value: r, label: r }));
  }, [subjectType, subjects]);

  const targetLabel =
    scope === 'FOLDER'
      ? folders.find((f) => f.id === selectedFolderId)?.name ?? '—'
      : activeDocumentId || '—';

  const handleGrant = async () => {
    if (!subjectId) {
      setError('Select a subject to grant access to.');
      return;
    }
    setIsBusy(true);
    setNotice(null);
    try {
      const payload = { subjectType, subjectId, permissionLevel };
      if (scope === 'FOLDER') {
        await kmsApi.permissions.grantFolder(selectedFolderId, payload);
      } else {
        await kmsApi.permissions.grantDocument(activeDocumentId, payload);
      }
      setNotice(`${permissionLevel} granted on ${scope.toLowerCase()} "${targetLabel}".`);
      setError(null);
      loadPermissions();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Grant failed');
    } finally {
      setIsBusy(false);
    }
  };

  const handleRevoke = async (row: PermissionRow) => {
    if (!window.confirm(`Revoke ${row.permissionLevel} from ${row.subjectLabel}?`)) return;
    setIsBusy(true);
    try {
      if (scope === 'FOLDER') {
        await kmsApi.permissions.revokeFolder(selectedFolderId, row.id);
      } else {
        await kmsApi.permissions.revokeDocument(activeDocumentId, row.id);
      }
      setNotice(`Access revoked from ${row.subjectLabel}.`);
      setError(null);
      loadPermissions();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Revoke failed');
    } finally {
      setIsBusy(false);
    }
  };

  const columns = [
    {
      header: 'Subject Type',
      accessor: (row: PermissionRow) => <Badge label={row.subjectType} variant="blue" />,
    },
    {
      header: 'Subject',
      accessor: (row: PermissionRow) => (
        <span className="text-xs font-semibold text-kms-slate-900">{row.subjectLabel}</span>
      ),
    },
    {
      header: 'Permission Level',
      accessor: (row: PermissionRow) => (
        <Badge label={row.permissionLevel} variant={LEVEL_VARIANT[row.permissionLevel] ?? 'slate'} />
      ),
    },
    {
      header: 'Actions',
      accessor: (row: PermissionRow) => (
        <button onClick={() => handleRevoke(row)} title="Revoke access" className="p-1.5 rounded hover:bg-red-50 text-red-600">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      ),
    },
  ];

  return (
    <AppShell requiredRole="ROLE_CONTENT_OWNER">
      <div className="space-y-5">
        <div className="flex items-center justify-between border-b border-kms-slate-200 pb-3">
          <div>
            <Breadcrumb items={[{ label: 'Administration', href: '/admin' }, { label: 'Access Control' }]} />
            <h1 className="text-xl font-bold text-kms-slate-900 tracking-tight flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-blue-700" />
              Folder &amp; Document Permission Management (RBAC)
            </h1>
            <p className="text-[11px] text-kms-slate-500 mt-1">
              FR-17 — grant VIEW / EDIT / DELETE / ADMIN to a user, group or role. Folder grants are inherited by
              subfolders and the documents inside them.
            </p>
          </div>
          <Button variant="outline" size="sm" icon={<RefreshCw className="w-4 h-4" />} onClick={loadPermissions}>
            Refresh
          </Button>
        </div>

        {notice && <Alert type="success">{notice}</Alert>}
        {error && <Alert type="error">{error}</Alert>}

        {isLoading ? (
          <LoadingState message="Loading access control data..." />
        ) : (
          <>
            <div className="flex items-center gap-2">
              <Button
                variant={scope === 'FOLDER' ? 'primary' : 'outline'}
                size="sm"
                icon={<FolderTree className="w-4 h-4" />}
                onClick={() => setScope('FOLDER')}
              >
                Folder Permissions
              </Button>
              <Button
                variant={scope === 'DOCUMENT' ? 'primary' : 'outline'}
                size="sm"
                icon={<FileText className="w-4 h-4" />}
                onClick={() => setScope('DOCUMENT')}
              >
                Document Permissions
              </Button>
            </div>

            <Card title={scope === 'FOLDER' ? 'Select Folder' : 'Select Document'}>
              {scope === 'FOLDER' ? (
                folders.length === 0 ? (
                  <p className="text-xs text-kms-slate-500">
                    No folders exist yet. Create one from the library before assigning folder permissions.
                  </p>
                ) : (
                  <Select
                    label="Folder"
                    value={selectedFolderId}
                    onChange={(e) => setSelectedFolderId(e.target.value)}
                    options={folders.map((f) => ({
                      value: f.id,
                      label: `${f.name}  ·  ${f.departmentName ?? 'no department'}  ·  ${f.confidentialityLevel}`,
                    }))}
                  />
                )
              ) : (
                <div className="flex items-end gap-2">
                  <Input
                    label="Document ID"
                    value={documentId}
                    onChange={(e) => setDocumentId(e.target.value)}
                    helperText="Paste a document UUID to manage its access control list"
                  />
                  <Button variant="secondary" size="sm" onClick={() => setActiveDocumentId(documentId.trim())} disabled={!documentId.trim()}>
                    Load
                  </Button>
                </div>
              )}
            </Card>

            <Card title={`Grant Access — ${targetLabel}`}>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                <Select
                  label="Subject Type"
                  value={subjectType}
                  onChange={(e) => setSubjectType(e.target.value)}
                  options={[
                    { value: 'USER', label: 'USER — individual account' },
                    { value: 'GROUP', label: 'GROUP — security group' },
                    { value: 'ROLE', label: 'ROLE — realm role' },
                  ]}
                />
                <Select
                  label="Subject"
                  value={subjectId}
                  onChange={(e) => setSubjectId(e.target.value)}
                  options={subjectOptions.length > 0 ? subjectOptions : [{ value: '', label: 'No subjects available' }]}
                />
                <Select
                  label="Permission Level"
                  value={permissionLevel}
                  onChange={(e) => setPermissionLevel(e.target.value)}
                  options={(subjects?.permissionLevels ?? ['VIEW', 'EDIT', 'DELETE', 'ADMIN']).map((l) => ({ value: l, label: l }))}
                />
                <Button
                  variant="primary"
                  size="sm"
                  icon={<Plus className="w-4 h-4" />}
                  onClick={handleGrant}
                  disabled={isBusy || (scope === 'FOLDER' ? !selectedFolderId : !activeDocumentId)}
                >
                  Grant Permission
                </Button>
              </div>
            </Card>

            <Table
              columns={columns}
              data={permissions}
              keyExtractor={(item) => item.id}
              emptyText={
                scope === 'DOCUMENT' && !activeDocumentId
                  ? 'Load a document to view its permissions.'
                  : 'No explicit grants. Access falls back to the confidentiality label policy (FR-19).'
              }
            />

            <Alert type="info" title="Effective access precedence">
              Administrators always have full control. Otherwise the highest of: document author, explicit document
              grant, inherited folder grant, then the confidentiality label default — PUBLIC/INTERNAL readable by any
              authenticated user, CONFIDENTIAL limited to the owning department, RESTRICTED requires an explicit grant.
            </Alert>
          </>
        )}
      </div>
    </AppShell>
  );
}
