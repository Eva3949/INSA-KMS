'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AppShell } from '@/src/components/layout/AppShell';
import { Breadcrumb } from '@/src/components/ui/Breadcrumb';
import { Table } from '@/src/components/ui/Table';
import { Badge } from '@/src/components/ui/Badge';
import { LoadingState, EmptyState, ErrorState } from '@/src/components/ui/States';
import { GitPullRequestArrow, FileText, Clock, CheckCircle2, XCircle } from 'lucide-react';
import Link from 'next/link';
import { kmsApi } from '@/src/lib/api';

interface ApprovalWorkflow {
  id: string;
  documentId: string;
  documentTitle?: string;
  documentStatus?: string;
  documentAuthor?: string;
  submittedBy?: string;
  status: string;
  templateName?: string;
  createdAt?: string;
  completedAt?: string;
  steps?: Array<{
    stepNumber: number;
    approverUsername?: string;
    status: string;
    decidedAt?: string;
  }>;
}

function statusVariant(status: string): 'green' | 'red' | 'amber' | 'slate' {
  switch (status) {
    case 'APPROVED': return 'green';
    case 'REJECTED': return 'red';
    case 'IN_PROGRESS': return 'amber';
    default: return 'slate';
  }
}

function docStatusVariant(status?: string): 'green' | 'red' | 'amber' | 'slate' {
  switch (status) {
    case 'PUBLISHED': return 'green';
    case 'UNDER_REVIEW': return 'amber';
    case 'DRAFT': return 'slate';
    case 'ARCHIVED': return 'red';
    default: return 'slate';
  }
}

export default function MyApprovalsPage() {
  const [approvals, setApprovals] = useState<ApprovalWorkflow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadApprovals = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await kmsApi.getMyApprovals();
      setApprovals(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load your submissions');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadApprovals();
  }, [loadApprovals]);

  const columns = [
    {
      header: 'Document',
      accessor: (wf: ApprovalWorkflow) => (
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-blue-700 shrink-0" />
          <div>
            <Link href={`/preview/${wf.documentId}`} className="font-medium text-kms-slate-900 hover:text-blue-800 text-xs">
              {wf.documentTitle || `Document #${wf.documentId}`}
            </Link>
            {wf.templateName && (
              <div className="text-[10px] text-kms-slate-500">via {wf.templateName}</div>
            )}
          </div>
        </div>
      ),
    },
    {
      header: 'Status',
      accessor: (wf: ApprovalWorkflow) => (
        <Badge label={wf.status} variant={statusVariant(wf.status)} />
      ),
    },
    {
      header: 'Document Status',
      accessor: (wf: ApprovalWorkflow) => (
        <Badge label={wf.documentStatus || '—'} variant={docStatusVariant(wf.documentStatus)} />
      ),
    },
    {
      header: 'Workflow Progress',
      accessor: (wf: ApprovalWorkflow) => {
        if (!wf.steps || wf.steps.length === 0) return <span className="text-xs text-kms-slate-400">No steps</span>;
        const totalSteps = wf.steps.length;
        const approvedSteps = wf.steps.filter((s) => s.status === 'APPROVED').length;
        const pendingStep = wf.steps.find((s) => s.status === 'PENDING');
        return (
          <div className="space-y-1">
            <div className="text-xs font-semibold text-kms-slate-800">
              {approvedSteps}/{totalSteps} steps approved
            </div>
            {pendingStep && (
              <div className="text-[11px] text-amber-700">
                Waiting for: {pendingStep.approverUsername || 'approver'}
              </div>
            )}
            {wf.status === 'APPROVED' && (
              <div className="text-[11px] text-emerald-700 font-medium">All steps approved</div>
            )}
            {wf.status === 'REJECTED' && (
              <div className="text-[11px] text-red-600 font-medium">Rejected — returned to draft</div>
            )}
          </div>
        );
      },
    },
    {
      header: 'Submitted',
      accessor: (wf: ApprovalWorkflow) => (
        <span className="text-xs text-kms-slate-500">
          {wf.createdAt ? new Date(wf.createdAt).toLocaleDateString() : '—'}
        </span>
      ),
    },
    {
      header: 'Completed',
      accessor: (wf: ApprovalWorkflow) => (
        <span className="text-xs text-kms-slate-500">
          {wf.completedAt ? new Date(wf.completedAt).toLocaleDateString() : <Clock className="w-3.5 h-3.5 text-amber-500 inline" />}
        </span>
      ),
    },
  ];

  return (
    <AppShell>
      <div className="space-y-5">
        <div className="flex items-center justify-between border-b border-kms-slate-200 pb-3">
          <div>
            <Breadcrumb items={[{ label: 'Workflow' }, { label: 'My Submissions' }]} />
            <h1 className="text-xl font-bold text-kms-slate-900 tracking-tight flex items-center gap-2">
              <GitPullRequestArrow className="w-5 h-5 text-blue-700" />
              My Approval Submissions
            </h1>
            <p className="text-[11px] text-kms-slate-500 mt-1">
              Track documents you have submitted for approval and their current workflow status.
            </p>
          </div>
        </div>

        {isLoading && <LoadingState message="Loading your submissions..." />}
        {error && <ErrorState title="Failed to load submissions" message={error} onRetry={loadApprovals} />}

        {!isLoading && !error && (
          <>
            {approvals.length === 0 ? (
              <EmptyState
                title="No submissions yet"
                message="You have not submitted any documents for approval. Open a document and click 'Submit for Approval' to start."
                action={
                  <Link href="/library">
                    <span className="text-blue-700 hover:underline text-xs font-semibold">Browse Document Library</span>
                  </Link>
                }
              />
            ) : (
              <Table
                columns={columns}
                data={approvals}
                keyExtractor={(item) => item.id}
                emptyText="No submissions found."
              />
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
