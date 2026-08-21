'use client';

import React, { useState } from 'react';
import { AppShell } from '@/src/components/layout/AppShell';
import { Breadcrumb } from '@/src/components/ui/Breadcrumb';
import { Button } from '@/src/components/ui/Button';
import { Input, Select } from '@/src/components/ui/Input';
import { Card } from '@/src/components/ui/Card';
import { Settings, Save, ShieldCheck } from 'lucide-react';

export default function AdminSystemSettingsPage() {
  const [keycloakUrl, setKeycloakUrl] = useState('http://localhost:8080');
  const [keycloakRealm, setKeycloakRealm] = useState('kms-realm');
  const [maxUploadMb, setMaxUploadMb] = useState('500');
  const [defaultRetentionDays, setDefaultRetentionDays] = useState('2555');

  return (
    <AppShell requiredRole="ROLE_ADMIN">
      <div className="space-y-5 max-w-4xl mx-auto">
        <div className="flex items-center justify-between border-b border-kms-slate-200 pb-3">
          <div>
            <Breadcrumb items={[{ label: 'Administration', href: '/admin' }, { label: 'System Settings' }]} />
            <h1 className="text-xl font-bold text-kms-slate-900 tracking-tight flex items-center gap-2">
              <Settings className="w-5 h-5 text-blue-700" />
              Global System Configuration & Keycloak Integration Parameters
            </h1>
          </div>

          <Button variant="primary" size="sm" icon={<Save className="w-4 h-4" />}>
            Save Changes
          </Button>
        </div>

        <form onSubmit={(e) => e.preventDefault()} className="space-y-5">
          <Card title="Keycloak OIDC Security Connection Settings">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Keycloak Server Issuer URL"
                value={keycloakUrl}
                onChange={(e) => setKeycloakUrl(e.target.value)}
                required
              />
              <Input
                label="Keycloak Target Realm Name"
                value={keycloakRealm}
                onChange={(e) => setKeycloakRealm(e.target.value)}
                required
              />
              <Input label="Keycloak OIDC Client ID" value="kms-frontend-client" readOnly />
              <Input label="JSON Web Key Set (JWKS) URI" value={`${keycloakUrl}/realms/${keycloakRealm}/protocol/openid-connect/certs`} readOnly />
            </div>
          </Card>

          <Card title="Repository & File System Limits">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Maximum Multipart File Upload Size (MB)"
                type="number"
                value={maxUploadMb}
                onChange={(e) => setMaxUploadMb(e.target.value)}
                required
              />
              <Input
                label="Default Retention Schedule Duration (Days)"
                type="number"
                value={defaultRetentionDays}
                onChange={(e) => setDefaultRetentionDays(e.target.value)}
                required
              />
            </div>
          </Card>
        </form>
      </div>
    </AppShell>
  );
}

