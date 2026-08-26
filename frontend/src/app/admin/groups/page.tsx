'use client';

import React from 'react';
import { AppShell } from '@/src/components/layout/AppShell';
import { Breadcrumb } from '@/src/components/ui/Breadcrumb';
import { Button } from '@/src/components/ui/Button';
import { Input, Select } from '@/src/components/ui/Input';
import { Modal } from '@/src/components/ui/Modal';
import { Table } from '@/src/components/ui/Table';
import { Badge } from '@/src/components/ui/Badge';
import { LoadingState } from '@/src/components/ui/States';
import { Alert } from '@/src/components/ui/Alert';
import { kmsApi } from '@/src/lib/api';
import { UsersRound, RefreshCw, Building, Plus, Pencil, Trash2, UserPlus, UserMinus } from 'lucide-react';

interface GroupRow {
  id: string;
  name: string;
  department: string;
  memberCount: number;
}

interface MemberRow {
  id: string;
  username: string;
  email?: string | null;
  active: boolean;
  roleName?: string | null;
}

interface DeptOption {
  id: string;
  name: string;
}

export default function AdminGroupsPage() {
  const [rows, setRows] = React.useState<GroupRow[]>([]);
  const [departments, setDepartments] = React.useState<DeptOption[]>([]);
  const [allUsers, setAllUsers] = React.useState<Array<{ id: string; label: string }>>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);

  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<GroupRow | null>(null);
  const [formName, setFormName] = React.useState('');
  const [formDeptId, setFormDeptId] = React.useState('');
  const [isSaving, setIsSaving] = React.useState(false);

  const [membersGroup, setMembersGroup] = React.useState<GroupRow | null>(null);
  const [members, setMembers] = React.useState<MemberRow[]>([]);
  const [isMembersLoading, setIsMembersLoading] = React.useState(false);
  const [addUserId, setAddUserId] = React.useState('');

  const load = React.useCallback(() => {
    setIsLoading(true);
    setError(null);
    Promise.all([
      kmsApi.admin.getGroups(),
      kmsApi.admin.getDepartments().catch(() => []),
      kmsApi.admin.getUsers().catch(() => []),
    ])
      .then(([groupData, deptData, userData]) => {
        setRows(groupData as GroupRow[]);
        setDepartments(deptData as DeptOption[]);
        setAllUsers((userData as any[]).map((u) => ({ id: u.id, label: `${u.username} (${u.email})` })));
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Failed to load groups'))
      .finally(() => setIsLoading(false));
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setFormName('');
    setFormDeptId('');
    setIsEditOpen(true);
  };

  const openEdit = (g: GroupRow) => {
    setEditing(g);
    setFormName(g.name);
    const dept = departments.find((d) => d.name === g.department);
    setFormDeptId(dept?.id ?? '');
    setIsEditOpen(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      setError('Group name is required.');
      return;
    }
    setIsSaving(true);
    try {
      const payload = { name: formName.trim(), departmentId: formDeptId || undefined };
      if (editing) {
        await kmsApi.admin.updateGroup(editing.id, payload);
        setNotice(`Group "${payload.name}" updated.`);
      } else {
        await kmsApi.admin.createGroup(payload);
        setNotice(`Group "${payload.name}" created.`);
      }
      setIsEditOpen(false);
      setError(null);
      load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (g: GroupRow) => {
    if (!window.confirm(`Delete group "${g.name}"? Members lose group-based access grants.`)) return;
    try {
      await kmsApi.admin.deleteGroup(g.id);
      setNotice(`Group "${g.name}" deleted.`);
      setError(null);
      load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  const openMembers = async (g: GroupRow) => {
    setMembersGroup(g);
    setMembers([]);
    setAddUserId('');
    setIsMembersLoading(true);
    try {
      setMembers((await kmsApi.admin.listGroupMembers(g.id)) as MemberRow[]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load members');
    } finally {
      setIsMembersLoading(false);
    }
  };

  const handleAddMember = async () => {
    if (!membersGroup || !addUserId) return;
    try {
      await kmsApi.admin.addGroupMember(membersGroup.id, addUserId);
      setMembers((await kmsApi.admin.listGroupMembers(membersGroup.id)) as MemberRow[]);
      setNotice('Member added.');
      setError(null);
      load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to add member');
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!membersGroup) return;
    try {
      await kmsApi.admin.removeGroupMember(membersGroup.id, userId);
      setMembers((await kmsApi.admin.listGroupMembers(membersGroup.id)) as MemberRow[]);
      setNotice('Member removed.');
      setError(null);
      load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to remove member');
    }
  };

  const columns = [
    {
      header: 'Group Name',
      accessor: (g: GroupRow) => (
        <span className="font-semibold text-kms-slate-900 text-xs flex items-center gap-2">
          <UsersRound className="w-4 h-4 text-blue-700" />
          {g.name}
        </span>
      ),
    },
    {
      header: 'Department Scope',
      accessor: (g: GroupRow) => (
        <span className="text-xs text-kms-slate-700 flex items-center gap-1.5">
          <Building className="w-3.5 h-3.5 text-kms-slate-400" />
          {g.department}
        </span>
      ),
    },
    {
      header: 'Members',
      accessor: (g: GroupRow) => <span className="font-mono text-xs font-semibold text-blue-700">{g.memberCount}</span>,
    },
    {
      header: 'Actions',
      accessor: (g: GroupRow) => (
        <div className="flex items-center gap-1.5">
          <button onClick={() => openMembers(g)} title="Manage members" className="p-1.5 rounded hover:bg-blue-50 text-blue-700">
            <UserPlus className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => openEdit(g)} title="Rename / reassign" className="p-1.5 rounded hover:bg-amber-50 text-amber-700">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => handleDelete(g)} title="Delete group" className="p-1.5 rounded hover:bg-red-50 text-red-600">
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
            <Breadcrumb items={[{ label: 'Administration', href: '/admin' }, { label: 'Groups & Membership' }]} />
            <h1 className="text-xl font-bold text-kms-slate-900 tracking-tight flex items-center gap-2">
              <UsersRound className="w-5 h-5 text-blue-700" />
              Security Groups &amp; Membership Directory
            </h1>
            <p className="text-[11px] text-kms-slate-500 mt-1">
              Groups can be granted folder/document permissions as a subject (FR-17) — access follows membership.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />} onClick={openCreate}>
              Create Group
            </Button>
            <Button variant="outline" size="sm" icon={<RefreshCw className="w-4 h-4" />} onClick={load}>
              Refresh
            </Button>
          </div>
        </div>

        {notice && <Alert type="success">{notice}</Alert>}
        {error && <Alert type="error">{error}</Alert>}

        {isLoading ? (
          <LoadingState message="Loading groups..." />
        ) : (
          <Table columns={columns} data={rows} keyExtractor={(item) => item.id} emptyText="No groups yet — create one." />
        )}

        <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title={editing ? `Edit Group: ${editing.name}` : 'Create Security Group'}>
          <div className="space-y-4">
            <Input label="Group Name" value={formName} onChange={(e) => setFormName(e.target.value)} required />
            <Select
              label="Department Scope"
              value={formDeptId}
              onChange={(e) => setFormDeptId(e.target.value)}
              options={[{ value: '', label: 'No department scope' }, ...departments.map((d) => ({ value: d.id, label: d.name }))]}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" size="sm" onClick={() => setIsEditOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleSave} disabled={isSaving}>
                {isSaving ? 'Saving...' : editing ? 'Save Changes' : 'Create Group'}
              </Button>
            </div>
          </div>
        </Modal>

        <Modal isOpen={membersGroup !== null} onClose={() => setMembersGroup(null)} title={membersGroup ? `Members of ${membersGroup.name}` : ''}>
          <div className="space-y-4">
            <div className="flex items-end gap-2">
              <Select
                label="Add member"
                value={addUserId}
                onChange={(e) => setAddUserId(e.target.value)}
                options={[
                  { value: '', label: 'Select a user...' },
                  ...allUsers.filter((u) => !members.some((m) => m.id === u.id)).map((u) => ({ value: u.id, label: u.label })),
                ]}
              />
              <Button variant="primary" size="sm" onClick={handleAddMember} disabled={!addUserId}>
                Add
              </Button>
            </div>
            {isMembersLoading ? (
              <LoadingState message="Loading members..." />
            ) : members.length === 0 ? (
              <p className="text-xs text-kms-slate-500 text-center py-4">No members yet.</p>
            ) : (
              <div className="space-y-1.5 max-h-72 overflow-y-auto">
                {members.map((m) => (
                  <div key={m.id} className="flex items-center justify-between text-xs bg-kms-slate-50 border border-kms-slate-200 rounded p-2">
                    <span>
                      <span className="font-semibold text-kms-slate-900">{m.username}</span>
                      <span className="text-kms-slate-500 ml-2">{m.email}</span>
                    </span>
                    <button onClick={() => handleRemoveMember(m.id)} title="Remove from group" className="p-1.5 rounded hover:bg-red-50 text-red-600">
                      <UserMinus className="w-3.5 h-3.5" />
                    </button>
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
