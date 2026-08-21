'use client';

import React from 'react';
import { AppShell } from '@/src/components/layout/AppShell';
import { Breadcrumb } from '@/src/components/ui/Breadcrumb';
import { Table } from '@/src/components/ui/Table';
import { Badge } from '@/src/components/ui/Badge';
import { ShieldCheck, Check, X } from 'lucide-react';

export default function AdminRolesMatrixPage() {
  const permissionsMatrix = [
    { feature: 'Search & Preview Documents', viewer: true, contributor: true, owner: true, admin: true, compliance: true, security: true },
    { feature: 'Upload & Create Documents', viewer: false, contributor: true, owner: true, admin: true, compliance: false, security: false },
    { feature: 'Lock & Check-out Editing', viewer: false, contributor: true, owner: true, admin: true, compliance: false, security: false },
    { feature: 'Folder ACL Permission Management', viewer: false, contributor: false, owner: true, admin: true, compliance: false, security: false },
    { feature: 'Retention Schedule Configuration', viewer: false, contributor: false, owner: false, admin: true, compliance: true, security: false },
    { feature: 'Issue Litigation Legal Holds', viewer: false, contributor: false, owner: false, admin: true, compliance: true, security: false },
    { feature: 'Audit Log & SIEM Investigation', viewer: false, contributor: false, owner: false, admin: true, compliance: false, security: true },
  ];

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

        <div className="kms-card bg-white p-4 border border-kms-slate-200 overflow-x-auto">
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
                  <td className="p-3 text-center">{row.viewer ? <Check className="w-4 h-4 text-emerald-600 mx-auto" /> : <X className="w-4 h-4 text-kms-slate-300 mx-auto" />}</td>
                  <td className="p-3 text-center">{row.contributor ? <Check className="w-4 h-4 text-emerald-600 mx-auto" /> : <X className="w-4 h-4 text-kms-slate-300 mx-auto" />}</td>
                  <td className="p-3 text-center">{row.owner ? <Check className="w-4 h-4 text-emerald-600 mx-auto" /> : <X className="w-4 h-4 text-kms-slate-300 mx-auto" />}</td>
                  <td className="p-3 text-center">{row.admin ? <Check className="w-4 h-4 text-emerald-600 mx-auto" /> : <X className="w-4 h-4 text-kms-slate-300 mx-auto" />}</td>
                  <td className="p-3 text-center">{row.compliance ? <Check className="w-4 h-4 text-emerald-600 mx-auto" /> : <X className="w-4 h-4 text-kms-slate-300 mx-auto" />}</td>
                  <td className="p-3 text-center">{row.security ? <Check className="w-4 h-4 text-emerald-600 mx-auto" /> : <X className="w-4 h-4 text-kms-slate-300 mx-auto" />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}

