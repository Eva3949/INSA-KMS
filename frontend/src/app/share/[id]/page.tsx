'use client';

import React, { useState } from 'react';
import { AppShell } from '@/src/components/layout/AppShell';
import { Breadcrumb } from '@/src/components/ui/Breadcrumb';
import { Button } from '@/src/components/ui/Button';
import { Input, Select } from '@/src/components/ui/Input';
import { Card } from '@/src/components/ui/Card';
import { Badge } from '@/src/components/ui/Badge';
import { Share2, Link2, Copy, Lock, ShieldCheck, Check } from 'lucide-react';
import Link from 'next/link';

export default function ShareDocumentPage({ params }: { params: { id: string } }) {
  const docId = params.id;
  const [targetUser, setTargetUser] = useState('');
  const [permissionLevel, setPermissionLevel] = useState('VIEW');
  const [expirationDays, setExpirationDays] = useState('7');
  const [password, setPassword] = useState('');
  const [shareLinkCopied, setShareLinkCopied] = useState(false);
  const [statusAlert, setStatusAlert] = useState<string | null>(null);

  const [activeLinks, setActiveLinks] = useState([
    {
      id: 'link-1',
      token: '8f3a9b2c-exp7d',
      expiresIn: '7 Days',
      hasPassword: true,
      createdAt: 'Just now',
    },
  ]);

  const [currentLinkToken, setCurrentLinkToken] = useState('8f3a9b2c-exp7d');
  const generatedLink = typeof window !== 'undefined'
    ? `${window.location.origin}/preview/${docId}?token=${currentLinkToken}`
    : `https://kms.enterprise.internal/preview/${docId}?token=${currentLinkToken}`;

  const handleGenerateNewLink = () => {
    const newToken = Math.random().toString(36).substring(2, 12);
    setCurrentLinkToken(newToken);
    const newEntry = {
      id: 'link-' + Date.now(),
      token: newToken,
      expiresIn: `${expirationDays} Days`,
      hasPassword: Boolean(password),
      createdAt: 'Just now',
    };
    setActiveLinks((prev) => [newEntry, ...prev]);
    setStatusAlert(`New secure share link generated (Expires in ${expirationDays} days). Token hash logged.`);
  };

  const handleRevokeLink = (id: string) => {
    setActiveLinks((prev) => prev.filter((l) => l.id !== id));
    setStatusAlert('Share link revoked. Access attempt via this token will now be rejected.');
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(generatedLink);
    setShareLinkCopied(true);
    setTimeout(() => setShareLinkCopied(false), 2000);
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
            onSubmit={(e) => {
              e.preventDefault();
              if (targetUser) {
                setStatusAlert(`Granted ${permissionLevel} permission to ${targetUser}. Audit logged.`);
                setTargetUser('');
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
                icon={<Link2 className="w-4 h-4" />}
                onClick={handleGenerateNewLink}
              >
                Generate New Token
              </Button>
            </div>

            <div className="space-y-1 pt-2 border-t border-kms-slate-100">
              <label className="block text-xs font-semibold text-kms-slate-700">Active Share Link</label>
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

            {/* Active Links Revocation List */}
            {activeLinks.length > 0 && (
              <div className="pt-3 border-t border-kms-slate-100 space-y-2">
                <div className="text-xs font-semibold text-kms-slate-700">Active Share Tokens ({activeLinks.length})</div>
                <div className="space-y-1.5">
                  {activeLinks.map((link) => (
                    <div key={link.id} className="p-2 bg-kms-slate-50 border border-kms-slate-200 rounded flex items-center justify-between text-xs">
                      <div className="font-mono text-kms-slate-800">
                        Token: <span className="font-bold text-blue-800">{link.token}</span> (Expires: {link.expiresIn})
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

