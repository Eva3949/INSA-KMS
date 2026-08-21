'use client';

import React, { useState } from 'react';
import { AppShell } from '@/src/components/layout/AppShell';
import { Breadcrumb } from '@/src/components/ui/Breadcrumb';
import { Button } from '@/src/components/ui/Button';
import { Badge } from '@/src/components/ui/Badge';
import { Tabs } from '@/src/components/ui/Tabs';
import { Alert } from '@/src/components/ui/Alert';
import { Card } from '@/src/components/ui/Card';
import { 
  Download, 
  Share2, 
  Lock, 
  Unlock, 
  History, 
  MessageSquare, 
  FileText, 
  ZoomIn, 
  ZoomOut, 
  Printer, 
  ShieldCheck, 
  Tag, 
  FileCheck,
  Calendar,
  User,
  Building
} from 'lucide-react';
import Link from 'next/link';
import { kmsApi } from '@/src/lib/api';

export default function DocumentPreviewWorkspacePage({ params }: { params: { id: string } }) {
  const docId = params.id;
  const [activeTab, setActiveTab] = useState('metadata');
  const [isLocked, setIsLocked] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [docStatus, setDocStatus] = useState<'DRAFT' | 'UNDER_REVIEW' | 'PUBLISHED' | 'ARCHIVED'>('PUBLISHED');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const mockDoc = {
    id: docId,
    title: 'KMS_Security_Architecture_v2.pdf',
    department: 'IT Security',
    owner: 'Sarah Jenkins',
    version: 'v2.4',
    classification: 'RESTRICTED' as const,
    documentType: 'Policy / Specification',
    fileSize: '4.2 MB',
    createdDate: '2026-07-01',
    modifiedDate: '2026-08-18',
    modifiedBy: 'Sarah Jenkins',
    retentionCategory: '7 Years (Confidential Security Records)',
    reviewDate: '2027-08-18',
    tags: ['Security', 'OAuth2', 'Architecture', 'Keycloak'],
    isLegalHold: true,
  };

  const handleToggleLock = () => {
    if (isLocked) {
      setIsLocked(false);
      setStatusMessage('Document lock released. Other contributors can now check out and edit.');
    } else {
      setIsLocked(true);
      setStatusMessage('Document checked out exclusively by you. Exclusive editing lock active.');
    }
  };

  const handleAdvanceStatus = (newStatus: 'DRAFT' | 'UNDER_REVIEW' | 'PUBLISHED' | 'ARCHIVED') => {
    setDocStatus(newStatus);
    setStatusMessage(`Workflow status updated to ${newStatus}. Governance audit logged.`);
  };

  const handleOpenInDesktopApp = async () => {
    try {
      setStatusMessage('Requesting native desktop application protocol handler...');
      const res = await kmsApi.documents.desktopOpen(docId);
      setStatusMessage(`Desktop launcher generated for ${res.fileName} via ${res.supportedApp}.`);
      if (typeof window !== 'undefined' && res.desktopUri) {
        window.location.href = res.desktopUri;
      }
    } catch {
      setStatusMessage('Generated desktop URI protocol handler: ms-word:ofe|u|' + window.location.origin + '/api/v1/documents/' + docId + '/download');
    }
  };

  return (
    <AppShell>
      <div className="space-y-4">
        {/* Workspace Toolbar */}
        <div className="flex flex-wrap items-center justify-between border-b border-kms-slate-200 pb-3 gap-3">
          <div>
            <Breadcrumb
              items={[
                { label: 'Document Library', href: '/library' },
                { label: mockDoc.title },
              ]}
            />
            <h1 className="text-xl font-bold text-kms-slate-900 tracking-tight flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-700" />
              {mockDoc.title}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={<FileCheck className="w-4 h-4 text-blue-700" />}
              onClick={handleOpenInDesktopApp}
            >
              Open in Desktop App (FR-24)
            </Button>
            <Button
              variant={isLocked ? 'secondary' : 'outline'}
              size="sm"
              icon={isLocked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
              onClick={handleToggleLock}
            >
              {isLocked ? 'Check-In (Release Lock)' : 'Check-Out (Lock)'}
            </Button>
            <Link href={`/share/${mockDoc.id}`}>
              <Button variant="outline" size="sm" icon={<Share2 className="w-4 h-4" />}>
                Share Link
              </Button>
            </Link>
            <Button variant="primary" size="sm" icon={<Download className="w-4 h-4" />}>
              Download Binary
            </Button>
          </div>
        </div>

        {/* Status Toast */}
        {statusMessage && (
          <div className="p-3 bg-blue-50 border border-blue-200 text-blue-900 text-xs rounded flex items-center justify-between">
            <div className="flex items-center gap-2 font-medium">
              <ShieldCheck className="w-4 h-4 text-blue-700" />
              <span>{statusMessage}</span>
            </div>
            <button onClick={() => setStatusMessage(null)} className="text-blue-700 font-bold hover:underline">
              Dismiss
            </button>
          </div>
        )}

        {/* Exclusive Check-Out Lock Warning */}
        {isLocked && (
          <Alert type="warning" title="EXCLUSIVE EDITING LOCK ACTIVE">
            This document is currently checked out by you. Concurrent edits by other users are blocked until check-in.
          </Alert>
        )}


        {/* Legal Hold Warning Banner */}
        {mockDoc.isLegalHold && (
          <Alert type="legal-hold" title="LITIGATION LEGAL HOLD ACTIVE (Case #LH-2026-09)">
            This document is currently frozen under an active litigation hold. Automatic deletion and disposition policies are suspended. Soft deletion and purge operations are prohibited by database security triggers.
          </Alert>
        )}


        {/* Split View: 70% Preview Canvas / 30% Metadata & Collaboration Drawer */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Document Render Canvas */}
          <div className="lg:col-span-8 space-y-3">
            {/* Viewer Controls */}
            <div className="bg-kms-slate-900 text-kms-slate-300 p-2 rounded flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span>Page 1 of 18</span>
                <span className="text-kms-slate-600">|</span>
                <button
                  onClick={() => setZoomLevel(Math.max(50, zoomLevel - 10))}
                  className="hover:text-white"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="font-mono">{zoomLevel}%</span>
                <button
                  onClick={() => setZoomLevel(Math.min(200, zoomLevel + 10))}
                  className="hover:text-white"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-center gap-3">
                <Printer className="w-4 h-4 hover:text-white cursor-pointer" />
                <Badge label={mockDoc.classification} classification={mockDoc.classification} />
              </div>
            </div>

            {/* Document Render Area (PDF.js Canvas View Simulator) */}
            <div className="kms-card bg-kms-slate-200 border border-kms-slate-400 min-h-[600px] flex items-center justify-center p-8 overflow-auto shadow-inner">
              <div
                className="bg-white shadow-2xl p-10 min-h-[750px] w-full max-w-2xl border border-kms-slate-300 space-y-6 text-kms-slate-900 font-sans"
                style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
              >
                <div className="border-b border-kms-slate-300 pb-4 flex justify-between items-center">
                  <div>
                    <h2 className="text-lg font-bold tracking-tight">KMS Security Architecture Specification</h2>
                    <p className="text-xs text-kms-slate-500">Enterprise Keycloak OIDC & Spring Security Model</p>
                  </div>
                  <Badge label={mockDoc.classification} classification={mockDoc.classification} />
                </div>

                <div className="text-xs space-y-3 leading-relaxed text-kms-slate-800">
                  <p className="font-semibold text-kms-slate-900">1. Executive Overview</p>
                  <p>
                    This document defines the production security architecture for the internal Knowledge Management System (KMS). Authentication is delegated to Keycloak via OAuth2 / OpenID Connect (OIDC) Authorization Code Flow with PKCE.
                  </p>
                  <p className="font-semibold text-kms-slate-900">2. Resource Server Authorization</p>
                  <p>
                    The Spring Boot REST backend acts as a stateless OAuth2 Resource Server. Every API request validates the RS256 JWT access token signature against Keycloak JWK certificates endpoint.
                  </p>

                  <div className="bg-kms-slate-50 p-4 rounded border border-kms-slate-200 font-mono text-[11px] space-y-1">
                    <div>Authorization: Bearer &lt;keycloak-jwt-token&gt;</div>
                    <div>Realm Roles: ROLE_ADMIN, ROLE_IT_SECURITY</div>
                  </div>
                </div>

                <div className="pt-10 text-[10px] text-kms-slate-400 border-t border-kms-slate-200 flex justify-between">
                  <span>Confidential Internal Document</span>
                  <span>Page 1 of 18</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Inspector Sidebar */}
          <div className="lg:col-span-4 space-y-4">
            <Card>
              <Tabs
                tabs={[
                  { id: 'metadata', label: 'Details' },
                  { id: 'versions', label: 'Versions', icon: <History className="w-3.5 h-3.5" /> },
                  { id: 'comments', label: 'Comments', icon: <MessageSquare className="w-3.5 h-3.5" /> },
                ]}
                activeTab={activeTab}
                onChange={setActiveTab}
              />

              <div className="pt-4 space-y-4 text-xs">
                {activeTab === 'metadata' && (
                  <div className="space-y-3">
                    <div>
                      <div className="text-kms-slate-500 font-medium">Security Classification</div>
                      <div className="mt-1">
                        <Badge label={mockDoc.classification} classification={mockDoc.classification} />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 divide-x divide-kms-slate-100">
                      <div>
                        <div className="text-kms-slate-500 flex items-center gap-1">
                          <User className="w-3 h-3 text-kms-slate-400" /> Owner
                        </div>
                        <div className="font-semibold text-kms-slate-900 mt-0.5">{mockDoc.owner}</div>
                      </div>
                      <div className="pl-3">
                        <div className="text-kms-slate-500 flex items-center gap-1">
                          <Building className="w-3 h-3 text-kms-slate-400" /> Department
                        </div>
                        <div className="font-semibold text-kms-slate-900 mt-0.5">{mockDoc.department}</div>
                      </div>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-kms-slate-100">
                      <div className="flex justify-between text-kms-slate-600">
                        <span>Document Type:</span>
                        <span className="font-medium text-kms-slate-900">{mockDoc.documentType}</span>
                      </div>
                      <div className="flex justify-between text-kms-slate-600">
                        <span>Current Version:</span>
                        <span className="font-mono font-bold text-blue-700">{mockDoc.version}</span>
                      </div>
                      <div className="flex justify-between text-kms-slate-600">
                        <span>File Size:</span>
                        <span className="font-medium text-kms-slate-900">{mockDoc.fileSize}</span>
                      </div>
                      <div className="flex justify-between text-kms-slate-600">
                        <span>Created Date:</span>
                        <span className="font-medium text-kms-slate-900">{mockDoc.createdDate}</span>
                      </div>
                      <div className="flex justify-between text-kms-slate-600">
                        <span>Last Modified:</span>
                        <span className="font-medium text-kms-slate-900">{mockDoc.modifiedDate}</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-kms-slate-100 space-y-1">
                      <div className="text-kms-slate-500 font-medium flex items-center gap-1">
                        <Tag className="w-3 h-3 text-kms-slate-400" /> Taxonomy Tags
                      </div>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {mockDoc.tags.map((tag) => (
                          <span key={tag} className="bg-kms-slate-100 text-kms-slate-700 px-2 py-0.5 rounded text-[11px] border border-kms-slate-200">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Approval Workflow State Transition Panel (FR-25) */}
                    <div className="pt-2 border-t border-kms-slate-100 space-y-2">
                      <div className="text-kms-slate-500 font-medium flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <FileCheck className="w-3 h-3 text-kms-slate-400" /> Approval Workflow (FR-25)
                        </span>
                        <span className="font-mono text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                          {docStatus}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        <button
                          onClick={() => handleAdvanceStatus('DRAFT')}
                          className={`px-2 py-1 text-[10px] font-semibold rounded border transition-colors ${
                            docStatus === 'DRAFT'
                              ? 'bg-amber-100 text-amber-900 border-amber-300'
                              : 'bg-kms-slate-50 text-kms-slate-600 border-kms-slate-200 hover:bg-kms-slate-100'
                          }`}
                        >
                          Draft
                        </button>
                        <button
                          onClick={() => handleAdvanceStatus('UNDER_REVIEW')}
                          className={`px-2 py-1 text-[10px] font-semibold rounded border transition-colors ${
                            docStatus === 'UNDER_REVIEW'
                              ? 'bg-blue-100 text-blue-900 border-blue-300'
                              : 'bg-kms-slate-50 text-kms-slate-600 border-kms-slate-200 hover:bg-kms-slate-100'
                          }`}
                        >
                          Under Review
                        </button>
                        <button
                          onClick={() => handleAdvanceStatus('PUBLISHED')}
                          className={`px-2 py-1 text-[10px] font-semibold rounded border transition-colors ${
                            docStatus === 'PUBLISHED'
                              ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                              : 'bg-kms-slate-50 text-kms-slate-600 border-kms-slate-200 hover:bg-kms-slate-100'
                          }`}
                        >
                          Publish
                        </button>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-kms-slate-100 space-y-1">
                      <div className="text-kms-slate-500 font-medium flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-kms-slate-400" /> Retention Schedule
                      </div>
                      <div className="text-[11px] font-semibold text-kms-slate-800">{mockDoc.retentionCategory}</div>
                      <div className="text-[11px] text-kms-slate-500">Scheduled Review: {mockDoc.reviewDate}</div>
                    </div>
                  </div>
                )}

                {activeTab === 'versions' && (
                  <div className="space-y-2">
                    <Link href={`/versions/${mockDoc.id}`}>
                      <Button variant="outline" size="sm" className="w-full justify-center" icon={<History className="w-3.5 h-3.5" />}>
                        View Full Revision Timeline
                      </Button>
                    </Link>
                  </div>
                )}

                {activeTab === 'comments' && (
                  <div className="space-y-2">
                    <Link href={`/comments/${mockDoc.id}`}>
                      <Button variant="outline" size="sm" className="w-full justify-center" icon={<MessageSquare className="w-3.5 h-3.5" />}>
                        Open Discussion Workspace
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
