'use client';

import React from 'react';
import { AppShell } from '@/src/components/layout/AppShell';
import { Breadcrumb } from '@/src/components/ui/Breadcrumb';
import { Button } from '@/src/components/ui/Button';
import { Badge } from '@/src/components/ui/Badge';
import { Card } from '@/src/components/ui/Card';
import { Table } from '@/src/components/ui/Table';
import { LoadingState } from '@/src/components/ui/States';
import { Alert } from '@/src/components/ui/Alert';
import { kmsApi } from '@/src/lib/api';
import { ScanLine, RefreshCw, Clock, CheckCircle2, AlertCircle } from 'lucide-react';

interface OcrJob {
  id: string;
  documentId?: string;
  documentTitle?: string;
  fileName?: string;
  status: string;
  createdAt?: string;
  completedAt?: string;
  errorMessage?: string | null;
}

export default function AdminOcrPage() {
  const [jobs, setJobs] = React.useState<OcrJob[]>([]);
  const [pendingCount, setPendingCount] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(() => {
    setIsLoading(true);
    setError(null);
    kmsApi.admin
      .getOcrJobs(100)
      .then((data: any) => {
        setPendingCount(data?.pendingCount ?? 0);
        setJobs(data?.jobs ?? []);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Failed to load OCR jobs'))
      .finally(() => setIsLoading(false));
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const statusBadge = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'COMPLETED':
      case 'DONE':
        return <Badge label="DONE" variant="green" />;
      case 'PROCESSING':
      case 'IN_PROGRESS':
        return <Badge label="PROCESSING" variant="amber" />;
      case 'PENDING':
      case 'QUEUED':
        return <Badge label="PENDING" variant="blue" />;
      case 'FAILED':
      case 'ERROR':
        return <Badge label="FAILED" variant="red" />;
      default:
        return <Badge label={status || 'UNKNOWN'} variant="slate" />;
    }
  };

  const columns = [
    {
      header: 'Status',
      accessor: (job: OcrJob) => statusBadge(job.status),
    },
    {
      header: 'File Name',
      accessor: (job: OcrJob) => (
        <span className="text-xs text-kms-slate-900 font-medium font-mono">
          {job.fileName || job.documentTitle || '-'}
        </span>
      ),
    },
    {
      header: 'Document',
      accessor: (job: OcrJob) => (
        <span className="text-xs text-kms-slate-600">
          {job.documentTitle || <span className="text-kms-slate-400 italic">Unlinked</span>}
        </span>
      ),
    },
    {
      header: 'Created',
      accessor: (job: OcrJob) => (
        <span className="text-xs text-kms-slate-500 font-mono">
          {job.createdAt ? new Date(job.createdAt).toLocaleString() : '-'}
        </span>
      ),
    },
    {
      header: 'Completed',
      accessor: (job: OcrJob) => (
        <span className="text-xs text-kms-slate-500 font-mono">
          {job.completedAt ? new Date(job.completedAt).toLocaleString() : '-'}
        </span>
      ),
    },
    {
      header: 'Error',
      accessor: (job: OcrJob) =>
        job.errorMessage ? (
          <span className="text-[11px] text-red-600 max-w-[200px] truncate block" title={job.errorMessage}>
            {job.errorMessage}
          </span>
        ) : (
          <span className="text-kms-slate-300">-</span>
        ),
    },
  ];

  return (
    <AppShell requiredRole="ROLE_ADMIN">
      <div className="space-y-5">
        <div className="flex items-center justify-between border-b border-kms-slate-200 pb-3">
          <div>
            <Breadcrumb items={[{ label: 'Administration', href: '/admin' }, { label: 'OCR Processing Queue' }]} />
            <h1 className="text-xl font-bold text-kms-slate-900 tracking-tight flex items-center gap-2">
              <ScanLine className="w-5 h-5 text-blue-700" />
              OCR Text Extraction Queue
            </h1>
            <p className="text-[11px] text-kms-slate-500 mt-1">
              FR-10 OCR processing status — {pendingCount} pending job{pendingCount !== 1 ? 's' : ''} in queue
            </p>
          </div>

          <Button variant="outline" size="sm" icon={<RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />} onClick={load}>
            Refresh Queue
          </Button>
        </div>

        {error && <Alert type="error">{error}</Alert>}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card title="Pending">
            <div className="flex items-center gap-3 pt-2">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Clock className="w-5 h-5 text-blue-700" />
              </div>
              <div>
                <div className="text-2xl font-black text-blue-700">{pendingCount}</div>
                <div className="text-[11px] text-kms-slate-500 font-medium">Awaiting processing</div>
              </div>
            </div>
          </Card>

          <Card title="Completed">
            <div className="flex items-center gap-3 pt-2">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-emerald-700" />
              </div>
              <div>
                <div className="text-2xl font-black text-emerald-700">
                  {jobs.filter((j) => j.status?.toUpperCase() === 'COMPLETED' || j.status?.toUpperCase() === 'DONE').length}
                </div>
                <div className="text-[11px] text-kms-slate-500 font-medium">Text extracted</div>
              </div>
            </div>
          </Card>

          <Card title="Failed">
            <div className="flex items-center gap-3 pt-2">
              <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-red-700" />
              </div>
              <div>
                <div className="text-2xl font-black text-red-700">
                  {jobs.filter((j) => j.status?.toUpperCase() === 'FAILED' || j.status?.toUpperCase() === 'ERROR').length}
                </div>
                <div className="text-[11px] text-kms-slate-500 font-medium">Extraction errors</div>
              </div>
            </div>
          </Card>
        </div>

        {isLoading ? (
          <LoadingState message="Loading OCR queue..." />
        ) : (
          <Table
            columns={columns}
            data={jobs}
            keyExtractor={(item) => item.id}
            emptyText="No OCR jobs in queue. Text extraction runs automatically when documents are uploaded."
          />
        )}
      </div>
    </AppShell>
  );
}
