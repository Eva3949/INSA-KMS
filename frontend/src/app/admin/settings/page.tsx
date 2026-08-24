'use client';

import React from 'react';
import { AppShell } from '@/src/components/layout/AppShell';
import { Breadcrumb } from '@/src/components/ui/Breadcrumb';
import { Button } from '@/src/components/ui/Button';
import { Input } from '@/src/components/ui/Input';
import { Card } from '@/src/components/ui/Card';
import { LoadingState } from '@/src/components/ui/States';
import { Alert } from '@/src/components/ui/Alert';
import { kmsApi } from '@/src/lib/api';
import { Settings, Save, RotateCcw } from 'lucide-react';

interface SettingRow {
  settingKey: string;
  settingValue: string;
  description?: string | null;
  updatedAt: string;
}

const KEYCLOAK_KEYS = ['keycloak.server.url', 'keycloak.realm', 'keycloak.client.id'];
const REPOSITORY_KEYS = ['upload.max-file-size-mb', 'retention.default-days', 'recycle-bin.retention-days'];

export default function AdminSystemSettingsPage() {
  const [settings, setSettings] = React.useState<SettingRow[]>([]);
  const [values, setValues] = React.useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);

  const load = React.useCallback(() => {
    setIsLoading(true);
    setError(null);
    kmsApi.admin
      .getSettings()
      .then((data) => {
        const rows = data as SettingRow[];
        setSettings(rows);
        setValues(Object.fromEntries(rows.map((r) => [r.settingKey, r.settingValue])));
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Failed to load system settings'))
      .finally(() => setIsLoading(false));
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const isDirty = settings.some((s) => values[s.settingKey] !== s.settingValue);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setNotice(null);
    setError(null);
    try {
      const changed: Record<string, string> = {};
      settings.forEach((s) => {
        if (values[s.settingKey] !== s.settingValue) {
          changed[s.settingKey] = values[s.settingKey];
        }
      });
      if (Object.keys(changed).length === 0) {
        setNotice('No changes to save.');
        return;
      }
      const updated = await kmsApi.admin.updateSettings(changed);
      const rows = updated as SettingRow[];
      setSettings(rows);
      setValues(Object.fromEntries(rows.map((r) => [r.settingKey, r.settingValue])));
      setNotice(`${Object.keys(changed).length} setting(s) persisted successfully.`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setIsSaving(false);
    }
  };

  const renderGroup = (keys: string[]) => {
    const rows = settings.filter((s) => keys.includes(s.settingKey));
    const others = keys.length === 0 ? settings.filter((s) => ![...KEYCLOAK_KEYS, ...REPOSITORY_KEYS].includes(s.settingKey)) : rows;
    return others.map((s) => (
      <Input
        key={s.settingKey}
        label={s.settingKey}
        value={values[s.settingKey] ?? ''}
        onChange={(e) => setValues((prev) => ({ ...prev, [s.settingKey]: e.target.value }))}
        helperText={s.description || undefined}
      />
    ));
  };

  const uncategorised = settings.filter((s) => ![...KEYCLOAK_KEYS, ...REPOSITORY_KEYS].includes(s.settingKey));

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

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" icon={<RotateCcw className="w-4 h-4" />} onClick={load} disabled={isSaving}>
              Reload
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<Save className="w-4 h-4" />}
              onClick={handleSave}
              disabled={isSaving || !isDirty}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>

        {notice && <Alert type="success">{notice}</Alert>}
        {error && <Alert type="error">{error}</Alert>}

        {isLoading ? (
          <LoadingState message="Loading system configuration..." />
        ) : (
          <form onSubmit={handleSave} className="space-y-5">
            <Card title="Keycloak OIDC Security Connection Settings">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{renderGroup(KEYCLOAK_KEYS)}</div>
              <div className="mt-4">
                <Input
                  label="Derived JWKS URI (read-only)"
                  value={`${values['keycloak.server.url'] ?? ''}/realms/${values['keycloak.realm'] ?? ''}/protocol/openid-connect/certs`}
                  readOnly
                />
              </div>
            </Card>

            <Card title="Repository & File System Limits">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{renderGroup(REPOSITORY_KEYS)}</div>
            </Card>

            {uncategorised.length > 0 && (
              <Card title="Additional Configuration Keys">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{renderGroup([])}</div>
              </Card>
            )}

            <p className="text-[11px] text-kms-slate-500">
              Settings are persisted in the <span className="font-mono">system_settings</span> table and audit-logged
              under action <span className="font-mono">SETTINGS_UPDATED</span> (FR-22, FR-27).
            </p>
          </form>
        )}
      </div>
    </AppShell>
  );
}
