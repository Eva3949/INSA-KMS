'use client';

import React from 'react';
import { AppShell } from '@/src/components/layout/AppShell';
import { Breadcrumb } from '@/src/components/ui/Breadcrumb';
import { Button } from '@/src/components/ui/Button';
import { Badge } from '@/src/components/ui/Badge';
import { Table } from '@/src/components/ui/Table';
import { History, Download, RotateCcw, FileText, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export default function VersionHistoryPage({ params }: { params: { id: string } }) {
  const docId = params.id;

  const mockVersions = [
    {
      versionNumber: 3,
      versionLabel: 'v3.0',
      fileName: 'KMS_Security_Architecture_v3.pdf',
      author: 'Sarah Jenkins',
      date: '2026-08-18 14:32',
      size: '4.2 MB',
      changeSummary: 'Updated OAuth2 Keycloak RS256 token verification specification.',
      isCurrent: true,
    },
    {
      versionNumber: 2,
      versionLabel: 'v2.0',
      fileName: 'KMS_Security_Architecture_v2.pdf',
      author: 'David Chen',
      date: '2026-08-01 09:15',
      size: '3.9 MB',
      changeSummary: 'Added PostgreSQL RLS row security enforcement section.',
      isCurrent: false,
    },
    {
      versionNumber: 1,
      versionLabel: 'v1.0',
      fileName: 'KMS_Security_Architecture_v1.pdf',
      author: 'Sarah Jenkins',
      date: '2026-07-01 11:00',
      size: '3.1 MB',
      changeSummary: 'Initial document draft upload.',
      isCurrent: false,
    },
  ];

  const columns = [
    {
      header: 'Version',
      accessor: (ver: typeof mockVersions[0]) => (
        <div className="flex items-center gap-2 font-mono font-bold text-xs">
          <span className="text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
            {ver.versionLabel}
          </span>
          {ver.isCurrent && (
            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-sans uppercase font-bold border border-emerald-200">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Active Version
            </span>
          )}
        </div>
      ),
    },
    {
      header: 'File Name',
      accessor: (ver: typeof mockVersions[0]) => (
        <span className="font-medium text-kms-slate-900">{ver.fileName}</span>
      ),
    },
    {
      header: 'Author',
      accessor: (ver: typeof mockVersions[0]) => <span className="text-xs text-kms-slate-600">{ver.author}</span>,
    },
    {
      header: 'Timestamp',
      accessor: (ver: typeof mockVersions[0]) => <span className="text-xs text-kms-slate-500">{ver.date}</span>,
    },
    {
      header: 'Change Note / Summary',
      accessor: (ver: typeof mockVersions[0]) => (
        <span className="text-xs text-kms-slate-700 italic">{ver.changeSummary}</span>
      ),
    },
    {
      header: 'Actions',
      accessor: (ver: typeof mockVersions[0]) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" icon={<Download className="w-3.5 h-3.5" />} title="Download Version" />
          {!ver.isCurrent && (
            <Button
              variant="outline"
              size="sm"
              icon={<RotateCcw className="w-3.5 h-3.5 text-amber-700" />}
              title="Rollback to this Version"
            >
              Rollback
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <AppShell>
      <div className="space-y-5">
        <div className="flex items-center justify-between border-b border-kms-slate-200 pb-3">
          <div>
            <Breadcrumb
              items={[
                { label: 'Document Library', href: '/library' },
                { label: `Document #${docId}`, href: `/preview/${docId}` },
                { label: 'Version History' },
              ]}
            />
            <h1 className="text-xl font-bold text-kms-slate-900 tracking-tight flex items-center gap-2">
              <History className="w-5 h-5 text-blue-700" />
              Version History & Revision Provenance
            </h1>
          </div>

          <Link href={`/preview/${docId}`}>
            <Button variant="outline" size="sm" icon={<FileText className="w-4 h-4" />}>
              Back to Preview Workspace
            </Button>
          </Link>
        </div>

        <Table
          columns={columns}
          data={mockVersions}
          keyExtractor={(item) => item.versionLabel}
          emptyText="No version history records found."
        />
      </div>
    </AppShell>
  );
}
