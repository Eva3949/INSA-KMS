'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AppShell } from '@/src/components/layout/AppShell';
import { Breadcrumb } from '@/src/components/ui/Breadcrumb';
import { Button } from '@/src/components/ui/Button';
import { Badge } from '@/src/components/ui/Badge';
import { Table } from '@/src/components/ui/Table';
import { LoadingState, ErrorState } from '@/src/components/ui/States';
import { Bookmark, Bell, Play, Trash2, BellRing, Filter, Search } from 'lucide-react';
import Link from 'next/link';
import { kmsApi } from '@/src/lib/api';

interface SavedSearch {
  id: string;
  name: string;
  queryJson: string;
  createdAt: string;
  alertEnabled?: boolean;
  alertFrequency?: string;
  lastAlertAt?: string;
}

interface ParsedQuery {
  queryText: string;
  deptId?: string;
  docTypeId?: string;
  confidentiality?: string;
  sortBy?: string;
}

function parseQueryDefinition(queryJson: string): ParsedQuery {
  if (!queryJson) return { queryText: '' };
  try {
    const parsed = JSON.parse(queryJson);
    if (typeof parsed === 'object' && parsed !== null) {
      return {
        queryText: parsed.query || '',
        deptId: parsed.deptId,
        docTypeId: parsed.docTypeId,
        confidentiality: parsed.confidentiality,
        sortBy: parsed.sortBy,
      };
    }
  } catch {}
  return { queryText: queryJson };
}

function buildRunSearchUrl(queryJson: string): string {
  const parsed = parseQueryDefinition(queryJson);
  const params = new URLSearchParams();
  if (parsed.queryText) params.set('q', parsed.queryText);
  if (parsed.deptId) params.set('deptId', parsed.deptId);
  if (parsed.docTypeId) params.set('docTypeId', parsed.docTypeId);
  if (parsed.confidentiality) params.set('confidentiality', parsed.confidentiality);
  if (parsed.sortBy) params.set('sortBy', parsed.sortBy);
  return `/search?${params.toString()}`;
}

export default function SavedSearchesPage() {
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSavedSearches = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await kmsApi.savedSearches.list();
      setSavedSearches(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch saved searches.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSavedSearches();
  }, [fetchSavedSearches]);

  const handleDelete = async (id: string) => {
    try {
      await kmsApi.savedSearches.delete(id);
      setSavedSearches((prev) => prev.filter((s) => s.id !== id));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to delete saved search.');
    }
  };

  const handleToggleAlert = async (id: string, current: boolean) => {
    try {
      await kmsApi.savedSearches.update(id, { alertEnabled: !current });
      setSavedSearches((prev) => prev.map((s) => s.id === id ? { ...s, alertEnabled: !current } : s));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to update alert.');
    }
  };

  const handleFrequencyChange = async (id: string, freq: string) => {
    try {
      await kmsApi.savedSearches.update(id, { alertFrequency: freq });
      setSavedSearches((prev) => prev.map((s) => s.id === id ? { ...s, alertFrequency: freq } : s));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to update frequency.');
    }
  };

  const columns = [
    {
      header: 'Saved Search Name',
      accessor: (item: SavedSearch) => (
        <div className="font-semibold text-kms-slate-900 flex items-center gap-2">
          <Bookmark className="w-4 h-4 text-blue-700 shrink-0" />
          <span>{item.name}</span>
        </div>
      ),
    },
    {
      header: 'Query & Filters',
      accessor: (item: SavedSearch) => {
        const parsed = parseQueryDefinition(item.queryJson);
        return (
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-mono text-xs bg-kms-slate-100 px-2 py-0.5 rounded text-kms-slate-800 font-semibold">
                {parsed.queryText || '(all documents)'}
              </span>
              {parsed.confidentiality && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-medium">
                  {parsed.confidentiality}
                </span>
              )}
              {parsed.sortBy && parsed.sortBy !== 'relevance' && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-medium">
                  Sort: {parsed.sortBy}
                </span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      header: 'Created',
      accessor: (item: SavedSearch) => (
        <span className="text-xs text-kms-slate-500">
          {new Date(item.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      header: 'Alerts',
      accessor: (item: SavedSearch) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleToggleAlert(item.id, item.alertEnabled ?? false)}
            className={`p-1.5 rounded transition-colors ${item.alertEnabled ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' : 'bg-kms-slate-100 text-kms-slate-400 hover:bg-kms-slate-200'}`}
            title={item.alertEnabled ? 'Alerts enabled — click to disable' : 'Alerts disabled — click to enable'}
          >
            {item.alertEnabled ? <BellRing className="w-3.5 h-3.5" /> : <Bell className="w-3.5 h-3.5" />}
          </button>
          {item.alertEnabled && (
            <select
              value={item.alertFrequency || 'DAILY'}
              onChange={(e) => handleFrequencyChange(item.id, e.target.value)}
              className="text-[11px] border border-kms-slate-200 rounded px-1.5 py-0.5 text-kms-slate-700 bg-white"
            >
              <option value="HOURLY">Hourly</option>
              <option value="DAILY">Daily</option>
              <option value="WEEKLY">Weekly</option>
            </select>
          )}
        </div>
      ),
    },
    {
      header: 'Actions',
      accessor: (item: SavedSearch) => (
        <div className="flex items-center gap-1">
          <Link href={buildRunSearchUrl(item.queryJson)}>
            <Button variant="outline" size="sm" icon={<Play className="w-3.5 h-3.5" />}>
              Run Query
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="sm"
            icon={<Trash2 className="w-3.5 h-3.5 text-red-600" />}
            onClick={() => handleDelete(item.id)}
            title="Delete saved search"
          />
        </div>
      ),
    },
  ];

  return (
    <AppShell>
      <div className="space-y-5">
        <div className="flex items-center justify-between border-b border-kms-slate-200 pb-3">
          <div>
            <Breadcrumb items={[{ label: 'Search & Discovery', href: '/search' }, { label: 'Saved Searches' }]} />
            <h1 className="text-xl font-bold text-kms-slate-900 tracking-tight flex items-center gap-2">
              <Bookmark className="w-5 h-5 text-blue-700" />
              Saved Searches &amp; Automated Email Alerts
            </h1>
          </div>

          <Link href="/search">
            <Button variant="primary" size="sm" icon={<Bookmark className="w-4 h-4" />}>
              New Saved Search
            </Button>
          </Link>
        </div>

        {loading && <LoadingState message="Loading saved searches..." />}
        {error && <ErrorState message={error} onRetry={fetchSavedSearches} />}
        {!loading && !error && (
          <Table
            columns={columns}
            data={savedSearches}
            keyExtractor={(item) => item.id}
            emptyText="No saved searches configured yet."
          />
        )}
      </div>
    </AppShell>
  );
}

