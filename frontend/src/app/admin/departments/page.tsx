'use client';

import React from 'react';
import { AppShell } from '@/src/components/layout/AppShell';
import { Breadcrumb } from '@/src/components/ui/Breadcrumb';
import { Button } from '@/src/components/ui/Button';
import { Table } from '@/src/components/ui/Table';
import { BarChart2, Plus, Building } from 'lucide-react';

export default function AdminDepartmentsPage() {
  const mockDepartments = [
    { id: 'd-1', code: 'ITSEC', name: 'IT Security', quotaGb: 500, usedGb: 142.5 },
    { id: 'd-2', code: 'ENG', name: 'Engineering', quotaGb: 1000, usedGb: 612.0 },
    { id: 'd-3', code: 'HR', name: 'Human Resources', quotaGb: 200, usedGb: 45.2 },
    { id: 'd-4', code: 'FIN', name: 'Finance', quotaGb: 500, usedGb: 280.8 },
  ];

  const columns = [
    {
      header: 'Dept Code',
      accessor: (dept: typeof mockDepartments[0]) => (
        <span className="font-mono font-bold text-xs text-kms-slate-900 bg-kms-slate-100 px-2 py-0.5 rounded border border-kms-slate-300">
          {dept.code}
        </span>
      ),
    },
    {
      header: 'Department Name',
      accessor: (dept: typeof mockDepartments[0]) => (
        <div className="font-semibold text-kms-slate-900 text-xs flex items-center gap-2">
          <Building className="w-4 h-4 text-blue-700" />
          {dept.name}
        </div>
      ),
    },
    {
      header: 'Allocated Quota',
      accessor: (dept: typeof mockDepartments[0]) => <span className="font-mono text-xs">{dept.quotaGb} GB</span>,
    },
    {
      header: 'Current Consumption',
      accessor: (dept: typeof mockDepartments[0]) => {
        const pct = ((dept.usedGb / dept.quotaGb) * 100).toFixed(1);
        return (
          <div className="space-y-1 w-48">
            <div className="flex justify-between text-[11px] font-mono">
              <span>{dept.usedGb} GB</span>
              <span className="font-bold">{pct}%</span>
            </div>
            <div className="w-full bg-kms-slate-200 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-1.5 rounded-full ${Number(pct) > 80 ? 'bg-red-600' : 'bg-blue-600'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      },
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

          <Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />}>
            Create Department
          </Button>
        </div>

        <Table
          columns={columns}
          data={mockDepartments}
          keyExtractor={(item) => item.id}
          emptyText="No departments defined."
        />
      </div>
    </AppShell>
  );
}

