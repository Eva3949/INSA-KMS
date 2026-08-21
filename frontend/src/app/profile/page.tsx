'use client';

import React, { useEffect, useState } from 'react';
import { AppShell } from '@/src/components/layout/AppShell';
import { Breadcrumb } from '@/src/components/ui/Breadcrumb';
import { Card } from '@/src/components/ui/Card';
import { Badge } from '@/src/components/ui/Badge';
import { Button } from '@/src/components/ui/Button';
import { LoadingState, ErrorState } from '@/src/components/ui/States';
import { User, ShieldCheck, LogOut } from 'lucide-react';
import { kmsApi } from '@/src/lib/api';
import { useAuth } from '@/src/lib/auth-context';
import { UserRole } from '@/src/lib/auth';

interface UserProfile {
  id?: string;
  username: string;
  email: string;
  fullName: string;
  department?: string;
  roles: string[];
}

export default function ProfilePage() {
  const { logout } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = () => {
    setIsLoading(true);
    setError(null);
    kmsApi.getCurrentUser()
      .then((data) => setProfile(data as UserProfile))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Failed to load profile'))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const initials = profile?.fullName
    ? profile.fullName.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
    : profile?.username?.slice(0, 2).toUpperCase() ?? '?';

  return (
    <AppShell>
      <div className="space-y-5 max-w-4xl mx-auto">
        <div className="border-b border-kms-slate-200 pb-3">
          <Breadcrumb items={[{ label: 'User Context' }, { label: 'User Profile' }]} />
          <h1 className="text-xl font-bold text-kms-slate-900 tracking-tight flex items-center gap-2">
            <User className="w-5 h-5 text-blue-700" />
            User Profile &amp; Security Sessions
          </h1>
        </div>

        {isLoading && <LoadingState message="Loading your profile..." />}
        {error && <ErrorState title="Failed to load profile" message={error} onRetry={loadProfile} />}

        {!isLoading && !error && profile && (
          <>
            {/* User Identity Card */}
            <Card title="Authenticated Identity Context (Keycloak OIDC)">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-full bg-blue-700 text-white flex items-center justify-center font-bold text-xl shrink-0 shadow-md">
                  {initials}
                </div>
                <div className="space-y-2 flex-1">
                  <div>
                    <h2 className="text-base font-bold text-kms-slate-900">{profile.fullName || profile.username}</h2>
                    <p className="text-xs text-kms-slate-500">{profile.email} ? Username: {profile.username}</p>
                    {profile.department && (
                      <p className="text-xs text-kms-slate-600 mt-0.5">Department: <strong>{profile.department}</strong></p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span className="text-xs font-semibold text-kms-slate-700 mr-1">Assigned Realm Roles:</span>
                    {profile.roles.map((role) => (
                      <Badge key={role} label={role} variant="blue" icon={<ShieldCheck className="w-3 h-3 text-blue-600" />} />
                    ))}
                    {profile.roles.length === 0 && (
                      <span className="text-xs text-kms-slate-500 italic">No roles assigned</span>
                    )}
                  </div>
                </div>
              </div>
            </Card>

            {/* Security Actions */}
            <Card title="Session Management">
              <div className="space-y-3 text-xs">
                <p className="text-kms-slate-600">
                  Your session is managed by Keycloak OIDC. To view and revoke active sessions, access the Keycloak user account console.
                </p>
                <div className="flex items-center gap-3 pt-2">
                  <Button
                    variant="danger"
                    size="sm"
                    icon={<LogOut className="w-3.5 h-3.5" />}
                    onClick={logout}
                  >
                    Sign Out of All Sessions
                  </Button>
                </div>
              </div>
            </Card>
          </>
        )}
      </div>
    </AppShell>
  );
}
