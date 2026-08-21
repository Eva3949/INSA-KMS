'use client';

import React from 'react';
import { AppShell } from '@/src/components/layout/AppShell';
import { Breadcrumb } from '@/src/components/ui/Breadcrumb';
import { Button } from '@/src/components/ui/Button';
import { Table } from '@/src/components/ui/Table';
import { Tag, Plus } from 'lucide-react';

export default function AdminTaxonomyPage() {
  const mockTags = [
    { id: 't-1', name: 'Security', usageCount: 142, category: 'Technical' },
    { id: 't-2', name: 'OAuth2', usageCount: 88, category: 'Technical' },
    { id: 't-3', name: 'Keycloak', usageCount: 65, category: 'Identity' },
    { id: 't-4', name: 'Audit', usageCount: 110, category: 'Compliance' },
    { id: 't-5', name: 'Financial', usageCount: 204, category: 'Finance' },
  ];

  const columns = [
    {
      header: 'Tag Name',
      accessor: (t: typeof mockTags[0]) => (
        <span className="font-bold text-xs text-kms-slate-900 bg-kms-slate-100 px-2 py-1 rounded border border-kms-slate-300 flex items-center gap-1.5 w-fit">
          <Tag className="w-3 h-3 text-kms-slate-500" />
          #{t.name}
        </span>
      ),
    },
    {
      header: 'Category Taxonomy',
      accessor: (t: typeof mockTags[0]) => <span className="text-xs text-kms-slate-700">{t.category}</span>,
    },
    {
      header: 'Tagged Document Usage',
      accessor: (t: typeof mockTags[0]) => (
        <span className="font-mono text-xs font-semibold text-blue-700">{t.usageCount} Documents Tagged</span>
      ),
    },
  ];

  return (
    <AppShell requiredRole="ROLE_ADMIN">
      <div className="space-y-5">
        <div className="flex items-center justify-between border-b border-kms-slate-200 pb-3">
          <div>
            <Breadcrumb items={[{ label: 'Administration', href: '/admin' }, { label: 'Taxonomy & Tags' }]} />
            <h1 className="text-xl font-bold text-kms-slate-900 tracking-tight flex items-center gap-2">
              <Tag className="w-5 h-5 text-blue-700" />
              Taxonomy Keyword Tags & Controlled Vocabulary
            </h1>
          </div>

          <Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />}>
            Add Taxonomy Tag
          </Button>
        </div>

        <Table
          columns={columns}
          data={mockTags}
          keyExtractor={(item) => item.id}
          emptyText="No tags defined."
        />
      </div>
    </AppShell>
  );
}

