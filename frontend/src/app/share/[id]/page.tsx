'use client';

import React, { useEffect, useState } from 'react';
import { AppShell } from '@/src/components/layout/AppShell';
import { Breadcrumb } from '@/src/components/ui/Breadcrumb';
import { Button } from '@/src/components/ui/Button';
import { Input, Select } from '@/src/components/ui/Input';
import { Card } from '@/src/components/ui/Card';
import { Badge } from '@/src/components/ui/Badge';
import { Share2, Link2, Copy, Lock, ShieldCheck, Check, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { kmsApi } from '@/src/lib/api';

interface ShareLink {
  id: string;
  token: string;
  expiryHours?: number;
  hasPassword: boolean;
  createdAt: string;
  expiresAt?: string;
}

export default function ShareDocumentPage({ params }: { params: { id: string } }) {
  const docId = params.id;
  const [targetUser, setTargetUser] = useState('');
  const [permissionLevel, setPermissionLevel] = useState('VIEW');
  const [expirationDays, setExpirationDays] = useState('7');
  const [password, setPassword] = useState('');
  const [shareLinkCopied, setShareLinkCopied] = useState(false);
  const [statusAlert, setStatusAlert] = useState<string | null>(null);
  const [activeLinks, setActiveLinks] = useState<ShareLink[]>([]);
  const [linksLoading, setLinksLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [currentLinkToken, setCurrentLinkToken] = useState('');

  const generatedLink = currentLinkToken
    ? (typeof window !== 'undefined' ? window.location.origin : 'https://kms.enterprise.internal') + `/share/${docId}?token=${currentLinkToken}`
    : '';

  useEffect(() => {
    kmsApi.documents.getShareLinks?.(docId)
      .then((data: any) => {
        if (Array.isArray(data)) {
          setActiveLinks(data.map((link: any) => ({
            id: link.id || link.token,
            token: link.token,
            expiryHours: link.expiryHours,
            hasPassword: link.hasPassword ?? Boolean(link.passwordProtected),
            createdAt: link.createdAt || '—',
            expiresAt: link.expiresAt,
          })));
        }
      })
      .catch(() => { })
      .finally(() => setLinksLoading(false));
  }, [docId]);

  const handleGenerateNewLink = async () => {
    setGenerating(true);
    try {
      const res = await kmsApi.documents.createShareLink(docId, {
        expiryHours: Number(expirationDays) * 24,
        password: password || undefined,
      });
      const newToken = res.token || res.shareToken || res.id;
      setCurrentLinkToken(newToken);
      const newEntry: ShareLink = {
        id: newToken,
        token: newToken,
        expiryHours: Number(expirationDays) * 24,
        hasPassword: Boolean(password),
        createdAt: new Date().toISOString(),
        expiresAt: res.expiresAt,
      };
      setActiveLinks((prev) => [newEntry, ...prev]);
      setStatusAlert(`New secure share link generated (Expires in ${expirationDays} days). Token hash logged.`);
      setPassword('');
    } catch (err: unknown) {
      setStatusAlert(err instanceof Error ? err.message : 'Failed to generate share link');
    } finally {
      setGenerating(false);
    }
  };

  const handleRevokeLink = async (id: string) => {
    try {
      const token = sessionStorage.getItem('kms_access_token');
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081/api/v1';
      const res = await fetch(`${API_BASE_URL}/admin/share-links/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Revoke failed (${res.status})`);
      setActiveLinks((prev) => prev.filter((l) => l.id !== id));
      setStatusAlert('Share link revoked. Access attempt via this token will now be rejected.');
    } catch (err) {
      setStatusAlert(err instanceof Error ? err.message : 'Failed to revoke share link');
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(generatedLink);
    setShareLinkCopied(true);
    setTimeout(() => setShareLinkCopied(false), 2000);
  };

  const formatExpiry = (link: ShareLink) => {
    if (link.expiresAt) return new Date(link.expiresAt).toLocaleDateString();
    if (link.expiryHours) {
      if (link.expiryHours >= 24) return `${link.expiryHours / 24} Days`;
      return `${link.expiryHours} Hours`;
    }
    return '—';
  };

  return (
    <AppShell>
      <div className="space-y-5 max-w-3xl mx-auto">
        <div className="border-b border-kms-slate-200 pb-3">
          <Breadcrumb
            items={[
              { label: 'Document Library', href: '/library' },
              { label: `Document #${docId}`, href: `/preview/${docId}` },
              { label: 'Sharing Settings' },
            ]}
          />
          <h1 className="text-xl font-bold text-kms-slate-900 tracking-tight flex items-center gap-2">
            <Share2 className="w-5 h-5 text-blue-700" />
            Secure Document Access Sharing &amp; Link Generator (FR-20)
          </h1>
        </div>

        {statusAlert && (
          <div className="p-3 bg-blue-50 border border-blue-200 text-blue-900 text-xs rounded flex items-center justify-between font-medium">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-700" />
              <span>{statusAlert}</span>
            </div>
            <button onClick={() => setStatusAlert(null)} className="text-blue-700 font-bold hover:underline">
              Dismiss
            </button>
          </div>
        )}

        {/* User Direct Grant Form */}
        <Card title="1. Direct User / Group Access Grant">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!targetUser) return;
              try {
                await kmsApi.permissions.grantDocument(docId, {
                  subjectType: targetUser.includes('@') ? 'USER' : 'GROUP',
                  subjectId: targetUser,
                  permissionLevel,
                });
                setStatusAlert(`Granted ${permissionLevel} permission to ${targetUser}. Audit logged.`);
                setTargetUser('');
              } catch (err) {
                setStatusAlert(err instanceof Error ? err.message : 'Failed to grant permission');
              }
            }}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <Input
                  label="User Email or Group Name"
                  placeholder="e.g. m.scott@enterprise.internal or /Engineering"
                  value={targetUser}
                  onChange={(e) => setTargetUser(e.target.value)}
                  required
                />
              </div>
              <Select
                label="Permission Level"
                options={[
                  { label: 'VIEW (Read-only)', value: 'VIEW' },
                  { label: 'EDIT (Contributor)', value: 'EDIT' },
                  { label: 'ADMIN (Full Rights)', value: 'ADMIN' },
                ]}
                value={permissionLevel}
                onChange={(e) => setPermissionLevel(e.target.value)}
              />
            </div>
            <div className="flex justify-end">
              <Button variant="primary" size="sm" icon={<ShieldCheck className="w-4 h-4" />}>
                Grant Permission
              </Button>
            </div>
          </form>
        </Card>

        {/* Secure Expiring Share Link Generator */}
        <Card title="2. Generate Expiring External Share Link (FR-20)">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Select
                label="Link Expiration Schedule"
                options={[
                  { label: '7 Days (Default)', value: '7' },
                  { label: '24 Hours (Urgent)', value: '1' },
                  { label: '30 Days (Extended)', value: '30' },
                ]}
                value={expirationDays}
                onChange={(e) => setExpirationDays(e.target.value)}
              />
              <Input
                label="Require Password Protection"
                type="password"
                placeholder="Optional Link Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                icon={generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
                onClick={handleGenerateNewLink}
                disabled={generating}
              >
                {generating ? 'Generating...' : 'Generate New Token'}
              </Button>
            </div>

            {generatedLink && (
              <div className="space-y-1 pt-2 border-t border-kms-slate-100">
                <label className="block text-xs font-semibold text-kms-slate-700">Latest Generated Share Link</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={generatedLink}
                    className="w-full px-3 py-1.5 text-xs bg-kms-slate-50 border border-kms-slate-300 rounded font-mono text-blue-800 font-medium"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyLink}
                    icon={shareLinkCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  >
                    {shareLinkCopied ? 'Copied' : 'Copy Link'}
                  </Button>
                </div>
              </div>
            )}

            {/* Active Links Revocation List */}
            {linksLoading ? (
              <div className="pt-3 border-t border-kms-slate-100 text-xs text-kms-slate-500 flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading active links...
              </div>
            ) : activeLinks.length > 0 && (
              <div className="pt-3 border-t border-kms-slate-100 space-y-2">
                <div className="text-xs font-semibold text-kms-slate-700">Active Share Tokens ({activeLinks.length})</div>
                <div className="space-y-1.5">
                  {activeLinks.map((link) => (
                    <div key={link.id} className="p-2 bg-kms-slate-50 border border-kms-slate-200 rounded flex items-center justify-between text-xs">
                      <div className="font-mono text-kms-slate-800">
                        Token: <span className="font-bold text-blue-800">{link.token}</span> (Expires: {formatExpiry(link)})
                        {link.hasPassword && <span className="ml-2 text-amber-700 font-semibold">[Password Protected]</span>}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:bg-red-50 text-[11px]"
                        onClick={() => handleRevokeLink(link.id)}
                      >
                        Revoke Access
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}

