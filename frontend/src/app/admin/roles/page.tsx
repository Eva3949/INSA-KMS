'use client';

import React from 'react';
import { AppShell } from '@/src/components/layout/AppShell';
import { Breadcrumb } from '@/src/components/ui/Breadcrumb';
import { Card } from '@/src/components/ui/Card';
import { LoadingState } from '@/src/components/ui/States';
import { Alert } from '@/src/components/ui/Alert';
import { kmsApi } from '@/src/lib/api';
import { ShieldCheck, Check, X, Users } from 'lucide-react';

interface RoleRow {
  name: string;
  description: string;
  userCount: number;
}

// Section 8 of the Requirements Specification: Roles & Permissions Matrix
const permissionsMatrix = [
  { feature: 'Search & Preview Documents', viewer: true, contributor: true, owner: true, admin: true, compliance: true, security: true },
  { feature: 'Upload & Create Documents', viewer: false, contributor: true, owner: true, admin: true, compliance: false, security: false },
  { feature: 'Lock & Check-out Editing', viewer: false, contributor: true, owner: true, admin: true, compliance: false, security: false },
  { feature: 'Delete Documents', viewer: false, contributor: true, owner: true, admin: true, compliance: false, security: false },
  { feature: 'Folder ACL Permission Management', viewer: false, contributor: false, owner: true, admin: true, compliance: false, security: false },
  { feature: 'Retention Schedule Configuration', viewer: false, contributor: false, owner: false, admin: true, compliance: true, security: false },
  { feature: 'Issue Litigation Legal Holds', viewer: false, contributor: false, owner: false, admin: true, compliance: true, security: false },
  { feature: 'Audit Log & SIEM Investigation', viewer: false, contributor: false, owner: false, admin: true, compliance: false, security: true },
  { feature: 'System Configuration', viewer: false, contributor: false, owner: false, admin: true, compliance: false, security: false },
];

const Mark: React.FC<{ allowed: boolean }> = ({ allowed }) =>
  allowed ? <Check className="w-4 h-4 text-emerald-600 mx-auto" /> : <X className="w-4 h-4 text-kms-slate-300 mx-auto" />;

export default function AdminRolesMatrixPage() {
  const [roles, setRoles] = React.useState<RoleRow[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setIsLoading(true);
    kmsApi.admin
      .getRoles()
      .then((data) => setRoles(data as RoleRow[]))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Failed to load roles'))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <AppShell requiredRole="ROLE_ADMIN">
      <div className="space-y-5">
        <div className="border-b border-kms-slate-200 pb-3">
          <Breadcrumb items={[{ label: 'Administration', href: '/admin' }, { label: 'Roles & Matrix' }]} />
          <h1 className="text-xl font-bold text-kms-slate-900 tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-700" />
            Roles & Permissions Access Control Matrix (RBAC)
          </h1>
        </div>

        {error && <Alert type="error">{error}</Alert>}

        {isLoading ? (
          <LoadingState message="Loading realm roles..." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {roles.map((role) => (
              <div key={role.name} className="bg-white border border-kms-slate-200 rounded-lg p-3 shadow-2xs">
                <p className="text-[11px] font-mono font-bold text-blue-700 truncate" title={role.name}>
                  {role.name}
                </p>
                <p className="text-[11px] text-kms-slate-600 mt-1 leading-snug">{role.description}</p>
                <p className="mt-2 flex items-center gap-1.5 text-xs font-bold text-kms-slate-900">
                  <Users className="w-3.5 h-3.5 text-kms-slate-500" />
                  {role.userCount} <span className="font-normal text-kms-slate-500 text-[11px]">assigned</span>
                </p>
              </div>
            ))}
          </div>
        )}

        <Card title="Permissions Matrix (Requirements Specification, Section 8)">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-kms-slate-100 text-kms-slate-900 font-bold border-b border-kms-slate-300">
                  <th className="p-3">Feature Capability</th>
                  <th className="p-3 text-center">ROLE_VIEWER</th>
                  <th className="p-3 text-center">ROLE_CONTRIBUTOR</th>
                  <th className="p-3 text-center">ROLE_CONTENT_OWNER</th>
                  <th className="p-3 text-center">ROLE_ADMIN</th>
                  <th className="p-3 text-center">ROLE_COMPLIANCE_OFFICER</th>
                  <th className="p-3 text-center">ROLE_IT_SECURITY</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-kms-slate-100">
                {permissionsMatrix.map((row) => (
                  <tr key={row.feature} className="hover:bg-kms-slate-50">
                    <td className="p-3 font-semibold text-kms-slate-900">{row.feature}</td>
                    <td className="p-3 text-center"><Mark allowed={row.viewer} /></td>
                    <td className="p-3 text-center"><Mark allowed={row.contributor} /></td>
                    <td className="p-3 text-center"><Mark allowed={row.owner} /></td>
                    <td className="p-3 text-center"><Mark allowed={row.admin} /></td>
                    <td className="p-3 text-center"><Mark allowed={row.compliance} /></td>
                    <td className="p-3 text-center"><Mark allowed={row.security} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
