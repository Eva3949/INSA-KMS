'use client';

import React from 'react';
import { AppShell } from '@/src/components/layout/AppShell';
import { Breadcrumb } from '@/src/components/ui/Breadcrumb';
import { Button } from '@/src/components/ui/Button';
import { Table } from '@/src/components/ui/Table';
import { LoadingState } from '@/src/components/ui/States';
import { Alert } from '@/src/components/ui/Alert';
import { kmsApi } from '@/src/lib/api';
import { UsersRound, RefreshCw, Building } from 'lucide-react';

interface GroupRow {
  id: string;
  name: string;
  department: string;
  memberCount: number;
}

export default function AdminGroupsPage() {
  const [rows, setRows] = React.useState<GroupRow[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(() => {
    setIsLoading(true);
    setError(null);
    kmsApi.admin
      .getGroups()
      .then((data) => setRows(data as GroupRow[]))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Failed to load groups'))
      .finally(() => setIsLoading(false));
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

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
  ];

  return (
    <AppShell requiredRole="ROLE_ADMIN">
      <div className="space-y-5">
        <div className="flex items-center justify-between border-b border-kms-slate-200 pb-3">
          <div>
            <Breadcrumb items={[{ label: 'Administration', href: '/admin' }, { label: 'Groups & Membership' }]} />
            <h1 className="text-xl font-bold text-kms-slate-900 tracking-tight flex items-center gap-2">
              <UsersRound className="w-5 h-5 text-blue-700" />
              Security Groups & Membership Directory
            </h1>
            <p className="text-[11px] text-kms-slate-500 mt-1">
              Group structure is provisioned from the corporate identity provider (FR-18 / HRIS sync)
            </p>
          </div>

          <Button variant="outline" size="sm" icon={<RefreshCw className="w-4 h-4" />} onClick={load}>
            Refresh
          </Button>
        </div>

        {error && <Alert type="error">{error}</Alert>}

        {isLoading ? (
          <LoadingState message="Loading groups..." />
        ) : (
          <Table columns={columns} data={rows} keyExtractor={(item) => item.id} emptyText="No groups provisioned yet." />
        )}
      </div>
    </AppShell>
  );
}
