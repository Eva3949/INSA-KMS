'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/src/components/layout/AppShell';
import { Breadcrumb } from '@/src/components/ui/Breadcrumb';
import { Button } from '@/src/components/ui/Button';
import { Input, Select } from '@/src/components/ui/Input';
import { Modal } from '@/src/components/ui/Modal';
import { Table } from '@/src/components/ui/Table';
import { LoadingState, ErrorState } from '@/src/components/ui/States';
import { Badge } from '@/src/components/ui/Badge';
import { Alert } from '@/src/components/ui/Alert';
import { kmsApi } from '@/src/lib/api';
import {
  GitPullRequestArrow,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileCheck,
  UserCheck,
  ArrowRight,
  ShieldCheck,
  Building,
  Filter
} from 'lucide-react';

interface TransferCase {
  id: string;
  title: string;
  reasonType: string;
  startDate?: string;
  expectedCompletionDate?: string;
  status: string;
  priority: string;
  notes?: string;
  clearanceStatus: string;
  createdAt: string;
  employee?: { id: string; username: string; fullName: string; email: string; jobTitle?: string };
  manager?: { id: string; username: string; fullName: string; email: string };
  successor?: { id: string; username: string; fullName: string; email: string; jobTitle?: string };
  department?: { id: string; name: string; code: string };
}

export default function KnowledgeTransferDashboardPage() {
  const router = useRouter();
  const [cases, setCases] = useState<TransferCase[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [deptFilter, setDeptFilter] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [successorId, setSuccessorId] = useState('');
  const [managerId, setManagerId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [reasonType, setReasonType] = useState('RESIGNATION');
  const [priority, setPriority] = useState('MEDIUM');
  const [expectedDate, setExpectedDate] = useState('');
  const [notes, setNotes] = useState('');

  const loadCases = useCallback(() => {
    setIsLoading(true);
    setError(null);
    kmsApi.knowledgeTransfer.listCases({
      search: search || undefined,
      status: statusFilter !== 'ALL' ? statusFilter : undefined,
      departmentId: deptFilter || undefined,
      size: 50,
      sort: 'createdAt,desc',
    })
      .then((data) => {
        const list = Array.isArray(data) ? data : data?.content ?? [];
        setCases(list);
      })
      .catch((err) => setError(err.message || 'Failed to load knowledge transfer cases'))
      .finally(() => setIsLoading(false));
  }, [search, statusFilter, deptFilter]);

  useEffect(() => {
    loadCases();
  }, [loadCases]);

  useEffect(() => {
    // Load metadata for creation modal and filters
    kmsApi.departments.getActive().then(setDepartments).catch(() => {});
    kmsApi.admin.getUsers().then(setUsers).catch(() => {});
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !employeeId) {
      setError('Title and Employee selection are required');
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const created = await kmsApi.knowledgeTransfer.createCase({
        title: title.trim(),
        employeeId,
        successorId: successorId || undefined,
        managerId: managerId || undefined,
        departmentId: departmentId || undefined,
        reasonType,
        priority,
        expectedCompletionDate: expectedDate || undefined,
        notes: notes || undefined,
      });

      setNotice('Knowledge Transfer Case initiated successfully.');
      setIsModalOpen(false);
      resetForm();
      loadCases();
      if (created?.id) {
        router.push(`/knowledge-transfer/${created.id}`);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to initiate transfer case');
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setEmployeeId('');
    setSuccessorId('');
    setManagerId('');
    setDepartmentId('');
    setReasonType('RESIGNATION');
    setPriority('MEDIUM');
    setExpectedDate('');
    setNotes('');
  };

  // Status Metrics
  const totalCount = cases.length;
  const activeCount = cases.filter(c => c.status === 'INITIATED' || c.status === 'IN_PROGRESS' || c.status === 'UNDER_REVIEW').length;
  const clearedCount = cases.filter(c => c.clearanceStatus === 'CLEARED' || c.status === 'COMPLETED').length;
  const pendingClearanceCount = cases.filter(c => c.status !== 'COMPLETED' && c.status !== 'CANCELLED').length;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED': return <Badge label="Completed" variant="green" />;
      case 'IN_PROGRESS': return <Badge label="In Progress" variant="blue" />;
      case 'UNDER_REVIEW': return <Badge label="Under Review" variant="amber" />;
      case 'CHANGES_REQUESTED': return <Badge label="Changes Requested" variant="red" />;
      case 'INITIATED': return <Badge label="Initiated" variant="slate" />;
      case 'CANCELLED': return <Badge label="Cancelled" variant="slate" />;
      default: return <Badge label={status} variant="slate" />;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'CRITICAL': return <Badge label="Critical" variant="red" />;
      case 'HIGH': return <Badge label="High" variant="amber" />;
      case 'MEDIUM': return <Badge label="Medium" variant="blue" />;
      case 'LOW': return <Badge label="Low" variant="slate" />;
      default: return <Badge label={priority} variant="slate" />;
    }
  };

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header & Breadcrumb */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Knowledge Transfer' }]} />
            <h1 className="text-2xl font-bold text-gray-900 mt-1 flex items-center gap-2">
              <GitPullRequestArrow className="w-7 h-7 text-indigo-600" />
              Knowledge Transfer & Handover Cases
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Manage exit transitions, handover plans, structured knowledge capture, handover sessions, and exit clearance.
            </p>
          </div>

          <Button
            variant="primary"
            className="flex items-center gap-2 self-start sm:self-auto bg-indigo-600 hover:bg-indigo-700"
            onClick={() => setIsModalOpen(true)}
          >
            <Plus className="w-4 h-4" />
            Initiate Transfer Case
          </Button>
        </div>

        {/* Notices and Alerts */}
        {notice && <Alert type="success">{notice}</Alert>}
        {error && <Alert type="error">{error}</Alert>}

        {/* Scorecard Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Cases</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{totalCount}</p>
            </div>
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
              <FileCheck className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Active Handover</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">{activeCount}</p>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
              <Clock className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Pending Clearance</p>
              <p className="text-2xl font-bold text-amber-600 mt-1">{pendingClearanceCount}</p>
            </div>
            <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
              <AlertCircle className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Cleared & Completed</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">{clearedCount}</p>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="w-full md:w-80 relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search by title or employee..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">All Statuses</option>
                <option value="INITIATED">Initiated</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="UNDER_REVIEW">Under Review</option>
                <option value="CHANGES_REQUESTED">Changes Requested</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>

            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Cases Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-12"><LoadingState message="Loading knowledge transfer cases..." /></div>
          ) : cases.length === 0 ? (
            <div className="p-12 text-center">
              <GitPullRequestArrow className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-gray-700">No Knowledge Transfer cases found</h3>
              <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
                No transfer cases match your criteria. Click &quot;Initiate Transfer Case&quot; to begin a new employee handover.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    <th className="px-5 py-3">Case Title / Reason</th>
                    <th className="px-5 py-3">Source Employee</th>
                    <th className="px-5 py-3">Successor</th>
                    <th className="px-5 py-3">Department</th>
                    <th className="px-5 py-3">Priority</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Exit Clearance</th>
                    <th className="px-5 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {cases.map((c) => (
                    <tr
                      key={c.id}
                      className="hover:bg-indigo-50/40 transition-colors cursor-pointer"
                      onClick={() => router.push(`/knowledge-transfer/${c.id}`)}
                    >
                      <td className="px-5 py-4">
                        <div className="font-semibold text-gray-900">{c.title}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{c.reasonType}</div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-medium text-gray-800">{c.employee?.fullName || c.employee?.username || '—'}</div>
                        <div className="text-xs text-gray-500">{c.employee?.jobTitle || c.employee?.email}</div>
                      </td>
                      <td className="px-5 py-4">
                        {c.successor ? (
                          <div>
                            <div className="font-medium text-gray-800">{c.successor.fullName || c.successor.username}</div>
                            <div className="text-xs text-gray-500">{c.successor.jobTitle || c.successor.email}</div>
                          </div>
                        ) : (
                          <span className="text-xs text-amber-600 font-medium">Unassigned</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-gray-700">
                        {c.department?.name || '—'}
                      </td>
                      <td className="px-5 py-4">
                        {getPriorityBadge(c.priority)}
                      </td>
                      <td className="px-5 py-4">
                        {getStatusBadge(c.status)}
                      </td>
                      <td className="px-5 py-4">
                        {c.clearanceStatus === 'CLEARED' ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-200">
                            <ShieldCheck className="w-3.5 h-3.5" /> Cleared
                          </span>
                        ) : c.clearanceStatus === 'READY_FOR_CLEARANCE' ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-1 rounded-full border border-blue-200">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Ready
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-1 rounded-full border border-amber-200">
                            <Clock className="w-3.5 h-3.5" /> Pending
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <Link
                          href={`/knowledge-transfer/${c.id}`}
                          className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-medium text-xs"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Workspace <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Initiate Knowledge Transfer Case Modal */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Initiate Knowledge Transfer Case"
        >
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Case Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Senior Backend Engineer Handover"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Source Employee <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select Employee...</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.fullName || u.username} ({u.username})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Successor / Knowledge Receiver
                </label>
                <select
                  value={successorId}
                  onChange={(e) => setSuccessorId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Assign Later / None</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.fullName || u.username} ({u.username})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Reason / Event Type
                </label>
                <select
                  value={reasonType}
                  onChange={(e) => setReasonType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="RESIGNATION">Resignation</option>
                  <option value="TRANSFER">Internal Transfer</option>
                  <option value="RETIREMENT">Retirement</option>
                  <option value="TERMINATION">Termination</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Priority
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Department
                </label>
                <select
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Employee Default</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Expected Completion Date
                </label>
                <input
                  type="date"
                  value={expectedDate}
                  onChange={(e) => setExpectedDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Handover Notes / Instructions
              </label>
              <textarea
                rows={3}
                placeholder="Key context, transition expectations, or urgency notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-gray-200">
              <Button
                variant="secondary"
                type="button"
                onClick={() => setIsModalOpen(false)}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                type="submit"
                disabled={isSaving}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                {isSaving ? 'Initiating...' : 'Create Case & Seed Checklist'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </AppShell>
  );
}
