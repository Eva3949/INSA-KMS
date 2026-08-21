'use client';

import React from 'react';
import { AppShell } from '@/src/components/layout/AppShell';
import { Breadcrumb } from '@/src/components/ui/Breadcrumb';
import { Button } from '@/src/components/ui/Button';
import { Badge } from '@/src/components/ui/Badge';
import { Table } from '@/src/components/ui/Table';
import { Bookmark, Bell, Play, Trash2 } from 'lucide-react';
import Link from 'next/link';

export default function SavedSearchesPage() {
  const [savedSearches, setSavedSearches] = React.useState([
    {
      id: 'saved-1',
      name: 'IT Security & Compliance Audits',
      query: 'Security Audit AND Policy',
      alertFrequency: 'DAILY',
      notifyEmail: 's.jenkins@enterprise.internal',
      createdDate: '2026-08-01',
    },
    {
      id: 'saved-2',
      name: 'Restricted Financial Contracts',
      query: 'Contract AND RESTRICTED',
      alertFrequency: 'INSTANT',
      notifyEmail: 'm.scott@enterprise.internal',
      createdDate: '2026-08-05',
    },
  ]);

  React.useEffect(() => {
    const raw = localStorage.getItem('kms_saved_searches');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSavedSearches(parsed);
        }
      } catch {
        // Fallback to default mock list
      }
    }
  }, []);

  const handleDelete = (id: string) => {
    const updated = savedSearches.filter((s) => s.id !== id);
    setSavedSearches(updated);
    localStorage.setItem('kms_saved_searches', JSON.stringify(updated));
  };

  const columns = [
    {
      header: 'Saved Search Name',
      accessor: (item: (typeof savedSearches)[0]) => (
        <div className="font-semibold text-kms-slate-900 flex items-center gap-2">
          <Bookmark className="w-4 h-4 text-blue-700 shrink-0" />
          {item.name}
        </div>
      ),
    },
    {
      header: 'Query Definition',
      accessor: (item: (typeof savedSearches)[0]) => (
        <span className="font-mono text-xs bg-kms-slate-100 px-2 py-1 rounded text-kms-slate-800">
          {item.query}
        </span>
      ),
    },
    {
      header: 'Alert Frequency',
      accessor: (item: (typeof savedSearches)[0]) => (
        <Badge label={item.alertFrequency || 'DAILY'} variant="blue" icon={<Bell className="w-3 h-3 text-blue-600" />} />
      ),
    },
    {
      header: 'Actions',
      accessor: (item: (typeof savedSearches)[0]) => (
        <div className="flex items-center gap-1">
          <Link href={`/search?q=${encodeURIComponent(item.query)}`}>
            <Button variant="outline" size="sm" icon={<Play className="w-3.5 h-3.5" />}>
              Run Query
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="sm"
            icon={<Trash2 className="w-3.5 h-3.5 text-red-600" />}
            onClick={() => handleDelete(item.id)}
            title="Delete saved search"
          />
        </div>
      ),
    },
  ];

  return (
    <AppShell>
      <div className="space-y-5">
        <div className="flex items-center justify-between border-b border-kms-slate-200 pb-3">
          <div>
            <Breadcrumb items={[{ label: 'Search & Discovery', href: '/search' }, { label: 'Saved Searches' }]} />
            <h1 className="text-xl font-bold text-kms-slate-900 tracking-tight flex items-center gap-2">
              <Bookmark className="w-5 h-5 text-blue-700" />
              Saved Searches &amp; Automated Email Alerts
            </h1>
          </div>

          <Link href="/search">
            <Button variant="primary" size="sm" icon={<Bookmark className="w-4 h-4" />}>
              New Saved Search
            </Button>
          </Link>
        </div>

        <Table
          columns={columns}
          data={savedSearches}
          keyExtractor={(item) => item.id}
          emptyText="No saved searches configured yet."
        />
      </div>
    </AppShell>
  );
}

