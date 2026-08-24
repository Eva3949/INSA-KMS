'use client';

import React from 'react';
import { AppShell } from '@/src/components/layout/AppShell';
import { Breadcrumb } from '@/src/components/ui/Breadcrumb';
import { Card } from '@/src/components/ui/Card';
import { Button } from '@/src/components/ui/Button';
import { Select } from '@/src/components/ui/Input';
import { Table } from '@/src/components/ui/Table';
import { Badge } from '@/src/components/ui/Badge';
import { LoadingState } from '@/src/components/ui/States';
import { Alert } from '@/src/components/ui/Alert';
import { kmsApi } from '@/src/lib/api';
import { BarChart2, AlertTriangle, RefreshCw, Search, Users, TrendingUp, PlayCircle } from 'lucide-react';
import Link from 'next/link';

interface GrowthRow {
  month: string;
  documentCount: number;
  bytesAdded: number;
}

interface ActiveUserRow {
  userId: string;
  userEmail?: string | null;
  actionCount: number;
  lastActivity: string;
}

interface TopSearchRow {
  query: string;
  hitCount: number;
  lastSearched: string;
}

interface StaleRow {
  documentId: string;
  title: string;
  owner: string;
  ownerEmail?: string | null;
  department: string;
  confidentialityLevel: string;
  orphaned: boolean;
  lastActivity: string;
}

function formatBytes(bytes: number): string {
  if (!bytes) return '0 B';
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) return `${gb.toFixed(2)} GB`;
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}

function daysSince(iso: string): number {
  if (!iso) return 0;
  return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 86400000));
}

export default function AdminReportsPage() {
  const [growth, setGrowth] = React.useState<GrowthRow[]>([]);
  const [activeUsers, setActiveUsers] = React.useState<ActiveUserRow[]>([]);
  const [topSearches, setTopSearches] = React.useState<TopSearchRow[]>([]);
  const [staleItems, setStaleItems] = React.useState<StaleRow[]>([]);

  const [staleThresholdDays, setStaleThresholdDays] = React.useState('365');
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [isRunningRetention, setIsRunningRetention] = React.useState(false);

  const load = React.useCallback((thresholdDays: string) => {
    setIsLoading(true);
    setError(null);
    Promise.all([
      kmsApi.admin.getStorageGrowthReport(12),
      kmsApi.admin.getActiveUsersReport(30, 10),
      kmsApi.admin.getTopSearchesReport(30, 10),
      kmsApi.admin.getStaleContentReport(Number(thresholdDays) || 365, 100),
    ])
      .then(([growthRes, usersRes, searchRes, staleRes]) => {
        setGrowth((growthRes?.data ?? []) as GrowthRow[]);
        setActiveUsers((usersRes?.data ?? []) as ActiveUserRow[]);
        setTopSearches((searchRes?.data ?? []) as TopSearchRow[]);
        setStaleItems((staleRes?.data ?? []) as StaleRow[]);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Failed to load reports'))
      .finally(() => setIsLoading(false));
  }, []);

  React.useEffect(() => {
    load(staleThresholdDays);
  }, [load, staleThresholdDays]);

  const handleRunRetention = async () => {
    setIsRunningRetention(true);
    setNotice(null);
    try {
      const result = await kmsApi.admin.runRetentionDispositions();
      setNotice(
        `Disposition run complete — archived: ${result.archived}, purged: ${result.purged}, flagged for review: ${result.reviewFlagged}, skipped (legal hold): ${result.skippedOnLegalHold}.`
      );
      load(staleThresholdDays);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Retention run failed');
    } finally {
      setIsRunningRetention(false);
    }
  };

  const maxBytes = Math.max(1, ...growth.map((g) => g.bytesAdded));

  const staleColumns = [
    {
      header: 'Document',
      accessor: (item: StaleRow) => (
        <Link href={`/preview/${item.documentId}`} className="font-semibold text-blue-700 hover:underline text-xs">
          {item.title}
        </Link>
      ),
    },
    {
      header: 'Owner',
      accessor: (item: StaleRow) => (
        <span className="text-xs text-kms-slate-700">
          {item.orphaned ? <span className="text-amber-700 font-semibold">{item.owner} (inactive)</span> : item.owner}
        </span>
      ),
    },
    { header: 'Department', accessor: (item: StaleRow) => <span className="text-xs text-kms-slate-600">{item.department}</span> },
    {
      header: 'Classification',
      accessor: (item: StaleRow) => <Badge label={item.confidentialityLevel} classification={item.confidentialityLevel as any} />,
    },
    {
      header: 'Last Activity',
      accessor: (item: StaleRow) => (
        <span className="text-xs font-mono text-kms-slate-600">
          {item.lastActivity ? `${new Date(item.lastActivity).toLocaleDateString()} (${daysSince(item.lastActivity)}d ago)` : '-'}
        </span>
      ),
    },
    {
      header: 'Flag',
      accessor: (item: StaleRow) =>
        item.orphaned ? <Badge label="ORPHANED" variant="amber" /> : <Badge label="STALE" variant="slate" />,
    },
  ];

  return (
    <AppShell requiredRole="ROLE_ADMIN">
      <div className="space-y-5">
        <div className="flex items-center justify-between border-b border-kms-slate-200 pb-3">
          <div>
            <Breadcrumb items={[{ label: 'Administration', href: '/admin' }, { label: 'Usage & Reports' }]} />
            <h1 className="text-xl font-bold text-kms-slate-900 tracking-tight flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-blue-700" />
              Usage, Storage Growth & Stale Content Reports
            </h1>
            <p className="text-[11px] text-kms-slate-500 mt-1">FR-30 usage reporting · FR-31 orphaned & stale content</p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={<PlayCircle className="w-4 h-4" />}
              onClick={handleRunRetention}
              disabled={isRunningRetention}
            >
              {isRunningRetention ? 'Running...' : 'Run Disposition Job'}
            </Button>
            <Button variant="outline" size="sm" icon={<RefreshCw className="w-4 h-4" />} onClick={() => load(staleThresholdDays)}>
              Refresh
            </Button>
          </div>
        </div>

        {notice && <Alert type="success">{notice}</Alert>}
        {error && <Alert type="error">{error}</Alert>}

        {isLoading ? (
          <LoadingState message="Compiling repository reports..." />
        ) : (
          <>
            <Card title="Content & Storage Growth — last 12 months (FR-30)">
              {growth.length === 0 ? (
                <p className="text-xs text-kms-slate-500 py-4 text-center">No document activity recorded yet.</p>
              ) : (
                <div className="space-y-2">
                  {growth.map((g) => (
                    <div key={g.month} className="flex items-center gap-3 text-xs">
                      <span className="font-mono text-kms-slate-600 w-16 shrink-0">{g.month}</span>
                      <div className="flex-1 bg-kms-slate-100 rounded-full h-3 overflow-hidden">
                        <div className="h-3 bg-blue-600 rounded-full" style={{ width: `${(g.bytesAdded / maxBytes) * 100}%` }} />
                      </div>
                      <span className="font-mono text-kms-slate-800 w-24 text-right shrink-0">{formatBytes(g.bytesAdded)}</span>
                      <span className="font-mono text-kms-slate-500 w-20 text-right shrink-0">{g.documentCount} docs</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card title="Most Active Users — last 30 days">
                {activeUsers.length === 0 ? (
                  <p className="text-xs text-kms-slate-500 py-4 text-center">No recorded activity in the period.</p>
                ) : (
                  <div className="space-y-1.5">
                    {activeUsers.map((u) => (
                      <div key={u.userId} className="flex items-center justify-between text-xs border-b border-kms-slate-100 pb-1.5 last:border-0">
                        <span className="flex items-center gap-1.5 text-kms-slate-800 font-medium">
                          <Users className="w-3.5 h-3.5 text-kms-slate-400" />
                          {u.userEmail || u.userId}
                        </span>
                        <span className="font-mono font-bold text-blue-700">{u.actionCount} actions</span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              <Card title="Top Searches — last 30 days">
                {topSearches.length === 0 ? (
                  <p className="text-xs text-kms-slate-500 py-4 text-center">No searches logged yet.</p>
                ) : (
                  <div className="space-y-1.5">
                    {topSearches.map((s) => (
                      <div key={s.query} className="flex items-center justify-between text-xs border-b border-kms-slate-100 pb-1.5 last:border-0">
                        <span className="flex items-center gap-1.5 text-kms-slate-800 font-medium truncate">
                          <Search className="w-3.5 h-3.5 text-kms-slate-400 shrink-0" />
                          {s.query}
                        </span>
                        <span className="font-mono font-bold text-emerald-700 shrink-0">{s.hitCount}x</span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>

            <Card
              title="Orphaned & Stale Content (FR-31)"
              action={
                <div className="w-56">
                  <Select
                    value={staleThresholdDays}
                    onChange={(e) => setStaleThresholdDays(e.target.value)}
                    options={[
                      { value: '90', label: 'Inactive > 90 days' },
                      { value: '180', label: 'Inactive > 180 days' },
                      { value: '365', label: 'Inactive > 1 year' },
                      { value: '730', label: 'Inactive > 2 years' },
                    ]}
                  />
                </div>
              }
            >
              <div className="flex items-center gap-2 mb-3 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded p-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                {staleItems.length} document(s) flagged: no recent access or owner deactivated. Review for archival or
                re-assignment.
              </div>
              <Table
                columns={staleColumns}
                data={staleItems}
                keyExtractor={(item) => item.documentId}
                emptyText="No stale or orphaned content detected."
              />
            </Card>
          </>
        )}
      </div>
    </AppShell>
  );
}
