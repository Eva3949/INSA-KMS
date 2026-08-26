'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AppShell } from '@/src/components/layout/AppShell';
import { Breadcrumb } from '@/src/components/ui/Breadcrumb';
import { Button } from '@/src/components/ui/Button';
import { Badge } from '@/src/components/ui/Badge';
import { Table } from '@/src/components/ui/Table';
import { Card } from '@/src/components/ui/Card';
import { LoadingState, EmptyState, ErrorState } from '@/src/components/ui/States';
import { GitPullRequestArrow, CheckCircle2, XCircle, MessageSquare, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { kmsApi } from '@/src/lib/api';
import { useAuth } from '@/src/lib/auth-context';

interface ApprovalWorkflow {
  id: string;
  documentId: string;
  documentTitle?: string;
  submittedBy?: string;
  status: string;
  templateName?: string;
  createdAt?: string;
  steps?: ApprovalStep[];
}

interface ApprovalStep {
  id: string;
  stepOrder: number;
  approverUsername?: string;
  status: string;
  decision?: string;
  comments?: string;
  decidedAt?: string;
}

export default function ApprovalsInboxPage() {
  const { roles } = useAuth();
  const [approvals, setApprovals] = useState<ApprovalWorkflow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [decidingId, setDecidingId] = useState<string | null>(null);
  const [decideComments, setDecideComments] = useState('');
  const [decideModalStep, setDecideModalStep] = useState<{ workflowId: string; stepId: string; decision: string } | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const loadApprovals = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await kmsApi.admin.getPendingApprovals();
      setApprovals(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load approvals';
      setError(msg.includes('403') ? 'You do not have permission to view approvals.' : msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadApprovals();
  }, [loadApprovals]);

  const handleDecide = async () => {
    if (!decideModalStep) return;
    setDecidingId(decideModalStep.workflowId);
    try {
      await kmsApi.admin.decideApproval(
        decideModalStep.workflowId,
        decideModalStep.stepId,
        decideModalStep.decision,
        decideComments || undefined,
      );
      setActionMessage(
        decideModalStep.decision === 'APPROVED'
          ? 'Document approved successfully.'
          : 'Document rejected.'
      );
      setDecideModalStep(null);
      setDecideComments('');
      loadApprovals();
    } catch (err: unknown) {
      setActionMessage(err instanceof Error ? err.message : 'Decision failed');
    } finally {
      setDecidingId(null);
    }
  };

  const columns = [
    {
      header: 'Document',
      accessor: (wf: ApprovalWorkflow) => (
        <div className="flex items-center gap-2">
          <GitPullRequestArrow className="w-4 h-4 text-blue-700 shrink-0" />
          <div>
            <Link href={`/preview/${wf.documentId}`} className="font-medium text-kms-slate-900 hover:text-blue-800 text-xs">
              {wf.documentTitle || `Document #${wf.documentId}`}
            </Link>
            {wf.templateName && (
              <div className="text-[10px] text-kms-slate-500">Template: {wf.templateName}</div>
            )}
          </div>
        </div>
      ),
    },
    {
      header: 'Submitted By',
      accessor: (wf: ApprovalWorkflow) => <span className="text-xs text-kms-slate-600">{wf.submittedBy || '—'}</span>,
    },
    {
      header: 'Status',
      accessor: (wf: ApprovalWorkflow) => (
        <Badge
          label={wf.status}
          variant={wf.status === 'APPROVED' ? 'green' : wf.status === 'REJECTED' ? 'red' : 'amber'}
        />
      ),
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
      header: 'My Pending Step',
      accessor: (wf: ApprovalWorkflow) => {
        const myStep = wf.steps?.find((s) => s.status === 'PENDING');
        if (!myStep) return <span className="text-xs text-kms-slate-400">No pending step</span>;
        return (
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              icon={decidingId === wf.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
              onClick={() => setDecideModalStep({ workflowId: wf.id, stepId: myStep.id, decision: 'APPROVED' })}
              disabled={decidingId === wf.id}
            >
              Approve
            </Button>
            <Button
              variant="ghost"
              size="sm"
              icon={<XCircle className="w-3.5 h-3.5 text-red-600" />}
              onClick={() => setDecideModalStep({ workflowId: wf.id, stepId: myStep.id, decision: 'REJECTED' })}
              disabled={decidingId === wf.id}
            >
              Reject
            </Button>
          </div>
        );
      },
    },
  ];

  const isContributorOrOwner = roles.includes('ROLE_CONTENT_OWNER') || roles.includes('ROLE_ADMIN') || roles.includes('ROLE_COMPLIANCE_OFFICER');

  return (
    <AppShell>
      <div className="space-y-5">
        <div className="flex items-center justify-between border-b border-kms-slate-200 pb-3">
          <div>
            <Breadcrumb items={[{ label: 'Workflow' }, { label: 'Approval Inbox' }]} />
            <h1 className="text-xl font-bold text-kms-slate-900 tracking-tight flex items-center gap-2">
              <GitPullRequestArrow className="w-5 h-5 text-blue-700" />
              Approval Inbox
            </h1>
            <p className="text-[11px] text-kms-slate-500 mt-1">
              Review and approve/reject documents submitted to approval workflows (FR-25).
            </p>
          </div>
        </div>

        {actionMessage && (
          <div className="p-3 bg-blue-50 border border-blue-200 text-blue-900 text-xs rounded flex items-center justify-between">
            <div className="flex items-center gap-2 font-medium">
              <CheckCircle2 className="w-4 h-4 text-blue-700" />
              <span>{actionMessage}</span>
            </div>
            <button onClick={() => setActionMessage(null)} className="text-blue-700 font-bold hover:underline">
              Dismiss
            </button>
          </div>
        )}

        {isLoading && <LoadingState message="Loading pending approvals..." />}
        {error && <ErrorState title="Failed to load approvals" message={error} onRetry={loadApprovals} />}

        {!isLoading && !error && (
          <>
            {approvals.length === 0 ? (
              <EmptyState
                title="No pending approvals"
                message="There are no documents awaiting your review at this time."
              />
            ) : (
              <Table
                columns={columns}
                data={approvals}
                keyExtractor={(item) => item.id}
                emptyText="No pending approvals."
              />
            )}
          </>
        )}

        {/* Decide Modal */}
        {decideModalStep && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setDecideModalStep(null)}>
            <div className="bg-white rounded-lg p-5 shadow-xl max-w-sm w-full space-y-4" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-sm font-bold text-kms-slate-900 flex items-center gap-2">
                {decideModalStep.decision === 'APPROVED' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-600" />
                )}
                {decideModalStep.decision === 'APPROVED' ? 'Approve Document' : 'Reject Document'}
              </h3>
              <p className="text-xs text-kms-slate-600">
                Are you sure you want to {decideModalStep.decision === 'APPROVED' ? 'approve' : 'reject'} this document?
              </p>
              <div>
                <label className="block text-xs font-semibold text-kms-slate-700 mb-1">
                  Comments (optional)
                </label>
                <textarea
                  className="w-full px-3 py-2 text-xs border border-kms-slate-300 rounded focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  rows={3}
                  placeholder="Add any comments about your decision..."
                  value={decideComments}
                  onChange={(e) => setDecideComments(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setDecideModalStep(null)}>Cancel</Button>
                <Button
                  variant={decideModalStep.decision === 'APPROVED' ? 'primary' : 'danger'}
                  size="sm"
                  onClick={handleDecide}
                  disabled={decidingId === decideModalStep.workflowId}
                >
                  {decidingId === decideModalStep.workflowId ? 'Processing...' : decideModalStep.decision === 'APPROVED' ? 'Confirm Approval' : 'Confirm Rejection'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
