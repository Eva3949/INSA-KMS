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
import { useAuth } from '@/src/lib/auth-context';
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
  Check,
  X,
  Laptop,
  Key,
  Download,
  ExternalLink,
  Trash2,
  Edit3,
  RefreshCw,
  History,
  Layers,
  Briefcase,
  Wrench,
  Send,
  UserX
} from 'lucide-react';

export default function KnowledgeTransferCaseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const { user, roles } = useAuth();
  const isViewerOnly = roles.includes('ROLE_VIEWER') && !roles.some(r =>
    ['ROLE_SUPER_ADMIN', 'ROLE_ADMIN', 'ROLE_CONTENT_OWNER', 'ROLE_CONTRIBUTOR', 'ROLE_COMPLIANCE_OFFICER', 'ROLE_IT_SECURITY'].includes(r)
  );

  const [caseData, setCaseData] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    'overview' | 'plan' | 'inventory' | 'documents' | 'assets' | 'access' | 'checklist' | 'submissions' | 'sessions' | 'reviews' | 'clearance'
  >('overview');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Additional data state
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [caseDocuments, setCaseDocuments] = useState<any[]>([]);
  const [employeeDocuments, setEmployeeDocuments] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [accessReviews, setAccessReviews] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [clearanceData, setClearanceData] = useState<any>(null);

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

  // Inventory Filter & Modal
  const [invFilterCategory, setInvFilterCategory] = useState('ALL');
  const [isInventoryModalOpen, setIsInventoryModalOpen] = useState(false);
  const [invCategory, setInvCategory] = useState('RESPONSIBILITIES');
  const [invTitle, setInvTitle] = useState('');
  const [invDescription, setInvDescription] = useState('');
  const [invCriticality, setInvCriticality] = useState('MEDIUM');
  const [invNotes, setInvNotes] = useState('');
  const [isSavingInventory, setIsSavingInventory] = useState(false);

  // Document Handover Modal
  const [isAttachDocModalOpen, setIsAttachDocModalOpen] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState('');
  const [docTransferAction, setDocTransferAction] = useState('REFERENCE');
  const [docNotes, setDocNotes] = useState('');
  const [isAttachingDoc, setIsAttachingDoc] = useState(false);
  const [selectedDocsBatchMap, setSelectedDocsBatchMap] = useState<Record<string, { selected: boolean; transferAction: string; notes?: string }>>({});

  // Helper to get eligible documents (authored by departing employee, not yet attached)
  const eligibleEmployeeDocs = employeeDocuments.filter(
    (ed) => !caseDocuments.some((cd) => cd.documentId === ed.id || cd.document?.id === ed.id)
  );

  const handleSelectAllAttachDocs = () => {
    setSelectedDocsBatchMap((prev) => {
      const next = { ...prev };
      eligibleEmployeeDocs.forEach((d) => {
        next[d.id] = {
          selected: true,
          transferAction: next[d.id]?.transferAction || 'REFERENCE',
          notes: next[d.id]?.notes || '',
        };
      });
      return next;
    });
  };

  const handleClearAllAttachDocs = () => {
    setSelectedDocsBatchMap((prev) => {
      const next = { ...prev };
      eligibleEmployeeDocs.forEach((d) => {
        if (next[d.id]) {
          next[d.id] = { ...next[d.id], selected: false };
        }
      });
      return next;
    });
  };

  const handleToggleAttachDoc = (docId: string) => {
    setSelectedDocsBatchMap((prev) => ({
      ...prev,
      [docId]: {
        selected: !prev[docId]?.selected,
        transferAction: prev[docId]?.transferAction || 'REFERENCE',
        notes: prev[docId]?.notes || '',
      },
    }));
  };

  const handleAttachDocActionChange = (docId: string, action: string) => {
    setSelectedDocsBatchMap((prev) => ({
      ...prev,
      [docId]: {
        selected: prev[docId]?.selected ?? true,
        transferAction: action,
        notes: prev[docId]?.notes || '',
      },
    }));
  };

  // Asset Handover Modal
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [assetType, setAssetType] = useState('LAPTOP');
  const [assetIdentifier, setAssetIdentifier] = useState('');
  const [assetDescription, setAssetDescription] = useState('');
  const [assetCondition, setAssetCondition] = useState('GOOD');
  const [assetNotes, setAssetNotes] = useState('');
  const [isSavingAsset, setIsSavingAsset] = useState(false);

  // Access Review Modal
  const [isAccessModalOpen, setIsAccessModalOpen] = useState(false);
  const [accessSystem, setAccessSystem] = useState('');
  const [accessLevel, setAccessLevel] = useState('Read-Only');
  const [accessRevokeRequired, setAccessRevokeRequired] = useState(true);
  const [accessSuccessorAction, setAccessSuccessorAction] = useState('TRANSFER_TO_SUCCESSOR');
  const [accessNotes, setAccessNotes] = useState('');
  const [isSavingAccess, setIsSavingAccess] = useState(false);

  // Knowledge Submission Modal
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [subCategory, setSubCategory] = useState('DAILY_ACTIVITIES');
  const [subTitle, setSubTitle] = useState('');
  const [subContent, setSubContent] = useState('');
  const [subDocId, setSubDocId] = useState('');
  const [isSubmittingKnowledge, setIsSubmittingKnowledge] = useState(false);

  // In-place Resubmission Modal
  const [isEditSubModalOpen, setIsEditSubModalOpen] = useState(false);
  const [editingSubId, setEditingSubId] = useState<string | null>(null);
  const [editSubTitle, setEditSubTitle] = useState('');
  const [editSubContent, setEditSubContent] = useState('');
  const [editSubCategory, setEditSubCategory] = useState('DAILY_ACTIVITIES');
  const [isResubmitting, setIsResubmitting] = useState(false);

  // Review / Validate Submission Modal
  const [isValidateModalOpen, setIsValidateModalOpen] = useState(false);
  const [validatingSubId, setValidatingSubId] = useState<string | null>(null);
  const [valStatus, setValStatus] = useState<'APPROVED' | 'CHANGES_REQUESTED'>('APPROVED');
  const [valComments, setValComments] = useState('');
  const [isValidating, setIsValidating] = useState(false);

  // Review Modals (Manager, HR, Successor)
  const [isReviewDecisionModalOpen, setIsReviewDecisionModalOpen] = useState(false);
  const [reviewType, setReviewType] = useState<'MANAGER' | 'HR' | 'SUCCESSOR'>('MANAGER');
  const [reviewApproved, setReviewApproved] = useState(true);
  const [reviewComments, setReviewComments] = useState('');
  const [isSubmittingReviewDecision, setIsSubmittingReviewDecision] = useState(false);

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
  const [isSubmittingForReview, setIsSubmittingForReview] = useState(false);

  const loadCase = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const data = await kmsApi.knowledgeTransfer.getCase(id);
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

      // Concurrently load supplementary modules
      const [inv, docs, empDocs, ast, acc, clr, aud] = await Promise.allSettled([
        kmsApi.knowledgeTransfer.listInventory(id),
        kmsApi.knowledgeTransfer.listCaseDocuments(id),
        kmsApi.knowledgeTransfer.listEmployeeDocuments(id),
        kmsApi.knowledgeTransfer.listAssets(id),
        kmsApi.knowledgeTransfer.listAccessReviews(id),
        kmsApi.knowledgeTransfer.getClearance(id),
        kmsApi.knowledgeTransfer.getAuditLogs(id)
      ]);

      if (inv.status === 'fulfilled') setInventoryItems(inv.value || []);
      if (docs.status === 'fulfilled') setCaseDocuments(docs.value || []);
      if (empDocs.status === 'fulfilled') setEmployeeDocuments(empDocs.value || []);
      if (ast.status === 'fulfilled') setAssets(ast.value || []);
      if (acc.status === 'fulfilled') setAccessReviews(acc.value || []);
      if (clr.status === 'fulfilled') setClearanceData(clr.value || null);
      if (aud.status === 'fulfilled') setAuditLogs(aud.value || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load case details');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadCase();
    kmsApi.admin.getUsers().then(setUsers).catch(() => {});
  }, [loadCase]);

  // Plan Save
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

  // Assign Successor
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

  // Submit Case For Review
  const handleSubmitForReview = async () => {
    if (!confirm('Submit this Knowledge Transfer case for Manager and HR review?')) return;
    setIsSubmittingForReview(true);
    try {
      await kmsApi.knowledgeTransfer.submitForReview(id);
      setNotice('Case successfully submitted for Manager and HR review.');
      loadCase();
    } catch (err: any) {
      setError(err.message || 'Failed to submit case for review');
    } finally {
      setIsSubmittingForReview(false);
    }
  };

  // Checklist updates
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

  // Inventory CRUD
  const handleAddInventory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invTitle.trim() || !invDescription.trim()) return;
    setIsSavingInventory(true);
    try {
      await kmsApi.knowledgeTransfer.addInventoryItem(id, {
        category: invCategory,
        title: invTitle.trim(),
        description: invDescription.trim(),
        criticality: invCriticality,
        notes: invNotes || undefined
      });
      setNotice('Inventory item added successfully.');
      setIsInventoryModalOpen(false);
      setInvTitle('');
      setInvDescription('');
      setInvNotes('');
      loadCase();
    } catch (err: any) {
      setError(err.message || 'Failed to add inventory item');
    } finally {
      setIsSavingInventory(false);
    }
  };

  const handleDeleteInventory = async (itemId: string) => {
    if (!confirm('Are you sure you want to remove this inventory item?')) return;
    try {
      await kmsApi.knowledgeTransfer.deleteInventoryItem(itemId);
      setNotice('Inventory item removed.');
      loadCase();
    } catch (err: any) {
      setError(err.message || 'Failed to delete inventory item');
    }
  };

  // Document Handover
  const handleAttachDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    const selectedList = Object.entries(selectedDocsBatchMap)
      .filter(([_, v]) => v.selected)
      .map(([docId, v]) => ({
        documentId: docId,
        transferAction: v.transferAction || 'REFERENCE',
        notes: v.notes || docNotes || undefined,
      }));

    if (selectedList.length === 0 && selectedDocId.trim()) {
      selectedList.push({
        documentId: selectedDocId.trim(),
        transferAction: docTransferAction || 'REFERENCE',
        notes: docNotes || undefined,
      });
    }

    if (selectedList.length === 0) {
      setError('Please select at least one document or specify a Document UUID');
      return;
    }

    setIsAttachingDoc(true);
    try {
      if (selectedList.length === 1) {
        await kmsApi.knowledgeTransfer.attachDocument(id, {
          documentId: selectedList[0].documentId,
          transferAction: selectedList[0].transferAction,
          notes: selectedList[0].notes,
        });
      } else {
        await kmsApi.knowledgeTransfer.attachDocumentsBatch(id, selectedList);
      }
      setNotice(`Successfully attached ${selectedList.length} document(s) to handover case.`);
      setIsAttachDocModalOpen(false);
      setSelectedDocId('');
      setDocNotes('');
      setSelectedDocsBatchMap({});
      loadCase();
    } catch (err: any) {
      setError(err.message || 'Failed to attach document(s)');
    } finally {
      setIsAttachingDoc(false);
    }
  };

  const handleDetachDocument = async (docId: string) => {
    if (!confirm('Detach this document from the handover case?')) return;
    try {
      await kmsApi.knowledgeTransfer.detachDocument(id, docId);
      setNotice('Document detached.');
      loadCase();
    } catch (err: any) {
      setError(err.message || 'Failed to detach document');
    }
  };

  // Assets CRUD
  const handleAddAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetIdentifier.trim() || !assetDescription.trim()) return;
    setIsSavingAsset(true);
    try {
      await kmsApi.knowledgeTransfer.addAsset(id, {
        assetType,
        assetIdentifier: assetIdentifier.trim(),
        description: assetDescription.trim(),
        conditionStatus: assetCondition,
        notes: assetNotes || undefined
      });
      setNotice('Asset registered for exit handover.');
      setIsAssetModalOpen(false);
      setAssetIdentifier('');
      setAssetDescription('');
      setAssetNotes('');
      loadCase();
    } catch (err: any) {
      setError(err.message || 'Failed to register asset');
    } finally {
      setIsSavingAsset(false);
    }
  };

  const handleUpdateAssetStatus = async (assetId: string, returnStatus: string) => {
    try {
      await kmsApi.knowledgeTransfer.updateAsset(assetId, { returnStatus });
      setNotice(`Asset return status updated to ${returnStatus}.`);
      loadCase();
    } catch (err: any) {
      setError(err.message || 'Failed to update asset status');
    }
  };

  // Access Reviews CRUD
  const handleAddAccessReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessSystem.trim()) return;
    setIsSavingAccess(true);
    try {
      await kmsApi.knowledgeTransfer.addAccessReview(id, {
        systemName: accessSystem.trim(),
        accessLevel,
        successorAction: accessSuccessorAction,
        revocationRequired: accessRevokeRequired,
        notes: accessNotes || undefined
      });
      setNotice('Access review item added.');
      setIsAccessModalOpen(false);
      setAccessSystem('');
      setAccessNotes('');
      loadCase();
    } catch (err: any) {
      setError(err.message || 'Failed to add access review');
    } finally {
      setIsSavingAccess(false);
    }
  };

  const handleUpdateAccessStatus = async (reviewId: string, revocationStatus: string) => {
    try {
      await kmsApi.knowledgeTransfer.updateAccessReview(reviewId, { revocationStatus });
      setNotice(`Access status updated to ${revocationStatus}.`);
      loadCase();
    } catch (err: any) {
      setError(err.message || 'Failed to update access status');
    }
  };

  // Knowledge Submissions & In-place Resubmissions
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

  const handleResubmitKnowledge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSubId || !editSubTitle.trim() || !editSubContent.trim()) return;
    setIsResubmitting(true);
    try {
      await kmsApi.knowledgeTransfer.updateSubmission(editingSubId, {
        title: editSubTitle.trim(),
        content: editSubContent.trim(),
        category: editSubCategory
      });
      setNotice('Knowledge item updated and resubmitted for review.');
      setIsEditSubModalOpen(false);
      setEditingSubId(null);
      loadCase();
    } catch (err: any) {
      setError(err.message || 'Failed to resubmit knowledge');
    } finally {
      setIsResubmitting(false);
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
      setError(err.message || 'Failed to validate submission (Self-approval is strictly prohibited)');
    } finally {
      setIsValidating(false);
    }
  };

  // Sessions
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

  const handleToggleAttendance = async (sessionId: string, currentAttendees: any[], targetUserId: string) => {
    try {
      const updatedAttendedIds = currentAttendees
        .filter((a) => (a.userId === targetUserId ? !a.attended : a.attended))
        .map((a) => a.userId);
      await kmsApi.knowledgeTransfer.updateSession(sessionId, { attendedUserIds: updatedAttendedIds });
      loadCase();
    } catch (err: any) {
      setError(err.message || 'Failed to update attendance');
    }
  };

  // Multi-stage reviews
  const handleReviewDecisionSubmit = async () => {
    setIsSubmittingReviewDecision(true);
    try {
      if (reviewType === 'MANAGER') {
        await kmsApi.knowledgeTransfer.managerReview(id, { approved: reviewApproved, comments: reviewComments });
        setNotice(`Manager review recorded: ${reviewApproved ? 'Approved' : 'Changes Requested'}`);
      } else if (reviewType === 'HR') {
        await kmsApi.knowledgeTransfer.hrReview(id, { approved: reviewApproved, comments: reviewComments });
        setNotice(`HR review recorded: ${reviewApproved ? 'Approved' : 'Changes Requested'}`);
      } else if (reviewType === 'SUCCESSOR') {
        await kmsApi.knowledgeTransfer.successorAcceptance(id, { accepted: reviewApproved, notes: reviewComments });
        setNotice(`Successor acceptance recorded: ${reviewApproved ? 'Accepted' : 'Changes Requested'}`);
      }
      setIsReviewDecisionModalOpen(false);
      setReviewComments('');
      loadCase();
    } catch (err: any) {
      setError(err.message || 'Failed to submit review decision');
    } finally {
      setIsSubmittingReviewDecision(false);
    }
  };

  // Complete Transfer & Issue Exit Clearance
  const handleCompleteCase = async () => {
    if (!confirm('Are you sure you want to mark this Knowledge & Asset Transfer case as completed, issue final exit clearance, and revoke IAM access?')) return;
    setIsCompletingCase(true);
    setError(null);
    try {
      await kmsApi.knowledgeTransfer.completeTransfer(id, { notes: 'Completed via workspace clearance gate' });
      setNotice('Knowledge Transfer Case successfully completed! Exit clearance issued and IAM access revoked.');
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

  const clearance = clearanceData || caseData.clearance || {};
  const isReadyForClearance = Boolean(clearance.isReadyForClearance);
  const blockers: string[] = clearance.blockers || [];

  const isDesignatedSuccessor = Boolean(
    user && caseData?.successor && (
      (user.username && caseData.successor.username && user.username.toLowerCase() === caseData.successor.username.toLowerCase()) ||
      (user.id && caseData.successor.id && user.id === caseData.successor.id)
    )
  );

  const filteredInventory = invFilterCategory === 'ALL'
    ? inventoryItems
    : inventoryItems.filter((i) => i.category === invFilterCategory);

  return (
    <AppShell>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header Navigation */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <div>
            <Breadcrumb items={[
              { label: 'Home', href: '/' },
              { label: 'Knowledge Transfer', href: '/knowledge-transfer' },
              { label: caseData.title }
            ]} />
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-2">
              <Link href="/knowledge-transfer" className="text-gray-400 hover:text-gray-600 transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
                {caseData.title}
              </h1>
              <Badge
                label={caseData.status}
                variant={caseData.status === 'COMPLETED' ? 'green' : caseData.status === 'IN_PROGRESS' ? 'blue' : caseData.status === 'APPROVED' ? 'purple' : 'slate'}
              />
              <Badge
                label={caseData.priority}
                variant={caseData.priority === 'CRITICAL' ? 'red' : caseData.priority === 'HIGH' ? 'amber' : 'slate'}
              />
            </div>
            <p className="text-xs sm:text-sm text-gray-500 mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1">
              <span>Reason: <strong className="text-gray-700">{caseData.reasonType}</strong></span>
              <span>Department: <strong className="text-gray-700">{caseData.department?.name || caseData.employeeSnapshotDept || '—'}</strong></span>
              <span>Exit Date: <strong className="text-gray-700">{caseData.exitDate || caseData.expectedCompletionDate || 'Not specified'}</strong></span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {!isViewerOnly && caseData.status === 'IN_PROGRESS' && (
              <Button
                variant="secondary"
                disabled={isSubmittingForReview}
                onClick={handleSubmitForReview}
                className="flex items-center gap-2 text-xs font-semibold"
              >
                <Send className="w-4 h-4 text-indigo-600" />
                {isSubmittingForReview ? 'Submitting...' : 'Submit for Review'}
              </Button>
            )}

            {caseData.clearanceStatus === 'CLEARED' ? (
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-sm">
                <ShieldCheck className="w-5 h-5 text-emerald-600" /> Exit Cleared & Completed
              </span>
            ) : !isViewerOnly ? (
              <Button
                variant="primary"
                disabled={isCompletingCase || !isReadyForClearance}
                onClick={handleCompleteCase}
                className={`flex items-center gap-2 text-sm font-bold px-4 py-2 rounded-xl shadow-sm transition-all ${
                  isReadyForClearance
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed border border-gray-300'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                {isCompletingCase ? 'Clearing & Revoking IAM...' : 'Complete & Issue Exit Clearance'}
              </Button>
            ) : null}
          </div>
        </div>

        {/* Notices */}
        {notice && <Alert type="success">{notice}</Alert>}
        {error && <Alert type="error">{error}</Alert>}

        {/* Historical Employee Snapshot Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 rounded-2xl shadow-md border border-slate-800">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 px-2.5 py-0.5 rounded-full">
                  Employee Exit Record & Snapshot
                </span>
                {caseData.accessRevoked && (
                  <span className="text-[11px] font-bold uppercase tracking-wider bg-rose-500/30 text-rose-300 border border-rose-500/40 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <UserX className="w-3 h-3" /> IAM Access Revoked
                  </span>
                )}
              </div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                {caseData.employeeSnapshotName || caseData.employee?.fullName || caseData.employee?.username}
                <span className="text-xs font-normal text-indigo-300">({caseData.employeeSnapshotTitle || caseData.employee?.jobTitle || 'Staff Member'})</span>
              </h2>
              <p className="text-xs text-slate-300">
                Dept: <span className="font-semibold text-white">{caseData.employeeSnapshotDept || caseData.department?.name || '—'}</span> • Emp #: <span className="font-semibold text-white">{caseData.employeeSnapshotNumber || caseData.employee?.employeeNumber || '—'}</span> • Manager Snapshot: <span className="font-semibold text-white">{caseData.managerSnapshotName || caseData.manager?.fullName || '—'}</span>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4 bg-white/10 px-4 py-2.5 rounded-xl backdrop-blur-sm border border-white/10 text-xs">
              <div>
                <span className="text-slate-300 block">Checklist Items:</span>
                <span className="text-sm font-bold text-white">{clearance.completedChecklistItems || 0} / {clearance.totalChecklistItems || 0}</span>
              </div>
              <div className="h-6 w-px bg-white/20" />
              <div>
                <span className="text-slate-300 block">Submissions:</span>
                <span className="text-sm font-bold text-white">{clearance.approvedSubmissions || 0} / {clearance.totalSubmissions || 0}</span>
              </div>
              <div className="h-6 w-px bg-white/20" />
              <div>
                <span className="text-slate-300 block">Assets:</span>
                <span className="text-sm font-bold text-white">{assets.length} items</span>
              </div>
              <div className="h-6 w-px bg-white/20" />
              <div>
                <span className="text-slate-300 block">Readiness:</span>
                <span className={`text-sm font-bold ${isReadyForClearance ? 'text-emerald-400' : 'text-amber-300'}`}>
                  {isReadyForClearance ? 'Ready' : 'Pending'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Key Parties Card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-start gap-3 p-2">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase">Outgoing Employee</p>
              <p className="text-sm font-bold text-gray-900 mt-0.5">{caseData.employee?.fullName || caseData.employeeSnapshotName || caseData.employee?.username}</p>
              <p className="text-xs text-gray-500">{caseData.employee?.email || 'Active KMS User'}</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-2 border-t sm:border-t-0 sm:border-l border-gray-200">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
              <UserCheck className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-500 uppercase">Designated Successor</p>
                {!isViewerOnly && (
                  <button
                    onClick={() => setIsSuccessorModalOpen(true)}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-bold"
                  >
                    {caseData.successor ? 'Change' : '+ Assign'}
                  </button>
                )}
              </div>
              <p className="text-sm font-bold text-gray-900 mt-0.5">
                {caseData.successor ? (caseData.successor.fullName || caseData.successor.username) : <span className="text-amber-600 font-normal">Unassigned</span>}
              </p>
              <div className="mt-1 flex items-center gap-1.5">
                {caseData.successorAccepted ? (
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                    <Check className="w-3 h-3" /> Accepted
                  </span>
                ) : (
                  <span className="text-[11px] text-gray-500">Acceptance Pending</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3 p-2 border-t md:border-t-0 md:border-l border-gray-200">
            <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase">Oversight & Approvals</p>
              <p className="text-sm font-bold text-gray-900 mt-0.5">{caseData.manager?.fullName || caseData.managerSnapshotName || 'Department Manager'}</p>
              <div className="flex flex-wrap gap-1.5 mt-1">
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded border ${caseData.managerApproved ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                  Manager: {caseData.managerApproved ? 'Approved' : 'Pending'}
                </span>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded border ${caseData.hrApproved ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                  HR: {caseData.hrApproved ? 'Approved' : 'Pending'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation (10 Enterprise Tabs) */}
        <div className="flex overflow-x-auto border-b border-gray-200 bg-white rounded-t-2xl px-4 gap-4 text-xs font-bold scrollbar-none shadow-sm">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3.5 border-b-2 whitespace-nowrap flex items-center gap-2 ${activeTab === 'overview' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            <Layers className="w-4 h-4" /> Overview
          </button>
          <button
            onClick={() => setActiveTab('plan')}
            className={`py-3.5 border-b-2 whitespace-nowrap flex items-center gap-2 ${activeTab === 'plan' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            <BookOpen className="w-4 h-4" /> Transfer Plan
          </button>
          <button
            onClick={() => setActiveTab('inventory')}
            className={`py-3.5 border-b-2 whitespace-nowrap flex items-center gap-2 ${activeTab === 'inventory' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            <Briefcase className="w-4 h-4" /> Inventory ({inventoryItems.length})
          </button>
          <button
            onClick={() => setActiveTab('documents')}
            className={`py-3.5 border-b-2 whitespace-nowrap flex items-center gap-2 ${activeTab === 'documents' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            <FileText className="w-4 h-4" /> Documents ({caseDocuments.length})
          </button>
          <button
            onClick={() => setActiveTab('assets')}
            className={`py-3.5 border-b-2 whitespace-nowrap flex items-center gap-2 ${activeTab === 'assets' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            <Laptop className="w-4 h-4" /> Assets ({assets.length})
          </button>
          <button
            onClick={() => setActiveTab('access')}
            className={`py-3.5 border-b-2 whitespace-nowrap flex items-center gap-2 ${activeTab === 'access' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            <Key className="w-4 h-4" /> Access Review ({accessReviews.length})
          </button>
          <button
            onClick={() => setActiveTab('checklist')}
            className={`py-3.5 border-b-2 whitespace-nowrap flex items-center gap-2 ${activeTab === 'checklist' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            <CheckSquare className="w-4 h-4" /> Checklist ({caseData.checklist?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('submissions')}
            className={`py-3.5 border-b-2 whitespace-nowrap flex items-center gap-2 ${activeTab === 'submissions' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            <FileText className="w-4 h-4" /> Submissions ({caseData.submissions?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('sessions')}
            className={`py-3.5 border-b-2 whitespace-nowrap flex items-center gap-2 ${activeTab === 'sessions' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            <Video className="w-4 h-4" /> Sessions ({caseData.sessions?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('reviews')}
            className={`py-3.5 border-b-2 whitespace-nowrap flex items-center gap-2 ${activeTab === 'reviews' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            <ShieldCheck className="w-4 h-4" /> Reviews & Approvals
          </button>
          <button
            onClick={() => setActiveTab('clearance')}
            className={`py-3.5 border-b-2 whitespace-nowrap flex items-center gap-2 ${activeTab === 'clearance' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            <ShieldCheck className="w-4 h-4" /> Exit Clearance & Audit
            {blockers.length > 0 && (
              <span className="bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0.5 rounded-full font-extrabold">
                {blockers.length}
              </span>
            )}
          </button>
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="bg-white p-6 rounded-b-2xl border border-t-0 border-gray-200 shadow-sm space-y-6">
            <div>
              <h3 className="text-base font-bold text-gray-900">Transfer Overview & Progress Summary</h3>
              <p className="text-xs text-gray-500">Holistic status of all transition deliverables for this handover case.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/70">
                <p className="text-xs font-bold text-gray-500 uppercase">Exit Reason</p>
                <p className="text-lg font-bold text-gray-900 mt-1">{caseData.reasonType}</p>
                <p className="text-xs text-gray-500 mt-0.5">Priority: {caseData.priority}</p>
              </div>
              <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/70">
                <p className="text-xs font-bold text-gray-500 uppercase">Checklist Deliverables</p>
                <p className="text-lg font-bold text-gray-900 mt-1">{clearance.completedChecklistItems || 0} / {clearance.totalChecklistItems || 0}</p>
                <p className="text-xs text-gray-500 mt-0.5">{clearance.pendingChecklistItems || 0} pending completion</p>
              </div>
              <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/70">
                <p className="text-xs font-bold text-gray-500 uppercase">Approved Submissions</p>
                <p className="text-lg font-bold text-gray-900 mt-1">{clearance.approvedSubmissions || 0} / {clearance.totalSubmissions || 0}</p>
                <p className="text-xs text-gray-500 mt-0.5">{clearance.unapprovedSubmissions || 0} awaiting approval</p>
              </div>
              <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/70">
                <p className="text-xs font-bold text-gray-500 uppercase">Hardware & Assets</p>
                <p className="text-lg font-bold text-gray-900 mt-1">{assets.length} Assets</p>
                <p className="text-xs text-gray-500 mt-0.5">{assets.filter((a) => a.returnStatus === 'PENDING').length} pending return</p>
              </div>
            </div>

            {/* Notes & Description */}
            <div className="p-4 rounded-xl border border-gray-200 bg-white space-y-2">
              <h4 className="text-xs font-bold text-gray-700 uppercase">Case Notes & Transition Instructions</h4>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{caseData.notes || 'No notes specified.'}</p>
            </div>
          </div>
        )}

        {/* TAB 2: TRANSFER PLAN */}
        {activeTab === 'plan' && (
          <div className="bg-white p-6 rounded-b-2xl border border-t-0 border-gray-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-900">Knowledge Transfer Plan</h3>
                <p className="text-xs text-gray-500">Document responsibilities, systems, processes, risks, and required actions.</p>
              </div>
              {!isViewerOnly && (
                <Button
                  variant="primary"
                  onClick={handleSavePlan}
                  disabled={isSavingPlan}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700"
                >
                  <Save className="w-4 h-4" />
                  {isSavingPlan ? 'Saving...' : 'Save Plan'}
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Key Responsibilities</label>
                <textarea
                  rows={4}
                  placeholder="Primary duties, ongoing operations, and day-to-day responsibilities..."
                  value={plan.responsibilities}
                  readOnly={isViewerOnly}
                  onChange={(e) => setPlan({ ...plan, responsibilities: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Projects Handled</label>
                <textarea
                  rows={4}
                  placeholder="Active projects, deliverables, milestones, and pending milestones..."
                  value={plan.projectsHandled}
                  readOnly={isViewerOnly}
                  onChange={(e) => setPlan({ ...plan, projectsHandled: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Systems & Tools Maintained</label>
                <textarea
                  rows={4}
                  placeholder="Software, databases, servers, repositories (NEVER store plain passwords)..."
                  value={plan.systemsMaintained}
                  readOnly={isViewerOnly}
                  onChange={(e) => setPlan({ ...plan, systemsMaintained: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Critical Business Processes</label>
                <textarea
                  rows={4}
                  placeholder="Core workflows, decision trees, approvals, and regulatory steps..."
                  value={plan.businessProcesses}
                  readOnly={isViewerOnly}
                  onChange={(e) => setPlan({ ...plan, businessProcesses: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Critical Knowledge Areas</label>
                <textarea
                  rows={4}
                  placeholder="Domain expertise, architectural nuances, key contacts..."
                  value={plan.criticalKnowledgeAreas}
                  readOnly={isViewerOnly}
                  onChange={(e) => setPlan({ ...plan, criticalKnowledgeAreas: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Risks & Contingencies</label>
                <textarea
                  rows={4}
                  placeholder="Operational risks of transition, single-point-of-failure areas, mitigations..."
                  value={plan.risks}
                  readOnly={isViewerOnly}
                  onChange={(e) => setPlan({ ...plan, risks: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Required Actions & Immediate Next Steps</label>
              <textarea
                rows={3}
                placeholder="Immediate actions required by successor before completion..."
                value={plan.requiredActions}
                readOnly={isViewerOnly}
                onChange={(e) => setPlan({ ...plan, requiredActions: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        )}

        {/* TAB 3: INVENTORY (7 CATEGORIES) */}
        {activeTab === 'inventory' && (
          <div className="bg-white p-6 rounded-b-2xl border border-t-0 border-gray-200 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-gray-900">Structured Knowledge Inventory</h3>
                <p className="text-xs text-gray-500">Catalog operational knowledge across all 7 mandated enterprise domains.</p>
              </div>
              {!isViewerOnly && (
                <Button
                  variant="primary"
                  onClick={() => setIsInventoryModalOpen(true)}
                  className="flex items-center gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700"
                >
                  <Plus className="w-4 h-4" /> Add Inventory Item
                </Button>
              )}
            </div>

            {/* Category Filter Pills */}
            <div className="flex flex-wrap gap-2 pt-1 border-b border-gray-200 pb-3">
              {[
                { id: 'ALL', label: 'All Categories' },
                { id: 'RESPONSIBILITIES', label: 'Responsibilities' },
                { id: 'BUSINESS_PROCESSES', label: 'Business Processes' },
                { id: 'SYSTEMS_AND_TOOLS', label: 'Systems & Tools' },
                { id: 'CRITICAL_KNOWLEDGE', label: 'Critical Knowledge' },
                { id: 'TROUBLESHOOTING', label: 'Troubleshooting' },
                { id: 'CONTACTS', label: 'Contacts' },
                { id: 'LESSONS_LEARNED', label: 'Lessons Learned' }
              ].map((c) => (
                <button
                  key={c.id}
                  onClick={() => setInvFilterCategory(c.id)}
                  className={`text-xs px-3 py-1.5 rounded-lg font-bold transition-colors ${
                    invFilterCategory === c.id
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            {filteredInventory.length === 0 ? (
              <div className="p-8 text-center border-2 border-dashed border-gray-200 rounded-xl">
                <Briefcase className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-sm font-bold text-gray-700">No inventory items in this category</p>
                <p className="text-xs text-gray-500 mt-0.5">Click &quot;Add Inventory Item&quot; to catalog responsibilities, workflows, or contacts.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredInventory.map((item) => (
                  <div key={item.id} className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 flex flex-col justify-between space-y-3">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-indigo-100 text-indigo-800">
                          {item.category}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            item.criticality === 'CRITICAL' ? 'bg-red-100 text-red-800' :
                            item.criticality === 'HIGH' ? 'bg-amber-100 text-amber-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {item.criticality}
                          </span>
                          {!isViewerOnly && (
                            <button
                              onClick={() => handleDeleteInventory(item.id)}
                              className="text-gray-400 hover:text-rose-600 p-1"
                              title="Remove item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                      <h4 className="text-sm font-bold text-gray-900 mt-2">{item.title}</h4>
                      <p className="text-xs text-gray-700 mt-1 whitespace-pre-wrap">{item.description}</p>
                    </div>

                    {item.notes && (
                      <div className="text-[11px] text-gray-500 bg-white p-2 rounded border border-gray-200">
                        <strong>Successor Notes:</strong> {item.notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: DOCUMENTS & DOCUMENT LIBRARY INTEGRATION */}
        {activeTab === 'documents' && (
          <div className="bg-white p-6 rounded-b-2xl border border-t-0 border-gray-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-900">Work Document Handover (Document Library Integration)</h3>
                <p className="text-xs text-gray-500">Seamlessly attached to existing KMS documents. No duplicate file uploads.</p>
              </div>
              {!isViewerOnly && (
                <Button
                  variant="primary"
                  onClick={() => setIsAttachDocModalOpen(true)}
                  className="flex items-center gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700"
                >
                  <Plus className="w-4 h-4" /> Attach Document from Library
                </Button>
              )}
            </div>

            {/* Useful summary information */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Authored by Employee</p>
                <p className="text-xl font-bold text-slate-900 mt-1">{employeeDocuments.length}</p>
              </div>
              <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-200">
                <p className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider">Attached to Case</p>
                <p className="text-xl font-bold text-indigo-950 mt-1">{caseDocuments.length}</p>
              </div>
              <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200">
                <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Remaining in Library</p>
                <p className="text-xl font-bold text-emerald-950 mt-1">
                  {Math.max(0, employeeDocuments.length - caseDocuments.filter(cd => employeeDocuments.some(ed => ed.id === cd.documentId || ed.id === cd.document?.id)).length)}
                </p>
              </div>
            </div>

            {caseDocuments.length === 0 ? (
              <div className="p-8 text-center border-2 border-dashed border-gray-200 rounded-xl">
                <FileText className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-sm font-bold text-gray-700">No documents attached yet</p>
                <p className="text-xs text-gray-500 mt-0.5">Attach documents created or maintained by the departing employee for handover.</p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-gray-200 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase font-bold">
                    <tr>
                      <th className="p-3">Document Title</th>
                      <th className="p-3">Handover Action</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Notes</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {caseDocuments.map((td) => (
                      <tr key={td.id} className="hover:bg-gray-50">
                        <td className="p-3 font-bold text-gray-900 flex items-center gap-2">
                          <FileText className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                          <span>{td.document?.title || 'Document #' + td.documentId}</span>
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded font-bold ${
                            td.transferAction === 'REASSIGN_AUTHOR' ? 'bg-purple-100 text-purple-800' :
                            td.transferAction === 'HANDOVER' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {td.transferAction}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded font-semibold ${
                            td.status === 'TRANSFERRED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {td.status}
                          </span>
                        </td>
                        <td className="p-3 text-gray-600 max-w-xs truncate">{td.notes || '—'}</td>
                        <td className="p-3 text-right space-x-2">
                          <Link
                            href={`/documents/${td.documentId}`}
                            className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-bold"
                          >
                            <ExternalLink className="w-3.5 h-3.5" /> View
                          </Link>
                          <a
                            href={`/api/v1/documents/${td.documentId}/download`}
                            download
                            className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-800 font-bold"
                          >
                            <Download className="w-3.5 h-3.5" /> Download
                          </a>
                          {!isViewerOnly && (
                            <button
                              onClick={() => handleDetachDocument(td.documentId)}
                              className="text-gray-400 hover:text-rose-600 ml-2"
                              title="Detach"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: ASSETS (EQUIPMENT & HARDWARE) */}
        {activeTab === 'assets' && (
          <div className="bg-white p-6 rounded-b-2xl border border-t-0 border-gray-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-900">Equipment & Physical Asset Handover</h3>
                <p className="text-xs text-gray-500">Track laptops, access badges, security tokens, and hardware return status.</p>
              </div>
              {!isViewerOnly && (
                <Button
                  variant="primary"
                  onClick={() => setIsAssetModalOpen(true)}
                  className="flex items-center gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700"
                >
                  <Plus className="w-4 h-4" /> Register Asset
                </Button>
              )}
            </div>

            {assets.length === 0 ? (
              <div className="p-8 text-center border-2 border-dashed border-gray-200 rounded-xl">
                <Laptop className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-sm font-bold text-gray-700">No assets registered</p>
                <p className="text-xs text-gray-500 mt-0.5">Register equipment assigned to this employee to ensure return prior to exit.</p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-gray-200 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase font-bold">
                    <tr>
                      <th className="p-3">Asset Tag / ID</th>
                      <th className="p-3">Type</th>
                      <th className="p-3">Description</th>
                      <th className="p-3">Condition</th>
                      <th className="p-3">Return Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {assets.map((ast) => (
                      <tr key={ast.id} className="hover:bg-gray-50">
                        <td className="p-3 font-mono font-bold text-gray-900">{ast.assetIdentifier}</td>
                        <td className="p-3">
                          <span className="bg-gray-100 text-gray-800 px-2 py-0.5 rounded font-bold">
                            {ast.assetType}
                          </span>
                        </td>
                        <td className="p-3 text-gray-800">{ast.description}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded font-semibold ${
                            ast.conditionStatus === 'DAMAGED' ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {ast.conditionStatus}
                          </span>
                        </td>
                        <td className="p-3">
                          <select
                            value={ast.returnStatus}
                            disabled={isViewerOnly}
                            onChange={(e) => handleUpdateAssetStatus(ast.id, e.target.value)}
                            className="px-2 py-1 border border-gray-300 rounded text-xs font-bold bg-white disabled:bg-gray-100 disabled:text-gray-500"
                          >
                            <option value="PENDING">Pending Return</option>
                            <option value="RETURNED_TO_IT">Returned to IT</option>
                            <option value="HANDED_TO_SUCCESSOR">Handed to Successor</option>
                            <option value="RETAINED">Retained</option>
                          </select>
                        </td>
                        <td className="p-3 text-right">
                          {ast.returnStatus === 'RETURNED_TO_IT' && (
                            <span className="text-emerald-700 font-bold flex items-center justify-end gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Cleared
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 6: ACCESS REVIEWS & REVOCATION */}
        {activeTab === 'access' && (
          <div className="bg-white p-6 rounded-b-2xl border border-t-0 border-gray-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-900">System Access Review & IAM Revocation</h3>
                <p className="text-xs text-gray-500">Track application credentials, administrative roles, and cloud IAM revocation.</p>
              </div>
              {!isViewerOnly && (
                <Button
                  variant="primary"
                  onClick={() => setIsAccessModalOpen(true)}
                  className="flex items-center gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700"
                >
                  <Plus className="w-4 h-4" /> Add System Access
                </Button>
              )}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-900 flex items-start gap-3">
              <Key className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="block text-sm font-bold text-blue-950">Automated IAM Revocation Active</strong>
                Upon final exit clearance, the system automatically deactivates the departing employee in Keycloak IAM and disables login credentials across all integrated enterprise services.
              </div>
            </div>

            {accessReviews.length === 0 ? (
              <div className="p-8 text-center border-2 border-dashed border-gray-200 rounded-xl">
                <Key className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-sm font-bold text-gray-700">No system access reviews added</p>
                <p className="text-xs text-gray-500 mt-0.5">Catalog production systems, database access, and admin tools for revocation.</p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-gray-200 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase font-bold">
                    <tr>
                      <th className="p-3">System / Resource</th>
                      <th className="p-3">Access Level</th>
                      <th className="p-3">Revoke Required?</th>
                      <th className="p-3">Successor Action</th>
                      <th className="p-3">Revocation Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {accessReviews.map((ar) => (
                      <tr key={ar.id} className="hover:bg-gray-50">
                        <td className="p-3 font-bold text-gray-900">{ar.systemOrResource}</td>
                        <td className="p-3">{ar.currentAccessLevel}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded font-bold ${ar.revokeRequired ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-700'}`}>
                            {ar.revokeRequired ? 'Yes (Revoke)' : 'No'}
                          </span>
                        </td>
                        <td className="p-3 text-gray-700 font-medium">{ar.successorAccessRequired || 'None'}</td>
                        <td className="p-3">
                          <select
                            value={ar.revocationStatus}
                            disabled={isViewerOnly}
                            onChange={(e) => handleUpdateAccessStatus(ar.id, e.target.value)}
                            className="px-2 py-1 border border-gray-300 rounded text-xs font-bold bg-white disabled:bg-gray-100 disabled:text-gray-500"
                          >
                            <option value="PENDING">Pending Revocation</option>
                            <option value="REVOKED">Revoked</option>
                            <option value="TRANSFERRED">Transferred</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 7: CHECKLIST */}
        {activeTab === 'checklist' && (
          <div className="bg-white p-6 rounded-b-2xl border border-t-0 border-gray-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-900">Handover Checklist</h3>
                <p className="text-xs text-gray-500">Every item must be marked Completed or Not Applicable prior to exit clearance.</p>
              </div>
              {!isViewerOnly && (
                <Button
                  variant="secondary"
                  onClick={() => setIsAddChecklistModalOpen(true)}
                  className="flex items-center gap-1.5 text-xs"
                >
                  <Plus className="w-4 h-4" /> Add Item
                </Button>
              )}
            </div>

            <div className="divide-y divide-gray-200 border border-gray-200 rounded-xl overflow-hidden">
              {(caseData.checklist || []).map((item: any) => (
                <div key={item.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-gray-50">
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 p-1.5 rounded-full ${item.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' : item.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                      {item.status === 'COMPLETED' ? <Check className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                    </div>
                    <div>
                      <p className={`text-sm font-bold ${item.status === 'COMPLETED' ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                        {item.itemName}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Category: <span className="font-semibold text-gray-700">{item.category}</span>
                        {item.completedAt && ` • Completed ${new Date(item.completedAt).toLocaleDateString()}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <select
                      value={item.status}
                      disabled={isViewerOnly}
                      onChange={(e) => handleUpdateChecklistStatus(item.id, e.target.value)}
                      className={`text-xs font-bold rounded-lg px-3 py-1.5 border disabled:opacity-75 disabled:cursor-not-allowed ${
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

        {/* TAB 8: KNOWLEDGE SUBMISSIONS & IN-PLACE RESUBMISSION */}
        {activeTab === 'submissions' && (
          <div className="bg-white p-6 rounded-b-2xl border border-t-0 border-gray-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-900">Knowledge Submissions & Procedures</h3>
                <p className="text-xs text-gray-500">Document operational procedures, system notes, lessons learned, and troubleshooting steps.</p>
              </div>
              {!isViewerOnly && (
                <Button
                  variant="primary"
                  onClick={() => setIsSubmitModalOpen(true)}
                  className="flex items-center gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700"
                >
                  <Plus className="w-4 h-4" /> Submit Knowledge
                </Button>
              )}
            </div>

            {(caseData.submissions || []).length === 0 ? (
              <div className="p-8 text-center border-2 border-dashed border-gray-200 rounded-xl">
                <FileText className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-sm font-bold text-gray-700">No knowledge items submitted yet</p>
                <p className="text-xs text-gray-500 mt-0.5">Click &quot;Submit Knowledge&quot; to capture procedures or operational documentation.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {(caseData.submissions || []).map((sub: any) => (
                  <div key={sub.id} className="p-5 border border-gray-200 rounded-2xl bg-gray-50/50 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-base font-bold text-gray-900">{sub.title}</h4>
                          <span className="text-[10px] bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded font-extrabold uppercase">
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

                        {/* Edit & Resubmit button for submitter */}
                        {!isViewerOnly && (
                          <button
                            onClick={() => {
                              setEditingSubId(sub.id);
                              setEditSubTitle(sub.title);
                              setEditSubContent(sub.content);
                              setEditSubCategory(sub.category);
                              setIsEditSubModalOpen(true);
                            }}
                            className="text-xs bg-white border border-gray-300 hover:bg-gray-100 px-2.5 py-1 rounded-lg font-bold text-indigo-600 flex items-center gap-1"
                          >
                            <Edit3 className="w-3.5 h-3.5" /> Edit / Resubmit
                          </button>
                        )}

                        {/* Review / Validate button for SME / Manager */}
                        {!isViewerOnly && (
                          <button
                            onClick={() => {
                              setValidatingSubId(sub.id);
                              setValStatus('APPROVED');
                              setValComments('');
                              setIsValidateModalOpen(true);
                            }}
                            className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-2.5 py-1 rounded-lg font-bold shadow-sm"
                          >
                            Review / Validate
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-gray-200 text-sm text-gray-800 whitespace-pre-wrap font-sans">
                      {sub.content}
                    </div>

                    {sub.reviewComments && (
                      <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-xs text-amber-900">
                        <strong className="block mb-0.5">Review Feedback ({sub.reviewedBy?.fullName || 'Reviewer'}):</strong> {sub.reviewComments}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 9: SESSIONS & ATTENDANCE */}
        {activeTab === 'sessions' && (
          <div className="bg-white p-6 rounded-b-2xl border border-t-0 border-gray-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-900">Transfer & Walkthrough Sessions</h3>
                <p className="text-xs text-gray-500">Schedule meetings, track attendance, and record walkthrough outcomes.</p>
              </div>
              {!isViewerOnly && (
                <Button
                  variant="primary"
                  onClick={() => setIsSessionModalOpen(true)}
                  className="flex items-center gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700"
                >
                  <Plus className="w-4 h-4" /> Schedule Session
                </Button>
              )}
            </div>

            {(caseData.sessions || []).length === 0 ? (
              <div className="p-8 text-center border-2 border-dashed border-gray-200 rounded-xl">
                <Video className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-sm font-bold text-gray-700">No transfer sessions scheduled</p>
                <p className="text-xs text-gray-500 mt-0.5">Schedule a live walkthrough session between the outgoing employee and successor.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {(caseData.sessions || []).map((s: any) => (
                  <div key={s.id} className="p-5 border border-gray-200 rounded-2xl bg-gray-50/50 space-y-3">
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
                      <div className="bg-white p-3 rounded-xl border border-gray-200 text-xs text-gray-700 whitespace-pre-wrap">
                        <strong className="text-gray-900 block mb-1">Meeting Notes:</strong>
                        {s.meetingNotes}
                      </div>
                    )}

                    {s.attendees && s.attendees.length > 0 && (
                      <div className="pt-2">
                        <p className="text-xs font-bold text-gray-600 mb-2">Participant Attendance Tracker (Click to toggle):</p>
                        <div className="flex flex-wrap gap-2">
                          {s.attendees.map((att: any) => (
                            <button
                              key={att.id}
                              disabled={isViewerOnly}
                              onClick={() => handleToggleAttendance(s.id, s.attendees, att.userId)}
                              className={`inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-lg border font-bold transition-colors ${
                                att.attended
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                  : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100'
                              } disabled:cursor-not-allowed`}
                            >
                              {att.attended ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Clock className="w-3.5 h-3.5 text-gray-400" />}
                              {att.fullName || att.username} ({att.attended ? 'Attended' : 'Absent'})
                            </button>
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

        {/* TAB 10: REVIEWS & APPROVAL WORKFLOWS */}
        {activeTab === 'reviews' && (
          <div className="bg-white p-6 rounded-b-2xl border border-t-0 border-gray-200 shadow-sm space-y-6">
            <div>
              <h3 className="text-base font-bold text-gray-900">Multi-Stage Exit Handover Approvals</h3>
              <p className="text-xs text-gray-500">Formal verification by Successor, Line Manager, and Human Resources prior to clearance.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Successor Acceptance Card */}
              <div className="p-5 rounded-2xl border border-gray-200 bg-gray-50/50 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-500 uppercase">Stage 1</span>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${caseData.successorAccepted ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                      {caseData.successorAccepted ? 'Accepted' : 'Pending'}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-gray-900">Successor Acceptance</h4>
                  <p className="text-xs text-gray-600">
                    Confirms that all critical operational knowledge, system credentials pointers, and equipment have been received.
                  </p>
                  {caseData.successorNotes && (
                    <div className="text-xs bg-white p-2.5 rounded-lg border border-gray-200 text-gray-700">
                      <strong>Successor Notes:</strong> {caseData.successorNotes}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
                  {(!isViewerOnly || isDesignatedSuccessor) ? (
                    <>
                      <Button
                        variant="primary"
                        onClick={() => {
                          setReviewType('SUCCESSOR');
                          setReviewApproved(true);
                          setReviewComments('');
                          setIsReviewDecisionModalOpen(true);
                        }}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-xs font-bold"
                      >
                        Accept Transfer
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setReviewType('SUCCESSOR');
                          setReviewApproved(false);
                          setReviewComments('');
                          setIsReviewDecisionModalOpen(true);
                        }}
                        className="flex-1 text-xs font-bold text-rose-600 hover:bg-rose-50 border-rose-200"
                      >
                        Request Changes
                      </Button>
                    </>
                  ) : (
                    <p className="text-xs text-amber-700 italic">
                      Only the designated successor can accept or request changes to this transfer.
                    </p>
                  )}
                </div>
              </div>

              {/* Manager Review Card */}
              <div className="p-5 rounded-2xl border border-gray-200 bg-gray-50/50 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-500 uppercase">Stage 2</span>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${caseData.managerApproved ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                      {caseData.managerApproved ? 'Approved' : 'Pending'}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-gray-900">Line Manager Review</h4>
                  <p className="text-xs text-gray-600">
                    Validates that operational continuity is protected, deliverables are complete, and handover meetings took place.
                  </p>
                </div>

                {!isViewerOnly && (
                  <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
                    <Button
                      variant="primary"
                      onClick={() => {
                        setReviewType('MANAGER');
                        setReviewApproved(true);
                        setReviewComments('');
                        setIsReviewDecisionModalOpen(true);
                      }}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-xs font-bold"
                    >
                      Approve
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setReviewType('MANAGER');
                        setReviewApproved(false);
                        setReviewComments('');
                        setIsReviewDecisionModalOpen(true);
                      }}
                      className="flex-1 text-xs font-bold text-rose-600 hover:bg-rose-50 border-rose-200"
                    >
                      Request Revision
                    </Button>
                  </div>
                )}
              </div>

              {/* HR Clearance Card */}
              <div className="p-5 rounded-2xl border border-gray-200 bg-gray-50/50 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-500 uppercase">Stage 3</span>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${caseData.hrApproved ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                      {caseData.hrApproved ? 'Approved' : 'Pending'}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-gray-900">HR Representative Sign-off</h4>
                  <p className="text-xs text-gray-600">
                    Oversight of official employee exit records, asset surrender, and authorization for IAM access termination.
                  </p>
                </div>

                {!isViewerOnly && (
                  <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
                    <Button
                      variant="primary"
                      onClick={() => {
                        setReviewType('HR');
                        setReviewApproved(true);
                        setReviewComments('');
                        setIsReviewDecisionModalOpen(true);
                      }}
                      className="flex-1 bg-purple-600 hover:bg-purple-700 text-xs font-bold"
                    >
                      Grant Sign-off
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setReviewType('HR');
                        setReviewApproved(false);
                        setReviewComments('');
                        setIsReviewDecisionModalOpen(true);
                      }}
                      className="flex-1 text-xs font-bold text-rose-600 hover:bg-rose-50 border-rose-200"
                    >
                      Hold Clearance
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 11: EXIT CLEARANCE GATEKEEPER & AUDIT TRAIL */}
        {activeTab === 'clearance' && (
          <div className="bg-white p-6 rounded-b-2xl border border-t-0 border-gray-200 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-gray-900">Exit Clearance Gatekeeper & Full Audit Trail</h3>
                <p className="text-xs text-gray-500">Rigorous 7-point validation check before issuing final exit clearance and revoking IAM accounts.</p>
              </div>

              {caseData.clearanceStatus === 'CLEARED' ? (
                <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" /> Cleared & Completed
                </span>
              ) : !isViewerOnly ? (
                <Button
                  variant="primary"
                  disabled={isCompletingCase || !isReadyForClearance}
                  onClick={handleCompleteCase}
                  className={`flex items-center gap-2 text-sm font-bold px-4 py-2.5 rounded-xl shadow-sm ${
                    isReadyForClearance ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {isCompletingCase ? 'Processing IAM Revocation...' : 'Issue Final Exit Clearance'}
                </Button>
              ) : null}
            </div>

            {/* Blockers alert if not ready */}
            {!isReadyForClearance && blockers.length > 0 && (
              <div className="bg-amber-50 border border-amber-300 rounded-2xl p-5 text-sm text-amber-900 space-y-2">
                <div className="flex items-center gap-2 font-bold text-amber-950">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                  Cannot complete exit clearance — the following mandatory conditions remain unfulfilled:
                </div>
                <ul className="list-disc list-inside space-y-1 text-xs text-amber-800 pl-2">
                  {blockers.map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              </div>
            )}

            {isReadyForClearance && caseData.clearanceStatus !== 'CLEARED' && (
              <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-5 text-sm text-emerald-900 flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0" />
                <div>
                  <p className="font-bold text-emerald-950">Ready for Final Exit Clearance!</p>
                  <p className="text-xs text-emerald-800 mt-0.5">
                    All checklist items, submissions, equipment returns, successor acceptance, manager approval, and HR clearance have been satisfied.
                  </p>
                </div>
              </div>
            )}

            {/* 7-Point Gatekeeper Criteria Checklist */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-500 uppercase">1. Successor</span>
                  {clearance.hasSuccessor ? <Check className="w-4 h-4 text-emerald-600" /> : <X className="w-4 h-4 text-rose-500" />}
                </div>
                <p className="text-sm font-bold text-gray-900">{clearance.hasSuccessor ? 'Assigned' : 'Unassigned'}</p>
              </div>

              <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-500 uppercase">2. Checklist (100%)</span>
                  {clearance.pendingChecklistItems === 0 ? <Check className="w-4 h-4 text-emerald-600" /> : <X className="w-4 h-4 text-rose-500" />}
                </div>
                <p className="text-sm font-bold text-gray-900">{clearance.completedChecklistItems || 0} / {clearance.totalChecklistItems || 0}</p>
              </div>

              <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-500 uppercase">3. Submissions</span>
                  {clearance.unapprovedSubmissions === 0 && clearance.totalSubmissions > 0 ? <Check className="w-4 h-4 text-emerald-600" /> : <X className="w-4 h-4 text-rose-500" />}
                </div>
                <p className="text-sm font-bold text-gray-900">{clearance.approvedSubmissions || 0} / {clearance.totalSubmissions || 0} Approved</p>
              </div>

              <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-500 uppercase">4. Asset Surrender</span>
                  {clearance.pendingAssets === 0 ? <Check className="w-4 h-4 text-emerald-600" /> : <X className="w-4 h-4 text-rose-500" />}
                </div>
                <p className="text-sm font-bold text-gray-900">{clearance.pendingAssets === 0 ? 'All Handed Over' : clearance.pendingAssets + ' Pending'}</p>
              </div>

              <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-500 uppercase">5. Successor Accepted</span>
                  {clearance.successorAccepted ? <Check className="w-4 h-4 text-emerald-600" /> : <X className="w-4 h-4 text-rose-500" />}
                </div>
                <p className="text-sm font-bold text-gray-900">{clearance.successorAccepted ? 'Confirmed' : 'Pending'}</p>
              </div>

              <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-500 uppercase">6. Manager Approved</span>
                  {clearance.managerApproved ? <Check className="w-4 h-4 text-emerald-600" /> : <X className="w-4 h-4 text-rose-500" />}
                </div>
                <p className="text-sm font-bold text-gray-900">{clearance.managerApproved ? 'Approved' : 'Pending'}</p>
              </div>

              <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-500 uppercase">7. HR Oversight</span>
                  {clearance.hrApproved ? <Check className="w-4 h-4 text-emerald-600" /> : <X className="w-4 h-4 text-rose-500" />}
                </div>
                <p className="text-sm font-bold text-gray-900">{clearance.hrApproved ? 'Granted' : 'Pending'}</p>
              </div>

              <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-500 uppercase">IAM Revocation</span>
                  {caseData.accessRevoked ? <UserX className="w-4 h-4 text-rose-600" /> : <Clock className="w-4 h-4 text-gray-400" />}
                </div>
                <p className="text-sm font-bold text-gray-900">{caseData.accessRevoked ? 'Executed' : 'Queued on Clearance'}</p>
              </div>
            </div>

            {/* Chronological Case Audit Trail */}
            <div className="space-y-4 pt-6 border-t border-gray-200">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-indigo-600" />
                <h4 className="text-sm font-bold text-gray-900">Chronological Audit Trail</h4>
              </div>

              {auditLogs.length === 0 ? (
                <p className="text-xs text-gray-500">No audit events recorded for this case yet.</p>
              ) : (
                <div className="space-y-3">
                  {auditLogs.map((log: any) => (
                    <div key={log.id} className="p-3.5 rounded-xl border border-gray-200 bg-gray-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                            {log.action}
                          </span>
                          <span className="text-gray-700 font-semibold">{log.details}</span>
                        </div>
                        <p className="text-gray-500 mt-1">
                          Actor: <strong className="text-gray-800">{log.username || 'System'}</strong>
                        </p>
                      </div>
                      <span className="text-gray-400 font-mono self-end sm:self-auto whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* --- MODALS --- */}

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
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Successor User</label>
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
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Item Description <span className="text-red-500">*</span></label>
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
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Category</label>
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
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Notes / Instructions</label>
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

      {/* Add Inventory Modal */}
      {isInventoryModalOpen && (
        <Modal
          isOpen={isInventoryModalOpen}
          onClose={() => setIsInventoryModalOpen(false)}
          title="Add Knowledge Inventory Item"
        >
          <form onSubmit={handleAddInventory} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Category <span className="text-red-500">*</span></label>
              <select
                value={invCategory}
                onChange={(e) => setInvCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
              >
                <option value="RESPONSIBILITIES">Responsibilities (Routine & Ad-hoc)</option>
                <option value="BUSINESS_PROCESSES">Business Processes (SOPs & Workflows)</option>
                <option value="SYSTEMS_AND_TOOLS">Systems & Tools (Config & Repositories)</option>
                <option value="CRITICAL_KNOWLEDGE">Critical Knowledge (Nuances & Architecture)</option>
                <option value="TROUBLESHOOTING">Troubleshooting & Incident Runbooks</option>
                <option value="CONTACTS">Contacts (Vendors & Stakeholders)</option>
                <option value="LESSONS_LEARNED">Lessons Learned & Retrospectives</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Title <span className="text-red-500">*</span></label>
              <input
                type="text"
                required
                placeholder="e.g. Daily Payment Settlement Reconciliation"
                value={invTitle}
                onChange={(e) => setInvTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Detailed Description <span className="text-red-500">*</span></label>
              <textarea
                rows={4}
                required
                placeholder="Step-by-step procedure, dependencies, tools, or contacts..."
                value={invDescription}
                onChange={(e) => setInvDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Criticality</label>
              <select
                value={invCriticality}
                onChange={(e) => setInvCriticality(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Successor Notes / Instructions</label>
              <textarea
                rows={2}
                placeholder="Special notes or handover caveats..."
                value={invNotes}
                onChange={(e) => setInvNotes(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-200">
              <Button variant="secondary" type="button" onClick={() => setIsInventoryModalOpen(false)}>Cancel</Button>
              <Button variant="primary" type="submit" disabled={isSavingInventory} className="bg-indigo-600 hover:bg-indigo-700">
                {isSavingInventory ? 'Adding...' : 'Save Inventory Item'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Attach Document Modal */}
      {isAttachDocModalOpen && (
        <Modal
          isOpen={isAttachDocModalOpen}
          onClose={() => {
            setIsAttachDocModalOpen(false);
            setSelectedDocsBatchMap({});
            setSelectedDocId('');
          }}
          title="Attach Work Document from Library"
        >
          <form onSubmit={handleAttachDocument} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold text-gray-700 uppercase">
                  Eligible Authored Documents ({eligibleEmployeeDocs.length})
                </label>
                {eligibleEmployeeDocs.length > 0 && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSelectAllAttachDocs}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-800 px-2 py-0.5 bg-indigo-50 border border-indigo-200 rounded"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={handleClearAllAttachDocs}
                      className="text-xs font-bold text-gray-600 hover:text-gray-800 px-2 py-0.5 bg-gray-50 border border-gray-200 rounded"
                    >
                      Clear All
                    </button>
                  </div>
                )}
              </div>

              {eligibleEmployeeDocs.length > 0 ? (
                <div className="max-h-60 overflow-y-auto space-y-2 border border-gray-200 rounded-lg p-2 bg-gray-50/50">
                  {eligibleEmployeeDocs.map((doc) => {
                    const isChecked = Boolean(selectedDocsBatchMap[doc.id]?.selected);
                    const currentAction = selectedDocsBatchMap[doc.id]?.transferAction || 'REFERENCE';
                    return (
                      <div
                        key={doc.id}
                        className={`flex flex-col sm:flex-row sm:items-center justify-between p-2.5 rounded-lg border transition-all gap-2 ${
                          isChecked
                            ? 'bg-white border-indigo-300 shadow-xs ring-1 ring-indigo-200'
                            : 'bg-white border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <label className="flex items-start gap-2 cursor-pointer flex-1 min-w-0">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleAttachDoc(doc.id)}
                            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          />
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-gray-900 truncate">{doc.title}</p>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              <span className="text-[10px] text-gray-500">{doc.documentType || 'Document'}</span>
                              {doc.confidentialityLevel && (
                                <span className="text-[9px] px-1.5 py-0.2 bg-gray-100 text-gray-600 rounded font-bold uppercase">
                                  {doc.confidentialityLevel}
                                </span>
                              )}
                            </div>
                          </div>
                        </label>

                        {isChecked && (
                          <div className="flex items-center gap-2 pl-6 sm:pl-0 flex-shrink-0">
                            <label className="text-[10px] font-bold text-gray-500 uppercase">Action:</label>
                            <select
                              value={currentAction}
                              onChange={(e) => handleAttachDocActionChange(doc.id, e.target.value)}
                              className="text-xs font-semibold px-2 py-1 border border-gray-300 rounded bg-white text-gray-800 focus:ring-1 focus:ring-indigo-500"
                            >
                              <option value="REFERENCE">REFERENCE (No author change)</option>
                              <option value="HANDOVER">HANDOVER (No author change)</option>
                              <option value="REASSIGN_AUTHOR">REASSIGN_AUTHOR (To successor upon exit)</option>
                            </select>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-3 bg-gray-50 border border-dashed border-gray-200 rounded-lg text-center text-xs text-gray-500">
                  All authored documents from this employee are already attached to the case.
                </div>
              )}
            </div>

            {/* Manual Document UUID fallback */}
            <div className="pt-2 border-t border-gray-100">
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Or Specific Document UUID</label>
              <input
                type="text"
                placeholder="e.g. 123e4567-e89b-12d3-a456-426614174000"
                value={selectedDocId}
                onChange={(e) => setSelectedDocId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500"
              />
              {selectedDocId.trim() && Object.values(selectedDocsBatchMap).filter(v => v.selected).length === 0 && (
                <div className="mt-2">
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Handover Action</label>
                  <select
                    value={docTransferAction}
                    onChange={(e) => setDocTransferAction(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="REFERENCE">Reference Only (Shared context)</option>
                    <option value="HANDOVER">Handover Responsibility</option>
                    <option value="REASSIGN_AUTHOR">Reassign Document Author to Successor</option>
                  </select>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">General Handover Notes</label>
              <textarea
                rows={2}
                placeholder="Instructions on document maintenance..."
                value={docNotes}
                onChange={(e) => setDocNotes(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-200">
              <Button
                variant="secondary"
                type="button"
                onClick={() => {
                  setIsAttachDocModalOpen(false);
                  setSelectedDocsBatchMap({});
                  setSelectedDocId('');
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                type="submit"
                disabled={
                  (Object.values(selectedDocsBatchMap).filter((v) => v.selected).length === 0 && !selectedDocId.trim()) ||
                  isAttachingDoc
                }
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                {isAttachingDoc
                  ? 'Attaching...'
                  : Object.values(selectedDocsBatchMap).filter((v) => v.selected).length > 0
                  ? `Attach Selected (${Object.values(selectedDocsBatchMap).filter((v) => v.selected).length})`
                  : 'Attach Document'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Add Asset Modal */}
      {isAssetModalOpen && (
        <Modal
          isOpen={isAssetModalOpen}
          onClose={() => setIsAssetModalOpen(false)}
          title="Register Physical Asset / Equipment"
        >
          <form onSubmit={handleAddAsset} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Asset Tag / Serial Number <span className="text-red-500">*</span></label>
              <input
                type="text"
                required
                placeholder="e.g. INSA-LAP-2024-001"
                value={assetIdentifier}
                onChange={(e) => setAssetIdentifier(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Asset Description <span className="text-red-500">*</span></label>
              <input
                type="text"
                required
                placeholder="e.g. Apple MacBook Pro 16 M3 Max"
                value={assetDescription}
                onChange={(e) => setAssetDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Asset Type</label>
                <select
                  value={assetType}
                  onChange={(e) => setAssetType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="LAPTOP">Laptop</option>
                  <option value="DESKTOP">Desktop</option>
                  <option value="MOBILE_DEVICE">Mobile Device</option>
                  <option value="SECURITY_TOKEN">Security Token / YubiKey</option>
                  <option value="ACCESS_CARD">Access Card / Badge</option>
                  <option value="STORAGE_MEDIA">Storage Media</option>
                  <option value="OTHER">Other Equipment</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Condition Status</label>
                <select
                  value={assetCondition}
                  onChange={(e) => setAssetCondition(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="EXCELLENT">Excellent</option>
                  <option value="GOOD">Good</option>
                  <option value="FAIR">Fair</option>
                  <option value="DAMAGED">Damaged</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Notes</label>
              <textarea
                rows={2}
                placeholder="Accessories included (charger, dongle)..."
                value={assetNotes}
                onChange={(e) => setAssetNotes(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-200">
              <Button variant="secondary" type="button" onClick={() => setIsAssetModalOpen(false)}>Cancel</Button>
              <Button variant="primary" type="submit" disabled={isSavingAsset} className="bg-indigo-600 hover:bg-indigo-700">
                {isSavingAsset ? 'Registering...' : 'Register Asset'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Add Access Review Modal */}
      {isAccessModalOpen && (
        <Modal
          isOpen={isAccessModalOpen}
          onClose={() => setIsAccessModalOpen(false)}
          title="Add System Access Review"
        >
          <form onSubmit={handleAddAccessReview} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">System / Resource Name <span className="text-red-500">*</span></label>
              <input
                type="text"
                required
                placeholder="e.g. AWS Production Infrastructure Console"
                value={accessSystem}
                onChange={(e) => setAccessSystem(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Current Access Level</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Administrator / Read-Write"
                  value={accessLevel}
                  onChange={(e) => setAccessLevel(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Successor Provisioning</label>
                <select
                  value={accessSuccessorAction}
                  onChange={(e) => setAccessSuccessorAction(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="TRANSFER_TO_SUCCESSOR">Provision for Successor</option>
                  <option value="REVOKE_ONLY">Revoke Only (No transfer)</option>
                  <option value="RETAIN_READ_ONLY">Retain Read-Only</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="revokeReqCheck"
                checked={accessRevokeRequired}
                onChange={(e) => setAccessRevokeRequired(e.target.checked)}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="revokeReqCheck" className="text-xs font-bold text-gray-700">
                Revocation Required on Exit Clearance
              </label>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Notes</label>
              <textarea
                rows={2}
                value={accessNotes}
                onChange={(e) => setAccessNotes(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-200">
              <Button variant="secondary" type="button" onClick={() => setIsAccessModalOpen(false)}>Cancel</Button>
              <Button variant="primary" type="submit" disabled={isSavingAccess} className="bg-indigo-600 hover:bg-indigo-700">
                {isSavingAccess ? 'Saving...' : 'Add Access Review'}
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
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Category <span className="text-red-500">*</span></label>
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
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Title <span className="text-red-500">*</span></label>
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
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Detailed Content <span className="text-red-500">*</span></label>
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

      {/* In-place Resubmit Modal */}
      {isEditSubModalOpen && (
        <Modal
          isOpen={isEditSubModalOpen}
          onClose={() => setIsEditSubModalOpen(false)}
          title="Edit & Resubmit Knowledge Item"
        >
          <form onSubmit={handleResubmitKnowledge} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Category</label>
              <select
                value={editSubCategory}
                onChange={(e) => setEditSubCategory(e.target.value)}
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
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Title <span className="text-red-500">*</span></label>
              <input
                type="text"
                required
                value={editSubTitle}
                onChange={(e) => setEditSubTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Content <span className="text-red-500">*</span></label>
              <textarea
                rows={6}
                required
                value={editSubContent}
                onChange={(e) => setEditSubContent(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 font-mono text-xs"
              />
            </div>

            <p className="text-[11px] text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
              Note: Resubmitting will reset the validation status to <strong>PENDING_REVIEW</strong> for supervisor re-evaluation.
            </p>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-200">
              <Button variant="secondary" type="button" onClick={() => setIsEditSubModalOpen(false)}>Cancel</Button>
              <Button variant="primary" type="submit" disabled={isResubmitting} className="bg-indigo-600 hover:bg-indigo-700">
                {isResubmitting ? 'Resubmitting...' : 'Update & Resubmit'}
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
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Decision</label>
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
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Review Comments</label>
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

      {/* Multi-Stage Review Decision Modal (Manager, HR, Successor) */}
      {isReviewDecisionModalOpen && (
        <Modal
          isOpen={isReviewDecisionModalOpen}
          onClose={() => setIsReviewDecisionModalOpen(false)}
          title={`${reviewType} Decision: ${reviewApproved ? 'Confirm Sign-off' : 'Request Adjustments'}`}
        >
          <div className="space-y-4">
            <p className="text-xs text-gray-600">
              {reviewApproved
                ? 'Provide any final remarks or acceptance notes for this stage.'
                : 'Provide actionable feedback detailing what missing knowledge or adjustments are required.'}
            </p>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Comments / Notes</label>
              <textarea
                rows={3}
                placeholder="Enter review notes..."
                value={reviewComments}
                onChange={(e) => setReviewComments(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-200">
              <Button variant="secondary" onClick={() => setIsReviewDecisionModalOpen(false)}>Cancel</Button>
              <Button
                variant="primary"
                onClick={handleReviewDecisionSubmit}
                disabled={isSubmittingReviewDecision}
                className={reviewApproved ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'}
              >
                {isSubmittingReviewDecision ? 'Submitting...' : 'Submit Decision'}
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
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Session Title <span className="text-red-500">*</span></label>
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
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Date & Time <span className="text-red-500">*</span></label>
                <input
                  type="datetime-local"
                  required
                  value={sessionDate}
                  onChange={(e) => setSessionDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Location / Meeting Link</label>
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
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Invite Participants</label>
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
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Meeting Agenda / Notes</label>
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
