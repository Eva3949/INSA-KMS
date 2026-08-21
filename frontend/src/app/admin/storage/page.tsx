'use client';

import React from 'react';
import { AppShell } from '@/src/components/layout/AppShell';
import { Breadcrumb } from '@/src/components/ui/Breadcrumb';
import { Card } from '@/src/components/ui/Card';
import { Button } from '@/src/components/ui/Button';
import { Table } from '@/src/components/ui/Table';
import { HardDrive, ShieldCheck, RefreshCw, CheckCircle2 } from 'lucide-react';

export default function AdminStorageIntegrityPage() {
  const mockStorageObjects = [
    {
      id: 'so-1',
      path: '/kms-storage/2026/08/8f3a9b2c.bin',
      size: '4.2 MB',
      sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      status: 'VERIFIED_INTACT',
      checkedAt: '2026-08-19 02:00',
    },
  ];

  const columns = [
    {
      header: 'Storage Path',
      accessor: (obj: typeof mockStorageObjects[0]) => (
        <span className="font-mono text-xs text-kms-slate-800 font-semibold">{obj.path}</span>
      ),
    },
    {
      header: 'File Size',
      accessor: (obj: typeof mockStorageObjects[0]) => <span className="text-xs text-kms-slate-600">{obj.size}</span>,
    },
    {
      header: 'SHA-256 Binary Checksum Hash',
      accessor: (obj: typeof mockStorageObjects[0]) => (
        <span className="font-mono text-[11px] bg-kms-slate-100 text-kms-slate-700 px-2 py-0.5 rounded border border-kms-slate-300 truncate max-w-xs block">
          {obj.sha256}
        </span>
      ),
    },
    {
      header: 'Integrity Verification',
      accessor: (obj: typeof mockStorageObjects[0]) => (
        <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-sans uppercase font-bold border border-emerald-200">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> {obj.status}
        </span>
      ),
    },
  ];

  return (
    <AppShell requiredRole="ROLE_ADMIN">
      <div className="space-y-5">
        <div className="flex items-center justify-between border-b border-kms-slate-200 pb-3">
          <div>
            <Breadcrumb items={[{ label: 'Administration', href: '/admin' }, { label: 'Storage & Integrity' }]} />
            <h1 className="text-xl font-bold text-kms-slate-900 tracking-tight flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-blue-700" />
              Physical File Storage & SHA-256 Checksum Integrity Ledger
            </h1>
          </div>

          <Button variant="outline" size="sm" icon={<RefreshCw className="w-4 h-4" />}>
            Run Integrity Audit Job
          </Button>
        </div>

        <Table
          columns={columns}
          data={mockStorageObjects}
          keyExtractor={(item) => item.id}
          emptyText="No storage objects registered."
        />
      </div>
    </AppShell>
  );
}

