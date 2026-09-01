'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { AppShell } from '@/src/components/layout/AppShell';
import { Breadcrumb } from '@/src/components/ui/Breadcrumb';
import { Button } from '@/src/components/ui/Button';
import { LoadingState } from '@/src/components/ui/States';
import { Badge } from '@/src/components/ui/Badge';
import { Alert } from '@/src/components/ui/Alert';
import { kmsApi } from '@/src/lib/api';
import {
  Users,
  ArrowLeft,
  Mail,
  Phone,
  Building,
  Briefcase,
  ShieldCheck,
  Calendar,
  GitPullRequestArrow,
  Clock,
  ArrowRight,
  FileCheck
} from 'lucide-react';

export default function HrEmployeeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    kmsApi.hr.getEmployeeKnowledge(id)
      .then(setData)
      .catch((err) => setError(err.message || 'Failed to load employee profile'))
      .finally(() => setIsLoading(false));
  }, [id]);

  if (isLoading || !data) {
    return (
      <AppShell>
        <div className="p-12"><LoadingState message="Loading employee HR profile..." /></div>
      </AppShell>
    );
  }

  const emp = data.employee || {};
  const outgoing = data.outgoingTransfers || [];
  const incoming = data.incomingTransfers || [];

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <Breadcrumb items={[
              { label: 'Home', href: '/' },
              { label: 'HR & Employees', href: '/hr/employees' },
              { label: emp.fullName || emp.username }
            ]} />
            <div className="flex items-center gap-3 mt-1">
              <Link href="/hr/employees" className="text-gray-400 hover:text-gray-600">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">
                {emp.fullName || emp.username}
              </h1>
              <Badge
                label={emp.employmentStatus}
                variant={emp.employmentStatus === 'ACTIVE' ? 'green' : 'slate'}
              />
            </div>
            <p className="text-sm text-gray-500 mt-0.5">
              @{emp.username} • {emp.jobTitle || 'No position title set'} • {emp.department?.name || 'No Department'}
            </p>
          </div>

          <Link href="/knowledge-transfer">
            <Button variant="primary" className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700">
              <GitPullRequestArrow className="w-4 h-4" />
              Initiate Transfer Case
            </Button>
          </Link>
        </div>

        {error && <Alert type="error">{error}</Alert>}

        {/* Profile Details Grid */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-6">
          <h3 className="text-base font-bold text-gray-900 border-b border-gray-100 pb-3">
            Employee HR Information
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 text-sm">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase">Username / ID</p>
              <p className="font-semibold text-gray-900 mt-0.5">{emp.username}</p>
              {emp.employeeNumber && <p className="text-xs text-gray-500">ID: {emp.employeeNumber}</p>}
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase">Department</p>
              <p className="font-semibold text-gray-900 mt-0.5">{emp.department?.name || 'Unassigned'}</p>
              {emp.department?.code && <p className="text-xs text-gray-500">Code: {emp.department.code}</p>}
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase">Job Title / Position</p>
              <p className="font-semibold text-gray-900 mt-0.5">{emp.jobTitle || 'Not specified'}</p>
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase">Employment Status</p>
              <p className="font-semibold text-gray-900 mt-0.5">{emp.employmentStatus}</p>
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase">Direct Manager</p>
              <p className="font-semibold text-gray-900 mt-0.5">{emp.manager?.fullName || emp.manager?.username || 'None'}</p>
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase">Contact Information</p>
              <p className="text-gray-900 mt-0.5">{emp.email}</p>
              {emp.phone && <p className="text-xs text-gray-500">{emp.phone}</p>}
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase">Hire Date</p>
              <p className="font-semibold text-gray-900 mt-0.5">{emp.hireDate || 'Not recorded'}</p>
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase">System Role</p>
              <p className="font-semibold text-gray-900 mt-0.5">{emp.roleName}</p>
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase">Account Status</p>
              <p className="font-semibold text-emerald-600 mt-0.5">{emp.isActive ? 'Active' : 'Inactive'}</p>
            </div>
          </div>
        </div>

        {/* Knowledge Transfer Associations */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Outgoing Handover */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <GitPullRequestArrow className="w-5 h-5 text-indigo-600" />
                Outgoing Handover Cases ({outgoing.length})
              </h3>
            </div>
            <p className="text-xs text-gray-500">Knowledge transfer cases where this employee is the departing knowledge owner.</p>

            {outgoing.length === 0 ? (
              <p className="text-xs text-gray-400 italic py-4 text-center">No outgoing transfer cases found.</p>
            ) : (
              <div className="space-y-3">
                {outgoing.map((c: any) => (
                  <Link
                    key={c.id}
                    href={`/knowledge-transfer/${c.id}`}
                    className="block p-3 border border-gray-200 rounded-lg hover:bg-indigo-50/40 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-gray-900">{c.title}</p>
                      <Badge
                        label={c.status}
                        variant={c.status === 'COMPLETED' ? 'green' : 'blue'}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Reason: {c.reasonType} • Successor: {c.successor || 'Unassigned'} • Clearance: {c.clearanceStatus}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Incoming Handover */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-600" />
                Incoming Handover Cases ({incoming.length})
              </h3>
            </div>
            <p className="text-xs text-gray-500">Knowledge transfer cases where this employee is assigned as the knowledge receiver / successor.</p>

            {incoming.length === 0 ? (
              <p className="text-xs text-gray-400 italic py-4 text-center">No incoming transfer cases assigned.</p>
            ) : (
              <div className="space-y-3">
                {incoming.map((c: any) => (
                  <Link
                    key={c.id}
                    href={`/knowledge-transfer/${c.id}`}
                    className="block p-3 border border-gray-200 rounded-lg hover:bg-emerald-50/40 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-gray-900">{c.title}</p>
                      <Badge
                        label={c.status}
                        variant={c.status === 'COMPLETED' ? 'green' : 'blue'}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Reason: {c.reasonType} • Source Owner: {c.employee || '—'} • Clearance: {c.clearanceStatus}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
