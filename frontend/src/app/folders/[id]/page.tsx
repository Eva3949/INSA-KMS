'use client';

import React from 'react';
import { AppShell } from '@/src/components/layout/AppShell';
import { Breadcrumb } from '@/src/components/ui/Breadcrumb';
import { Button } from '@/src/components/ui/Button';
import { Badge } from '@/src/components/ui/Badge';
import { Table } from '@/src/components/ui/Table';
import { Folder, FileText, Plus, FolderPlus, ChevronRight } from 'lucide-react';
import Link from 'next/link';

export default function FolderExplorerPage({ params }: { params: { id: string } }) {
  const folderId = params.id;

  const mockSubfolders = [
    { id: 'sub-1', name: 'Policies & Standards', filesCount: 14, modified: '2026-08-10' },
    { id: 'sub-2', name: 'Audit Incident Reports', filesCount: 6, modified: '2026-08-12' },
    { id: 'sub-3', name: 'Architecture Specifications', filesCount: 22, modified: '2026-08-15' },
  ];

  const mockFolderFiles = [
    {
      id: 'doc-101',
      title: 'IT_Security_Incident_Response_Plan.pdf',
      owner: 'Sarah Jenkins',
      version: 'v2.0',
      classification: 'RESTRICTED' as const,
      size: '3.1 MB',
      modified: '2026-08-14',
    },
    {
      id: 'doc-102',
      title: 'Cloud_Infrastructure_Hardening_Guide.docx',
      owner: 'David Chen',
      version: 'v1.4',
      classification: 'INTERNAL' as const,
      size: '2.5 MB',
      modified: '2026-08-11',
    },
  ];

  const columns = [
    {
      header: 'Name',
      accessor: (file: typeof mockFolderFiles[0]) => (
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-blue-700 shrink-0" />
          <Link href={`/preview/${file.id}`} className="font-medium text-kms-slate-900 hover:text-blue-800">
            {file.title}
          </Link>
        </div>
      ),
    },
    {
      header: 'Owner',
      accessor: (file: typeof mockFolderFiles[0]) => <span className="text-xs text-kms-slate-600">{file.owner}</span>,
    },
    {
      header: 'Version',
      accessor: (file: typeof mockFolderFiles[0]) => (
        <span className="font-mono text-xs text-blue-700 font-bold">{file.version}</span>
      ),
    },
    {
      header: 'Classification',
      accessor: (file: typeof mockFolderFiles[0]) => (
        <Badge label={file.classification} classification={file.classification} />
      ),
    },
    {
      header: 'Size',
      accessor: (file: typeof mockFolderFiles[0]) => <span className="text-xs text-kms-slate-500">{file.size}</span>,
    },
    {
      header: 'Modified',
      accessor: (file: typeof mockFolderFiles[0]) => <span className="text-xs text-kms-slate-500">{file.modified}</span>,
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
                { label: `Folder #${folderId}` },
              ]}
            />
            <h1 className="text-xl font-bold text-kms-slate-900 tracking-tight flex items-center gap-2">
              <Folder className="w-5 h-5 text-blue-700" />
              Directory Explorer: Folder #{folderId}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" icon={<FolderPlus className="w-4 h-4" />}>
              New Subfolder
            </Button>
            <Link href="/upload">
              <Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />}>
                Upload to Folder
              </Button>
            </Link>
          </div>
        </div>

        {/* Subfolder Directory Section */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-kms-slate-700 uppercase tracking-wider">Subdirectories</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {mockSubfolders.map((sub) => (
              <Link
                key={sub.id}
                href={`/folders/${sub.id}`}
                className="kms-card p-3 flex items-center justify-between hover:border-blue-500 hover:shadow-xs transition-all group"
              >
                <div className="flex items-center gap-3">
                  <Folder className="w-5 h-5 text-amber-500 group-hover:text-blue-600 transition-colors shrink-0" />
                  <div>
                    <div className="text-xs font-semibold text-kms-slate-800 group-hover:text-blue-800">
                      {sub.name}
                    </div>
                    <div className="text-[11px] text-kms-slate-500">{sub.filesCount} files</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-kms-slate-400 group-hover:text-blue-600" />
              </Link>
            ))}
          </div>
        </div>

        {/* Files in this folder */}
        <div className="space-y-2 pt-2">
          <h3 className="text-xs font-bold text-kms-slate-700 uppercase tracking-wider">Documents in Directory</h3>
          <Table
            columns={columns}
            data={mockFolderFiles}
            keyExtractor={(item) => item.id}
            emptyText="No documents in this folder."
          />
        </div>
      </div>
    </AppShell>
  );
}
