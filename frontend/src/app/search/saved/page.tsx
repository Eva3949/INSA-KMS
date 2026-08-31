'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AppShell } from '@/src/components/layout/AppShell';
import { Breadcrumb } from '@/src/components/ui/Breadcrumb';
import { Button } from '@/src/components/ui/Button';
import { Badge } from '@/src/components/ui/Badge';
import { Table } from '@/src/components/ui/Table';
import { LoadingState, ErrorState } from '@/src/components/ui/States';
import { Bookmark, Bell, Play, Trash2, BellRing } from 'lucide-react';
import Link from 'next/link';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081/api/v1';

interface SavedSearch {
  id: string;
  name: string;
  queryJson: string;
  createdAt: string;
  alertEnabled?: boolean;
  alertFrequency?: string;
  lastAlertAt?: string;
}

export default function SavedSearchesPage() {
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSavedSearches = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = sessionStorage.getItem('kms_access_token');
      const res = await fetch(`${API_BASE_URL}/search/saved`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Failed to fetch saved searches (${res.status})`);
      const data: SavedSearch[] = await res.json();
      setSavedSearches(data);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSavedSearches();
  }, [fetchSavedSearches]);

  const handleDelete = async (id: string) => {
    try {
      const token = sessionStorage.getItem('kms_access_token');
      const res = await fetch(`${API_BASE_URL}/search/saved/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Failed to delete saved search (${res.status})`);
      await fetchSavedSearches();
    } catch (err: any) {
      alert(err.message || 'Failed to delete saved search.');
    }
  };

  const handleToggleAlert = async (id: string, current: boolean) => {
    try {
      const token = sessionStorage.getItem('kms_access_token');
      const res = await fetch(`${API_BASE_URL}/search/saved/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ alertEnabled: !current }),
      });
      if (!res.ok) throw new Error(`Failed to update alert setting (${res.status})`);
      setSavedSearches((prev) => prev.map((s) => s.id === id ? { ...s, alertEnabled: !current } : s));
    } catch (err: any) {
      alert(err.message || 'Failed to update alert.');
    }
  };

  const handleFrequencyChange = async (id: string, freq: string) => {
    try {
      const token = sessionStorage.getItem('kms_access_token');
      const res = await fetch(`${API_BASE_URL}/search/saved/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ alertFrequency: freq }),
      });
      if (!res.ok) throw new Error(`Failed to update frequency (${res.status})`);
      setSavedSearches((prev) => prev.map((s) => s.id === id ? { ...s, alertFrequency: freq } : s));
    } catch (err: any) {
      alert(err.message || 'Failed to update frequency.');
    }
  };

  const columns = [
    {
      header: 'Saved Search Name',
      accessor: (item: SavedSearch) => (
        <div className="font-semibold text-kms-slate-900 flex items-center gap-2">
          <Bookmark className="w-4 h-4 text-blue-700 shrink-0" />
          {item.name}
        </div>
      ),
    },
    {
      header: 'Query Definition',
      accessor: (item: SavedSearch) => (
        <span className="font-mono text-xs bg-kms-slate-100 px-2 py-1 rounded text-kms-slate-800">
          {item.queryJson}
        </span>
      ),
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
          <Link href={`/search?q=${encodeURIComponent(item.queryJson)}`}>
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
