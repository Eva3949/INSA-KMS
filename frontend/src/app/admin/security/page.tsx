'use client';

import React from 'react';
import { AppShell } from '@/src/components/layout/AppShell';
import { Breadcrumb } from '@/src/components/ui/Breadcrumb';
import { Card } from '@/src/components/ui/Card';
import { Table } from '@/src/components/ui/Table';
import { Badge } from '@/src/components/ui/Badge';
import { ShieldAlert, AlertTriangle, Lock } from 'lucide-react';

export default function AdminSecurityPage() {
  const mockAlerts = [
    {
      id: 'sec-1',
      type: 'MULTIPLE_AUTH_FAILURES',
      severity: 'HIGH',
      user: 'unknown_scanner@198.51.100.42',
      details: '15 failed password attempts on Keycloak Realm in 60 seconds.',
      timestamp: '2026-08-19 04:12:00',
    },
    {
      id: 'sec-2',
      type: 'UNAUTHORIZED_CONFIDENTIAL_DOWNLOAD_ATTEMPT',
      severity: 'CRITICAL',
      user: 'guest_user@enterprise.internal',
      details: 'Attempted REST API access to RESTRICTED file without ROLE_IT_SECURITY.',
      timestamp: '2026-08-18 22:45:11',
    },
  ];

  const columns = [
    {
      header: 'Alert Type',
      accessor: (alert: typeof mockAlerts[0]) => (
        <span className="font-mono text-xs font-bold text-red-900 flex items-center gap-1.5">
          <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
          {alert.type}
        </span>
      ),
    },
    {
      header: 'Severity',
      accessor: (alert: typeof mockAlerts[0]) => (
        <Badge label={alert.severity} variant="red" />
      ),
    },
    {
      header: 'Target User / Source',
      accessor: (alert: typeof mockAlerts[0]) => <span className="text-xs font-mono text-kms-slate-800">{alert.user}</span>,
    },
    {
      header: 'Incident Details',
      accessor: (alert: typeof mockAlerts[0]) => <span className="text-xs text-kms-slate-700">{alert.details}</span>,
    },
    {
      header: 'Timestamp',
      accessor: (alert: typeof mockAlerts[0]) => <span className="text-xs text-kms-slate-500 font-mono">{alert.timestamp}</span>,
    },
  ];

  return (
    <AppShell requiredRole="ROLE_IT_SECURITY">
      <div className="space-y-5">
        <div className="border-b border-kms-slate-200 pb-3">
          <Breadcrumb items={[{ label: 'Administration', href: '/admin' }, { label: 'Security Alerts' }]} />
          <h1 className="text-xl font-bold text-kms-slate-900 tracking-tight flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-red-600" />
            Security Incident Alerts & Anomaly Monitoring
          </h1>
        </div>

        <Table
          columns={columns}
          data={mockAlerts}
          keyExtractor={(item) => item.id}
          emptyText="No active security alerts."
        />
      </div>
    </AppShell>
  );
}


