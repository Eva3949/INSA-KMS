'use client';

import React, { useEffect, useState } from 'react';
import { AppShell } from '@/src/components/layout/AppShell';
import { Breadcrumb } from '@/src/components/ui/Breadcrumb';
import { Card } from '@/src/components/ui/Card';
import { Badge } from '@/src/components/ui/Badge';
import { Button } from '@/src/components/ui/Button';
import { LoadingState, ErrorState } from '@/src/components/ui/States';
import { User, ShieldCheck, LogOut, KeyRound } from 'lucide-react';
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

  // Change Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [changeSuccess, setChangeSuccess] = useState<string | null>(null);
  const [changeError, setChangeError] = useState<string | null>(null);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangeError(null);
    setChangeSuccess(null);

    if (newPassword.length < 8) {
      setChangeError('New password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setChangeError('New password and confirm password do not match.');
      return;
    }

    setIsChangingPassword(true);
    try {
      const res = await kmsApi.auth.changePassword(currentPassword, newPassword, confirmPassword);
      setChangeSuccess(res.message || 'Password changed successfully in Keycloak!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to change password.';
      setChangeError(msg.replace(/^API Error \[\d+\]:\s*/, ''));
    } finally {
      setIsChangingPassword(false);
    }
  };

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

            {/* Change Password Card */}
            <Card title="Security & Password Management">
              <div className="space-y-4">
                <p className="text-xs text-kms-slate-600">
                  Update your Keycloak account password. Password operations update Keycloak identity credentials directly.
                </p>

                {changeSuccess && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>{changeSuccess}</div>
                  </div>
                )}

                {changeError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg flex items-start gap-2">
                    <KeyRound className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div>{changeError}</div>
                  </div>
                )}

                <form onSubmit={handleChangePassword} className="space-y-3 max-w-md">
                  <div>
                    <label className="block text-xs font-semibold text-kms-slate-700 mb-1">
                      Current Password
                    </label>
                    <input
                      type="password"
                      placeholder="••••••••••••"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      required
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-kms-slate-700 mb-1">
                      New Password (min 8 characters)
                    </label>
                    <input
                      type="password"
                      placeholder="••••••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-kms-slate-700 mb-1">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      placeholder="••••••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white text-slate-900"
                    />
                  </div>

                  <div className="pt-2">
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      className="bg-blue-700 hover:bg-blue-800 text-white font-bold"
                      disabled={isChangingPassword}
                    >
                      {isChangingPassword ? 'Updating Password...' : 'Update Password'}
                    </Button>
                  </div>
                </form>
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
