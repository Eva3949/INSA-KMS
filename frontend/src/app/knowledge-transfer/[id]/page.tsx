'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { AppShell } from '@/src/components/layout/AppShell';
import { Breadcrumb } from '@/src/components/ui/Breadcrumb';
import { Button } from '@/src/components/ui/Button';
import { Modal } from '@/src/components/ui/Modal';
import { LoadingState } from '@/src/components/ui/States';
import { Badge } from '@/src/components/ui/Badge';
import { Alert } from '@/src/components/ui/Alert';
import { kmsApi } from '@/src/lib/api';
import {
  GitPullRequestArrow,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  UserCheck,
  Calendar,
  Save,
  Plus,
  ArrowLeft,
  ShieldCheck,
  Building,
  Users,
  CheckSquare,
  BookOpen,
  Video,
  MessageSquare,
  Check,
  X,
  FileCheck
} from 'lucide-react';

export default function KnowledgeTransferCaseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [caseData, setCaseData] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'plan' | 'checklist' | 'submissions' | 'sessions' | 'clearance'>('plan');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Plan State
  const [plan, setPlan] = useState<any>({
    responsibilities: '',
    projectsHandled: '',
    systemsMaintained: '',
    businessProcesses: '',
    criticalKnowledgeAreas: '',
    risks: '',
    requiredActions: '',
    notes: ''
  });
  const [isSavingPlan, setIsSavingPlan] = useState(false);

  // Successor modal
  const [isSuccessorModalOpen, setIsSuccessorModalOpen] = useState(false);
  const [selectedSuccessorId, setSelectedSuccessorId] = useState('');
  const [isAssigningSuccessor, setIsAssigningSuccessor] = useState(false);

  // Checklist Item Modal
  const [isAddChecklistModalOpen, setIsAddChecklistModalOpen] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('GENERAL');
  const [newItemNotes, setNewItemNotes] = useState('');
  const [isSavingChecklist, setIsSavingChecklist] = useState(false);

  // Knowledge Submission Modal
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [subCategory, setSubCategory] = useState('DAILY_ACTIVITIES');
  const [subTitle, setSubTitle] = useState('');
  const [subContent, setSubContent] = useState('');
  const [subDocId, setSubDocId] = useState('');
  const [isSubmittingKnowledge, setIsSubmittingKnowledge] = useState(false);

  // Review / Validate Submission Modal
  const [isValidateModalOpen, setIsValidateModalOpen] = useState(false);
  const [validatingSubId, setValidatingSubId] = useState<string | null>(null);
  const [valStatus, setValStatus] = useState<'APPROVED' | 'CHANGES_REQUESTED'>('APPROVED');
  const [valComments, setValComments] = useState('');
  const [isValidating, setIsValidating] = useState(false);

  // Session Modal
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
  const [sessionTitle, setSessionTitle] = useState('');
  const [sessionDate, setSessionDate] = useState('');
  const [sessionLocation, setSessionLocation] = useState('');
  const [sessionNotes, setSessionNotes] = useState('');
  const [sessionAttendees, setSessionAttendees] = useState<string[]>([]);
  const [isSavingSession, setIsSavingSession] = useState(false);

  // Exit Clearance Action
  const [isCompletingCase, setIsCompletingCase] = useState(false);

  const loadCase = useCallback(() => {
    if (!id) return;
    setIsLoading(true);
    kmsApi.knowledgeTransfer.getCase(id)
      .then((data) => {
        setCaseData(data);
        if (data.plan) {
          setPlan({
            responsibilities: data.plan.responsibilities || '',
            projectsHandled: data.plan.projectsHandled || '',
            systemsMaintained: data.plan.systemsMaintained || '',
            businessProcesses: data.plan.businessProcesses || '',
            criticalKnowledgeAreas: data.plan.criticalKnowledgeAreas || '',
            risks: data.plan.risks || '',
            requiredActions: data.plan.requiredActions || '',
            notes: data.plan.notes || ''
          });
        }
      })
      .catch((err) => setError(err.message || 'Failed to load case details'))
      .finally(() => setIsLoading(false));
  }, [id]);

  useEffect(() => {
    loadCase();
    kmsApi.admin.getUsers().then(setUsers).catch(() => {});
  }, [loadCase]);

  const handleSavePlan = async () => {
    setIsSavingPlan(true);
    setError(null);
    try {
      await kmsApi.knowledgeTransfer.savePlan(id, plan);
      setNotice('Knowledge Transfer Plan saved successfully.');
      loadCase();
    } catch (err: any) {
      setError(err.message || 'Failed to save plan');
    } finally {
      setIsSavingPlan(false);
    }
  };

  const handleAssignSuccessor = async () => {
    if (!selectedSuccessorId) return;
    setIsAssigningSuccessor(true);
    try {
      await kmsApi.knowledgeTransfer.assignSuccessor(id, selectedSuccessorId);
      setNotice('Successor assigned successfully.');
      setIsSuccessorModalOpen(false);
      loadCase();
    } catch (err: any) {
      setError(err.message || 'Failed to assign successor');
    } finally {
      setIsAssigningSuccessor(false);
    }
  };

  const handleUpdateChecklistStatus = async (itemId: string, newStatus: string) => {
    try {
      await kmsApi.knowledgeTransfer.updateChecklistItem(itemId, { status: newStatus });
      loadCase();
    } catch (err: any) {
      setError(err.message || 'Failed to update checklist item');
    }
  };

  const handleAddChecklist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;
    setIsSavingChecklist(true);
    try {
      await kmsApi.knowledgeTransfer.addChecklistItem(id, {
        itemName: newItemName.trim(),
        category: newItemCategory,
        notes: newItemNotes || undefined
      });
      setNotice('Checklist item added.');
      setIsAddChecklistModalOpen(false);
      setNewItemName('');
      setNewItemNotes('');
      loadCase();
    } catch (err: any) {
      setError(err.message || 'Failed to add checklist item');
    } finally {
      setIsSavingChecklist(false);
    }
  };

  const handleSubmitKnowledge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subTitle.trim() || !subContent.trim()) {
      setError('Title and Content are required.');
      return;
    }
    setIsSubmittingKnowledge(true);
    try {
      await kmsApi.knowledgeTransfer.submitKnowledge(id, {
        title: subTitle.trim(),
        content: subContent.trim(),
        category: subCategory,
        documentId: subDocId || undefined
      });
      setNotice('Knowledge submission recorded.');
      setIsSubmitModalOpen(false);
      setSubTitle('');
      setSubContent('');
      setSubDocId('');
      loadCase();
    } catch (err: any) {
      setError(err.message || 'Failed to submit knowledge');
    } finally {
      setIsSubmittingKnowledge(false);
    }
  };

  const handleValidateKnowledge = async () => {
    if (!validatingSubId) return;
    setIsValidating(true);
    try {
      await kmsApi.knowledgeTransfer.validateKnowledge(validatingSubId, {
        status: valStatus,
        reviewComments: valComments || undefined
      });
      setNotice(`Knowledge submission marked as ${valStatus}.`);
      setIsValidateModalOpen(false);
      setValidatingSubId(null);
      setValComments('');
      loadCase();
    } catch (err: any) {
      setError(err.message || 'Failed to validate submission');
    } finally {
      setIsValidating(false);
    }
  };

  const handleScheduleSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionTitle.trim() || !sessionDate) {
      setError('Title and Scheduled Date/Time are required.');
      return;
    }
    setIsSavingSession(true);
    try {
      await kmsApi.knowledgeTransfer.scheduleSession(id, {
        title: sessionTitle.trim(),
        scheduledAt: new Date(sessionDate).toISOString(),
        locationOrLink: sessionLocation || undefined,
        meetingNotes: sessionNotes || undefined,
        attendeeIds: sessionAttendees
      });
      setNotice('Knowledge Transfer Session scheduled.');
      setIsSessionModalOpen(false);
      setSessionTitle('');
      setSessionDate('');
      setSessionLocation('');
      setSessionNotes('');
      setSessionAttendees([]);
      loadCase();
    } catch (err: any) {
      setError(err.message || 'Failed to schedule session');
    } finally {
      setIsSavingSession(false);
    }
  };

  const handleCompleteCase = async () => {
    if (!confirm('Are you sure you want to mark this Knowledge Transfer case as completed and issue final exit clearance?')) return;
    setIsCompletingCase(true);
    setError(null);
    try {
      await kmsApi.knowledgeTransfer.completeTransfer(id, { notes: 'Completed via workspace clearance' });
      setNotice('Knowledge Transfer Case successfully completed and cleared!');
      loadCase();
    } catch (err: any) {
      setError(err.message || 'Failed to complete transfer case');
    } finally {
      setIsCompletingCase(false);
    }
  };

  if (isLoading || !caseData) {
    return (
      <AppShell>
        <div className="p-12"><LoadingState message="Loading knowledge transfer workspace..." /></div>
      </AppShell>
    );
  }

  const clearance = caseData.clearance || {};
  const isReadyForClearance = Boolean(clearance.isReadyForClearance);
  const blockers: string[] = clearance.blockers || [];

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <Breadcrumb items={[
              { label: 'Home', href: '/' },
              { label: 'Knowledge Transfer', href: '/knowledge-transfer' },
              { label: caseData.title }
            ]} />
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-1">
              <Link href="/knowledge-transfer" className="text-gray-400 hover:text-gray-600">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
                {caseData.title}
              </h1>
              <Badge
                label={caseData.status}
                variant={caseData.status === 'COMPLETED' ? 'green' : caseData.status === 'IN_PROGRESS' ? 'blue' : 'slate'}
              />
              <Badge
                label={caseData.priority}
                variant={caseData.priority === 'CRITICAL' ? 'red' : caseData.priority === 'HIGH' ? 'amber' : 'slate'}
              />
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Reason: <span className="font-medium text-gray-700">{caseData.reasonType}</span> • Department: <span className="font-medium text-gray-700">{caseData.department?.name || '—'}</span> • Expected Date: <span className="font-medium text-gray-700">{caseData.expectedCompletionDate || 'Not specified'}</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            {caseData.clearanceStatus === 'CLEARED' ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                <ShieldCheck className="w-4 h-4" /> Exit Cleared
              </span>
            ) : (
              <Button
                variant="primary"
                disabled={isCompletingCase || !isReadyForClearance}
                onClick={handleCompleteCase}
                className={`flex items-center gap-2 ${isReadyForClearance ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-gray-400 cursor-not-allowed'}`}
              >
                <CheckCircle2 className="w-4 h-4" />
                {isCompletingCase ? 'Processing...' : 'Complete & Issue Exit Clearance'}
              </Button>
            )}
          </div>
        </div>

        {/* Notices */}
        {notice && <Alert type="success">{notice}</Alert>}
        {error && <Alert type="error">{error}</Alert>}

        {/* Parties Card */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase">Source Knowledge Owner</p>
              <p className="text-sm font-bold text-gray-900 mt-0.5">{caseData.employee?.fullName || caseData.employee?.username}</p>
              <p className="text-xs text-gray-500">{caseData.employee?.jobTitle || caseData.employee?.email}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-lg">
              <UserCheck className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-500 uppercase">Successor / Receiver</p>
                <button
                  onClick={() => setIsSuccessorModalOpen(true)}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  {caseData.successor ? 'Change' : '+ Assign'}
                </button>
              </div>
              <p className="text-sm font-bold text-gray-900 mt-0.5">
                {caseData.successor ? (caseData.successor.fullName || caseData.successor.username) : <span className="text-amber-600 font-normal">Unassigned</span>}
              </p>
              <p className="text-xs text-gray-500">{caseData.successor?.jobTitle || caseData.successor?.email || 'Assign a successor to receive knowledge'}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-purple-50 text-purple-600 rounded-lg">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase">Manager & Oversight</p>
              <p className="text-sm font-bold text-gray-900 mt-0.5">{caseData.manager?.fullName || caseData.manager?.username || 'Department Head'}</p>
              <p className="text-xs text-gray-500">{caseData.manager?.email || 'Authorized SME review'}</p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 bg-white rounded-t-xl px-4 gap-6 text-sm font-medium">
          <button
            onClick={() => setActiveTab('plan')}
            className={`py-3.5 border-b-2 flex items-center gap-2 ${activeTab === 'plan' ? 'border-indigo-600 text-indigo-600 font-semibold' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            <BookOpen className="w-4 h-4" /> Transfer Plan
          </button>
          <button
            onClick={() => setActiveTab('checklist')}
            className={`py-3.5 border-b-2 flex items-center gap-2 ${activeTab === 'checklist' ? 'border-indigo-600 text-indigo-600 font-semibold' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            <CheckSquare className="w-4 h-4" /> Checklist ({caseData.checklist?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('submissions')}
            className={`py-3.5 border-b-2 flex items-center gap-2 ${activeTab === 'submissions' ? 'border-indigo-600 text-indigo-600 font-semibold' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            <FileText className="w-4 h-4" /> Knowledge Submissions ({caseData.submissions?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('sessions')}
            className={`py-3.5 border-b-2 flex items-center gap-2 ${activeTab === 'sessions' ? 'border-indigo-600 text-indigo-600 font-semibold' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            <Video className="w-4 h-4" /> Handover Sessions ({caseData.sessions?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('clearance')}
            className={`py-3.5 border-b-2 flex items-center gap-2 ${activeTab === 'clearance' ? 'border-indigo-600 text-indigo-600 font-semibold' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            <ShieldCheck className="w-4 h-4" /> Exit Clearance
            {blockers.length > 0 && (
              <span className="bg-amber-100 text-amber-800 text-xs px-1.5 py-0.5 rounded-full font-bold">
                {blockers.length}
              </span>
            )}
          </button>
        </div>

        {/* Tab 1: Transfer Plan */}
        {activeTab === 'plan' && (
          <div className="bg-white p-6 rounded-b-xl border border-t-0 border-gray-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-900">Knowledge Transfer Plan</h3>
                <p className="text-xs text-gray-500">Define critical operational responsibilities, systems, processes, risks, and required actions.</p>
              </div>
              <Button
                variant="primary"
                onClick={handleSavePlan}
                disabled={isSavingPlan}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700"
              >
                <Save className="w-4 h-4" />
                {isSavingPlan ? 'Saving...' : 'Save Plan'}
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Key Responsibilities</label>
                <textarea
                  rows={4}
                  placeholder="Primary duties, ongoing operations, and day-to-day responsibilities..."
                  value={plan.responsibilities}
                  onChange={(e) => setPlan({ ...plan, responsibilities: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Projects Handled</label>
                <textarea
                  rows={4}
                  placeholder="Active projects, deliverables, milestones, and pending milestones..."
                  value={plan.projectsHandled}
                  onChange={(e) => setPlan({ ...plan, projectsHandled: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Systems & Tools Maintained</label>
                <textarea
                  rows={4}
                  placeholder="Software, databases, servers, credentials access, configurations..."
                  value={plan.systemsMaintained}
                  onChange={(e) => setPlan({ ...plan, systemsMaintained: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Critical Business Processes</label>
                <textarea
                  rows={4}
                  placeholder="Core workflows, decision trees, approvals, and regulatory steps..."
                  value={plan.businessProcesses}
                  onChange={(e) => setPlan({ ...plan, businessProcesses: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Critical Knowledge Areas</label>
                <textarea
                  rows={4}
                  placeholder="Domain expertise, key vendor contacts, architectural nuances..."
                  value={plan.criticalKnowledgeAreas}
                  onChange={(e) => setPlan({ ...plan, criticalKnowledgeAreas: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Risks & Contingencies</label>
                <textarea
                  rows={4}
                  placeholder="Operational risks of transition, single-point-of-failure areas, mitigations..."
                  value={plan.risks}
                  onChange={(e) => setPlan({ ...plan, risks: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Required Actions & Immediate Next Steps</label>
              <textarea
                rows={3}
                placeholder="Immediate actions required by successor before completion..."
                value={plan.requiredActions}
                onChange={(e) => setPlan({ ...plan, requiredActions: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        )}

        {/* Tab 2: Checklist */}
        {activeTab === 'checklist' && (
          <div className="bg-white p-6 rounded-b-xl border border-t-0 border-gray-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-900">Handover Checklist</h3>
                <p className="text-xs text-gray-500">Every item must be marked Completed or Not Applicable prior to exit clearance.</p>
              </div>
              <Button
                variant="secondary"
                onClick={() => setIsAddChecklistModalOpen(true)}
                className="flex items-center gap-1.5 text-xs"
              >
                <Plus className="w-4 h-4" /> Add Item
              </Button>
            </div>

            <div className="divide-y divide-gray-200 border border-gray-200 rounded-lg overflow-hidden">
              {(caseData.checklist || []).map((item: any) => (
                <div key={item.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-gray-50">
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 p-1.5 rounded-full ${item.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' : item.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                      {item.status === 'COMPLETED' ? <Check className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                    </div>
                    <div>
                      <p className={`text-sm font-semibold ${item.status === 'COMPLETED' ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                        {item.itemName}
                      </p>
                      <p className="text-xs text-gray-500">
                        Category: <span className="font-medium">{item.category}</span>
                        {item.completedAt && ` • Completed ${new Date(item.completedAt).toLocaleDateString()}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <select
                      value={item.status}
                      onChange={(e) => handleUpdateChecklistStatus(item.id, e.target.value)}
                      className={`text-xs font-semibold rounded-lg px-2.5 py-1.5 border ${
                        item.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' :
                        item.status === 'IN_PROGRESS' ? 'bg-blue-50 text-blue-800 border-blue-300' :
                        item.status === 'NOT_APPLICABLE' ? 'bg-gray-100 text-gray-600 border-gray-300' :
                        'bg-amber-50 text-amber-800 border-amber-300'
                      }`}
                    >
                      <option value="PENDING">Pending</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="COMPLETED">Completed</option>
                      <option value="NOT_APPLICABLE">Not Applicable</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Knowledge Submissions */}
        {activeTab === 'submissions' && (
          <div className="bg-white p-6 rounded-b-xl border border-t-0 border-gray-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-900">Knowledge Submissions & Procedures</h3>
                <p className="text-xs text-gray-500">Document operational procedures, system notes, lessons learned, and troubleshooting steps.</p>
              </div>
              <Button
                variant="primary"
                onClick={() => setIsSubmitModalOpen(true)}
                className="flex items-center gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700"
              >
                <Plus className="w-4 h-4" /> Submit Knowledge
              </Button>
            </div>

            {(caseData.submissions || []).length === 0 ? (
              <div className="p-8 text-center border-2 border-dashed border-gray-200 rounded-lg">
                <FileText className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-gray-700">No knowledge items submitted yet</p>
                <p className="text-xs text-gray-500 mt-0.5">Click &quot;Submit Knowledge&quot; to capture process details, credentials pointers, or lessons learned.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {(caseData.submissions || []).map((sub: any) => (
                  <div key={sub.id} className="p-5 border border-gray-200 rounded-xl bg-gray-50/50 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-base font-bold text-gray-900">{sub.title}</h4>
                          <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded font-semibold uppercase">
                            {sub.category}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Submitted by <span className="font-semibold text-gray-700">{sub.submittedBy?.fullName || sub.submittedBy?.username}</span> on {new Date(sub.createdAt).toLocaleString()}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {sub.validationStatus === 'APPROVED' ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-full border border-emerald-300">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Approved
                          </span>
                        ) : sub.validationStatus === 'CHANGES_REQUESTED' ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-800 bg-rose-100 px-2.5 py-1 rounded-full border border-rose-300">
                            <AlertTriangle className="w-3.5 h-3.5" /> Changes Requested
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-800 bg-amber-100 px-2.5 py-1 rounded-full border border-amber-300">
                            <Clock className="w-3.5 h-3.5" /> Awaiting Review
                          </span>
                        )}

                        <button
                          onClick={() => {
                            setValidatingSubId(sub.id);
                            setValStatus('APPROVED');
                            setValComments('');
                            setIsValidateModalOpen(true);
                          }}
                          className="text-xs bg-white border border-gray-300 hover:bg-gray-100 px-2.5 py-1 rounded font-semibold text-gray-700"
                        >
                          Review / Validate
                        </button>
                      </div>
                    </div>

                    <div className="bg-white p-4 rounded-lg border border-gray-200 text-sm text-gray-800 whitespace-pre-wrap">
                      {sub.content}
                    </div>

                    {sub.reviewComments && (
                      <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 text-xs text-amber-900">
                        <span className="font-bold">Reviewer Feedback ({sub.reviewedBy?.fullName || 'Manager'}):</span> {sub.reviewComments}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Handover Sessions */}
        {activeTab === 'sessions' && (
          <div className="bg-white p-6 rounded-b-xl border border-t-0 border-gray-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-900">Transfer & Walkthrough Sessions</h3>
                <p className="text-xs text-gray-500">Schedule walk-through meetings, track attendance, and link session recordings.</p>
              </div>
              <Button
                variant="primary"
                onClick={() => setIsSessionModalOpen(true)}
                className="flex items-center gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700"
              >
                <Plus className="w-4 h-4" /> Schedule Session
              </Button>
            </div>

            {(caseData.sessions || []).length === 0 ? (
              <div className="p-8 text-center border-2 border-dashed border-gray-200 rounded-lg">
                <Video className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-gray-700">No transfer sessions scheduled</p>
                <p className="text-xs text-gray-500 mt-0.5">Schedule a live walkthrough session between the outgoing employee and successor.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {(caseData.sessions || []).map((s: any) => (
                  <div key={s.id} className="p-5 border border-gray-200 rounded-xl bg-gray-50/50 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h4 className="text-base font-bold text-gray-900">{s.title}</h4>
                        <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-gray-400" />
                          {new Date(s.scheduledAt).toLocaleString()}
                          {s.locationOrLink && ` • ${s.locationOrLink}`}
                        </p>
                      </div>

                      <Badge
                        label={s.status}
                        variant={s.status === 'COMPLETED' ? 'green' : 'blue'}
                      />
                    </div>

                    {s.meetingNotes && (
                      <div className="bg-white p-3 rounded-lg border border-gray-200 text-xs text-gray-700 whitespace-pre-wrap">
                        <span className="font-semibold text-gray-900 block mb-1">Meeting Notes:</span>
                        {s.meetingNotes}
                      </div>
                    )}

                    {s.attendees && s.attendees.length > 0 && (
                      <div className="pt-2">
                        <p className="text-xs font-semibold text-gray-600 mb-1.5">Participants & Attendance:</p>
                        <div className="flex flex-wrap gap-2">
                          {s.attendees.map((att: any) => (
                            <span key={att.id} className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border ${att.attended ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-gray-100 text-gray-700 border-gray-300'}`}>
                              {att.attended ? <Check className="w-3 h-3 text-emerald-600" /> : <Clock className="w-3 h-3 text-gray-400" />}
                              {att.fullName || att.username}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 5: Exit Clearance */}
        {activeTab === 'clearance' && (
          <div className="bg-white p-6 rounded-b-xl border border-t-0 border-gray-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-900">Exit Clearance & Readiness Scorecard</h3>
                <p className="text-xs text-gray-500">Full verification of required deliverables before completing exit handover.</p>
              </div>

              {caseData.clearanceStatus === 'CLEARED' ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  <ShieldCheck className="w-4 h-4" /> Cleared & Completed
                </span>
              ) : (
                <Button
                  variant="primary"
                  disabled={isCompletingCase || !isReadyForClearance}
                  onClick={handleCompleteCase}
                  className={`flex items-center gap-2 ${isReadyForClearance ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-gray-400 cursor-not-allowed'}`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {isCompletingCase ? 'Processing...' : 'Complete & Issue Exit Clearance'}
                </Button>
              )}
            </div>

            {/* Blockers alert if not ready */}
            {!isReadyForClearance && blockers.length > 0 && (
              <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 text-sm text-amber-900 space-y-2">
                <div className="flex items-center gap-2 font-bold text-amber-950">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                  Cannot complete exit clearance — the following items remain outstanding:
                </div>
                <ul className="list-disc list-inside space-y-1 text-xs text-amber-800 pl-2">
                  {blockers.map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              </div>
            )}

            {isReadyForClearance && caseData.clearanceStatus !== 'CLEARED' && (
              <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-4 text-sm text-emerald-900 flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0" />
                <div>
                  <p className="font-bold text-emerald-950">Ready for Exit Clearance!</p>
                  <p className="text-xs text-emerald-800">All mandatory checklist items are completed, knowledge submissions approved, and successor assigned.</p>
                </div>
              </div>
            )}

            {/* Metrics Breakdown Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/50">
                <p className="text-xs font-semibold text-gray-500 uppercase">Checklist Progress</p>
                <p className="text-xl font-bold text-gray-900 mt-1">
                  {clearance.completedChecklistItems || 0} / {clearance.totalChecklistItems || 0}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">{clearance.pendingChecklistItems || 0} pending items</p>
              </div>

              <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/50">
                <p className="text-xs font-semibold text-gray-500 uppercase">Approved Submissions</p>
                <p className="text-xl font-bold text-gray-900 mt-1">
                  {clearance.approvedSubmissions || 0} / {clearance.totalSubmissions || 0}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">{clearance.unapprovedSubmissions || 0} awaiting approval</p>
              </div>

              <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/50">
                <p className="text-xs font-semibold text-gray-500 uppercase">Sessions Completed</p>
                <p className="text-xl font-bold text-gray-900 mt-1">
                  {clearance.completedSessions || 0} / {clearance.totalSessions || 0}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">{clearance.pendingSessions || 0} scheduled</p>
              </div>

              <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/50">
                <p className="text-xs font-semibold text-gray-500 uppercase">Successor Assigned</p>
                <p className="text-xl font-bold text-gray-900 mt-1">
                  {clearance.hasSuccessor ? 'Yes' : 'No'}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">{caseData.successor?.fullName || 'Not assigned'}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Assign Successor Modal */}
      {isSuccessorModalOpen && (
        <Modal
          isOpen={isSuccessorModalOpen}
          onClose={() => setIsSuccessorModalOpen(false)}
          title="Assign Successor / Knowledge Receiver"
        >
          <div className="space-y-4">
            <p className="text-xs text-gray-500">
              Select an active KMS user to receive operational knowledge and assume responsibilities.
            </p>
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Successor User</label>
              <select
                value={selectedSuccessorId}
                onChange={(e) => setSelectedSuccessorId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select User...</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.fullName || u.username} ({u.username}) - {u.roleName}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-gray-200">
              <Button variant="secondary" onClick={() => setIsSuccessorModalOpen(false)}>Cancel</Button>
              <Button variant="primary" onClick={handleAssignSuccessor} disabled={!selectedSuccessorId || isAssigningSuccessor} className="bg-indigo-600 hover:bg-indigo-700">
                {isAssigningSuccessor ? 'Assigning...' : 'Confirm Assignment'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Add Checklist Modal */}
      {isAddChecklistModalOpen && (
        <Modal
          isOpen={isAddChecklistModalOpen}
          onClose={() => setIsAddChecklistModalOpen(false)}
          title="Add Custom Checklist Item"
        >
          <form onSubmit={handleAddChecklist} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Item Description <span className="text-red-500">*</span></label>
              <input
                type="text"
                required
                placeholder="e.g. Handover database replication keys"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Category</label>
              <select
                value={newItemCategory}
                onChange={(e) => setNewItemCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
              >
                <option value="GENERAL">General</option>
                <option value="DOCUMENTS">Documents</option>
                <option value="SYSTEMS">Systems & Tools</option>
                <option value="TRAINING">Training</option>
                <option value="ACCESS">Access & Credentials</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Notes / Instructions</label>
              <textarea
                rows={2}
                value={newItemNotes}
                onChange={(e) => setNewItemNotes(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-gray-200">
              <Button variant="secondary" type="button" onClick={() => setIsAddChecklistModalOpen(false)}>Cancel</Button>
              <Button variant="primary" type="submit" disabled={isSavingChecklist} className="bg-indigo-600 hover:bg-indigo-700">
                {isSavingChecklist ? 'Adding...' : 'Add Item'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Submit Knowledge Modal */}
      {isSubmitModalOpen && (
        <Modal
          isOpen={isSubmitModalOpen}
          onClose={() => setIsSubmitModalOpen(false)}
          title="Submit Knowledge Item"
        >
          <form onSubmit={handleSubmitKnowledge} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Category <span className="text-red-500">*</span></label>
              <select
                value={subCategory}
                onChange={(e) => setSubCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
              >
                <option value="DAILY_ACTIVITIES">Daily Activities & Routines</option>
                <option value="BUSINESS_PROCESSES">Business Processes & Workflows</option>
                <option value="SYSTEM_KNOWLEDGE">System Knowledge & Architectures</option>
                <option value="TROUBLESHOOTING_PROCEDURES">Troubleshooting & Incident Procedures</option>
                <option value="IMPORTANT_CONTACTS">Important Vendor & Key Contacts</option>
                <option value="LESSONS_LEARNED">Lessons Learned & Best Practices</option>
                <option value="ADDITIONAL_NOTES">Additional Notes & Resources</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Title <span className="text-red-500">*</span></label>
              <input
                type="text"
                required
                placeholder="e.g. Core Infrastructure Deployment Procedure"
                value={subTitle}
                onChange={(e) => setSubTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Detailed Content <span className="text-red-500">*</span></label>
              <textarea
                rows={6}
                required
                placeholder="Provide step-by-step instructions, references, configuration details, and nuances..."
                value={subContent}
                onChange={(e) => setSubContent(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 font-mono text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-200">
              <Button variant="secondary" type="button" onClick={() => setIsSubmitModalOpen(false)}>Cancel</Button>
              <Button variant="primary" type="submit" disabled={isSubmittingKnowledge} className="bg-indigo-600 hover:bg-indigo-700">
                {isSubmittingKnowledge ? 'Submitting...' : 'Submit Knowledge'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Validate Knowledge Modal */}
      {isValidateModalOpen && (
        <Modal
          isOpen={isValidateModalOpen}
          onClose={() => setIsValidateModalOpen(false)}
          title="Review & Validate Knowledge Submission"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Decision</label>
              <select
                value={valStatus}
                onChange={(e) => setValStatus(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
              >
                <option value="APPROVED">Approve Knowledge</option>
                <option value="CHANGES_REQUESTED">Request Changes / Clarifications</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Review Comments</label>
              <textarea
                rows={3}
                placeholder="Feedback or specific questions for the submitter..."
                value={valComments}
                onChange={(e) => setValComments(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-200">
              <Button variant="secondary" onClick={() => setIsValidateModalOpen(false)}>Cancel</Button>
              <Button variant="primary" onClick={handleValidateKnowledge} disabled={isValidating} className="bg-indigo-600 hover:bg-indigo-700">
                {isValidating ? 'Submitting...' : 'Save Decision'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Schedule Session Modal */}
      {isSessionModalOpen && (
        <Modal
          isOpen={isSessionModalOpen}
          onClose={() => setIsSessionModalOpen(false)}
          title="Schedule Knowledge Transfer Session"
        >
          <form onSubmit={handleScheduleSession} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Session Title <span className="text-red-500">*</span></label>
              <input
                type="text"
                required
                placeholder="e.g. Database & Backup Architecture Walkthrough"
                value={sessionTitle}
                onChange={(e) => setSessionTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Date & Time <span className="text-red-500">*</span></label>
                <input
                  type="datetime-local"
                  required
                  value={sessionDate}
                  onChange={(e) => setSessionDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Location / Meeting Link</label>
                <input
                  type="text"
                  placeholder="e.g. Conference Room A / Teams Link"
                  value={sessionLocation}
                  onChange={(e) => setSessionLocation(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Invite Participants</label>
              <select
                multiple
                value={sessionAttendees}
                onChange={(e) => {
                  const opts = Array.from(e.target.selectedOptions, (o) => o.value);
                  setSessionAttendees(opts);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 h-28"
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.fullName || u.username} ({u.username})
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-gray-400 mt-1">Hold Ctrl (Windows) or Cmd (Mac) to select multiple attendees.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Meeting Agenda / Notes</label>
              <textarea
                rows={2}
                value={sessionNotes}
                onChange={(e) => setSessionNotes(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-200">
              <Button variant="secondary" type="button" onClick={() => setIsSessionModalOpen(false)}>Cancel</Button>
              <Button variant="primary" type="submit" disabled={isSavingSession} className="bg-indigo-600 hover:bg-indigo-700">
                {isSavingSession ? 'Scheduling...' : 'Schedule Session'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </AppShell>
  );
}
