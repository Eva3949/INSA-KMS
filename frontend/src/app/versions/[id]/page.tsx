'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/src/components/layout/AppShell';
import { Breadcrumb } from '@/src/components/ui/Breadcrumb';
import { Button } from '@/src/components/ui/Button';
import { Badge } from '@/src/components/ui/Badge';
import { Table } from '@/src/components/ui/Table';
import { LoadingState, ErrorState } from '@/src/components/ui/States';
import { History, Download, RotateCcw, FileText, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081/api/v1';

interface Version {
  id: string;
  versionNumber: number;
  fileName: string;
  uploadedBy: string;
  uploadedAt: string;
  fileSizeBytes: number;
  changeSummary: string;
  isCurrentVersion: boolean;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function formatTimestamp(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}

export default function VersionHistoryPage({ params }: { params: { id: string } }) {
  const docId = params.id;
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVersions = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = sessionStorage.getItem('kms_access_token');
      const res = await fetch(`${API_BASE_URL}/documents/${docId}/versions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Failed to fetch versions (${res.status})`);
      const data: Version[] = await res.json();
      setVersions(data);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVersions();
  }, [docId]);

  const handleRollback = async (versionId: string) => {
    try {
      const token = sessionStorage.getItem('kms_access_token');
      const res = await fetch(`${API_BASE_URL}/documents/${docId}/versions/${versionId}/rollback`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Rollback failed (${res.status})`);
      await fetchVersions();
    } catch (err: any) {
      alert(err.message || 'Rollback failed.');
    }
  };

  const columns = [
    {
      header: 'Version',
      accessor: (ver: Version) => (
        <div className="flex items-center gap-2 font-mono font-bold text-xs">
          <span className="text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
            v{ver.versionNumber}.0
          </span>
          {ver.isCurrentVersion && (
            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-sans uppercase font-bold border border-emerald-200">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Active Version
            </span>
          )}
        </div>
      ),
    },
    {
      header: 'File Name',
      accessor: (ver: Version) => (
        <span className="font-medium text-kms-slate-900">{ver.fileName}</span>
      ),
    },
    {
      header: 'Author',
      accessor: (ver: Version) => <span className="text-xs text-kms-slate-600">{ver.uploadedBy}</span>,
    },
    {
      header: 'Timestamp',
      accessor: (ver: Version) => <span className="text-xs text-kms-slate-500">{formatTimestamp(ver.uploadedAt)}</span>,
    },
    {
      header: 'Change Note / Summary',
      accessor: (ver: Version) => (
        <span className="text-xs text-kms-slate-700 italic">{ver.changeSummary}</span>
      ),
    },
    {
      header: 'Actions',
      accessor: (ver: Version) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            icon={<Download className="w-3.5 h-3.5" />}
            title="Download Version"
            onClick={() => {
              if (ver.isCurrentVersion) {
                window.open(`${API_BASE_URL}/documents/${docId}/download`, '_blank');
              } else {
                alert('Historical version download requires rollback first. Click "Rollback" to restore this version, then download.');
              }
            }}
          />
          {!ver.isCurrentVersion && (
            <Button
              variant="outline"
              size="sm"
              icon={<RotateCcw className="w-3.5 h-3.5 text-amber-700" />}
              title="Rollback to this Version"
              onClick={() => handleRollback(ver.id)}
            >
              Rollback
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <AppShell>
      <div className="space-y-5">
        <div className="flex items-center justify-between border-b border-kms-slate-200 pb-3">
          <div>
            <Breadcrumb
              items={[
                { label: 'Document Library', href: '/library' },
                { label: `Document #${docId}`, href: `/preview/${docId}` },
                { label: 'Version History' },
              ]}
            />
            <h1 className="text-xl font-bold text-kms-slate-900 tracking-tight flex items-center gap-2">
              <History className="w-5 h-5 text-blue-700" />
              Version History & Revision Provenance
            </h1>
          </div>

          <Link href={`/preview/${docId}`}>
            <Button variant="outline" size="sm" icon={<FileText className="w-4 h-4" />}>
              Back to Preview Workspace
            </Button>
          </Link>
        </div>

        {loading && <LoadingState message="Loading version history..." />}
        {error && <ErrorState message={error} onRetry={fetchVersions} />}
        {!loading && !error && (
          <Table
            columns={columns}
            data={versions}
            keyExtractor={(item) => item.id}
            emptyText="No version history records found."
          />
        )}
      </div>
    </AppShell>
  );
}
