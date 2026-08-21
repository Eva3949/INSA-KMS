'use client';

import React from 'react';
import { AppShell } from '@/src/components/layout/AppShell';
import { Breadcrumb } from '@/src/components/ui/Breadcrumb';
import { Card } from '@/src/components/ui/Card';
import { Table } from '@/src/components/ui/Table';
import { BarChart2, AlertTriangle, FileText } from 'lucide-react';
import Link from 'next/link';

export default function AdminReportsPage() {
  const [staleThresholdDays, setStaleThresholdDays] = React.useState('365');
  const [isScanning, setIsScanning] = React.useState(false);
  const [scanMessage, setScanMessage] = React.useState<string | null>(null);

  const [staleItems, setStaleItems] = React.useState([
    {
      id: 'doc-999',
      title: 'Legacy_Network_Diagram_2021.vsdx',
      owner: 'Robert Taylor',
      department: 'Engineering',
      daysUnaccessed: 850,
      lastAccessed: '2023-04-12 (850 days unaccessed)',
      classification: 'INTERNAL' as const,
      isOrphaned: false,
    },
    {
      id: 'doc-888',
      title: 'Discontinued_Vendor_SLA_2022.docx',
      owner: 'Unassigned (Orphaned)',
      department: 'IT Security',
      daysUnaccessed: 520,
      lastAccessed: '2024-03-15 (520 days unaccessed)',
      classification: 'INTERNAL' as const,
      isOrphaned: true,
    },
    {
      id: 'doc-777',
      title: 'Archived_Q3_Financial_Draft.xlsx',
      owner: 'Karen Smith',
      department: 'Finance',
      daysUnaccessed: 210,
      lastAccessed: '2026-01-20 (210 days unaccessed)',
      classification: 'CONFIDENTIAL' as const,
      isOrphaned: false,
    },
  ]);

  const handleRunScanner = () => {
    setIsScanning(true);
    setScanMessage('Scanning database for stale content and orphaned documents...');
    setTimeout(() => {
      setIsScanning(false);
      setScanMessage('Scan complete. Repository updated with current stale content metrics.');
    }, 1000);
  };

  const handleRemediate = (id: string) => {
    setStaleItems((prev) => prev.filter((item) => item.id !== id));
    setScanMessage(`Document #${id} flagged for review / archived according to disposition rules.`);
  };

  const filteredItems = staleItems.filter((item) => {
    if (staleThresholdDays === 'ORPHANED') return item.isOrphaned;
    const threshold = parseInt(staleThresholdDays, 10);
    return item.daysUnaccessed >= threshold;
  });

  const columns = [
    {
      header: 'Document Title',
      accessor: (doc: (typeof staleItems)[0]) => (
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-kms-slate-400 shrink-0" />
          <Link href={`/preview/${doc.id}`} className="font-medium text-kms-slate-900 hover:text-blue-800">
            {doc.title}
          </Link>
          {doc.isOrphaned && (
            <span className="text-[10px] bg-red-100 text-red-800 px-1.5 py-0.5 rounded font-bold border border-red-200">
              ORPHANED
            </span>
          )}
        </div>
      ),
    },
    {
      header: 'Owner',
      accessor: (doc: (typeof staleItems)[0]) => (
        <span className={`text-xs ${doc.isOrphaned ? 'text-red-700 font-semibold' : 'text-kms-slate-600'}`}>
          {doc.owner}
        </span>
      ),
    },
    {
      header: 'Department',
      accessor: (doc: (typeof staleItems)[0]) => <span className="text-xs text-kms-slate-600">{doc.department}</span>,
    },
    {
      header: 'Last Access Activity',
      accessor: (doc: (typeof staleItems)[0]) => (
        <span className="font-mono text-xs text-amber-900 bg-amber-50 px-2 py-0.5 rounded font-semibold border border-amber-200">
          {doc.lastAccessed}
        </span>
      ),
    },
    {
      header: 'Remediation',
      accessor: (doc: (typeof staleItems)[0]) => (
        <button
          onClick={() => handleRemediate(doc.id)}
          className="px-2 py-1 text-[11px] font-semibold bg-kms-slate-100 hover:bg-red-50 text-kms-slate-700 hover:text-red-700 border border-kms-slate-300 rounded transition-colors"
        >
          Flag for Cleanup
        </button>
      ),
    },
  ];

  return (
    <AppShell requiredRole="ROLE_ADMIN">
      <div className="space-y-5">
        <div className="flex items-center justify-between border-b border-kms-slate-200 pb-3">
          <div>
            <Breadcrumb items={[{ label: 'Administration', href: '/admin' }, { label: 'Usage Reports' }]} />
            <h1 className="text-xl font-bold text-kms-slate-900 tracking-tight flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-blue-700" />
              Repository Analytics &amp; Stale / Orphaned Content Scanner (FR-31)
            </h1>
          </div>

          <button
            onClick={handleRunScanner}
            disabled={isScanning}
            className="px-3 py-1.5 bg-blue-700 hover:bg-blue-600 disabled:opacity-50 text-white text-xs font-semibold rounded flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <AlertTriangle className="w-4 h-4" />
            {isScanning ? 'Scanning...' : 'Run Scanner Now'}
          </button>
        </div>

        {scanMessage && (
          <div className="p-3 bg-blue-50 border border-blue-200 text-blue-900 text-xs rounded flex items-center justify-between font-medium">
            <span>{scanMessage}</span>
            <button onClick={() => setScanMessage(null)} className="text-blue-700 font-bold hover:underline">
              Dismiss
            </button>
          </div>
        )}

        <Card title="Stale &amp; Orphaned Content Filter Controls (FR-31)">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <label className="text-xs font-semibold text-kms-slate-700">Filter Threshold:</label>
              <select
                value={staleThresholdDays}
                onChange={(e) => setStaleThresholdDays(e.target.value)}
                className="text-xs bg-white border border-kms-slate-300 rounded px-3 py-1.5 text-kms-slate-800 font-medium focus:ring-2 focus:ring-blue-600 focus:outline-none"
              >
                <option value="180">Unaccessed &gt; 180 Days (6 Months)</option>
                <option value="365">Unaccessed &gt; 365 Days (1 Year)</option>
                <option value="730">Unaccessed &gt; 730 Days (2 Years)</option>
                <option value="ORPHANED">Orphaned Documents Only (No Owner)</option>
              </select>

              <span className="text-xs text-kms-slate-500 font-medium">
                Found <span className="font-bold text-kms-slate-900">{filteredItems.length}</span> document(s) matching criteria
              </span>
            </div>

            <Table
              columns={columns}
              data={filteredItems}
              keyExtractor={(item) => item.id}
              emptyText="No stale or orphaned content detected for selected threshold."
            />
          </div>
        </Card>
      </div>
    </AppShell>
  );
}


