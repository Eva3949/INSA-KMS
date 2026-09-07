'use client';

import React, { useEffect, useState, useRef } from 'react';
import { AppShell } from '@/src/components/layout/AppShell';
import { Breadcrumb } from '@/src/components/ui/Breadcrumb';
import { Card } from '@/src/components/ui/Card';
import { Badge } from '@/src/components/ui/Badge';
import { Button } from '@/src/components/ui/Button';
import { LoadingState, ErrorState } from '@/src/components/ui/States';
import { User, ShieldCheck, LogOut, KeyRound, Camera, Trash2, CheckCircle2, AlertCircle, Upload, X } from 'lucide-react';
import { kmsApi } from '@/src/lib/api';
import { useAuth } from '@/src/lib/auth-context';

interface UserProfile {
  id?: string;
  username: string;
  email: string;
  fullName: string;
  department?: string;
  roles: string[];
  avatarUrl?: string | null;
  jobTitle?: string;
  phone?: string;
  employmentStatus?: string;
}

const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

export default function ProfilePage() {
  const { logout, refetch } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Profile Photo Upload State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isRemovingPhoto, setIsRemovingPhoto] = useState(false);
  const [photoMessage, setPhotoMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Change Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [changeSuccess, setChangeSuccess] = useState<string | null>(null);
  const [changeError, setChangeError] = useState<string | null>(null);

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

  // Cleanup blob preview URL on unmount or file change
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhotoMessage(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (5MB)
    if (file.size > MAX_AVATAR_SIZE_BYTES) {
      setPhotoMessage({
        type: 'error',
        text: `The selected photo is too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Maximum allowed size is 5 MB.`,
      });
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Validate type
    const isImage = ALLOWED_MIME_TYPES.includes(file.type.toLowerCase()) ||
      /\.(jpg|jpeg|png|webp)$/i.test(file.name);

    if (!isImage) {
      setPhotoMessage({
        type: 'error',
        text: 'Invalid file format. Please choose a JPG, PNG, or WebP image.',
      });
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const cancelPreview = () => {
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUploadPhoto = async () => {
    if (!selectedFile) return;

    setIsUploadingPhoto(true);
    setPhotoMessage(null);

    try {
      const res = await kmsApi.users.uploadAvatar(selectedFile);
      setProfile((prev) => prev ? { ...prev, avatarUrl: res.avatarUrl } : null);
      setPhotoMessage({
        type: 'success',
        text: 'Profile photo uploaded and saved successfully!',
      });
      cancelPreview();
      // Refetch global user context so TopHeader & Sidebar avatars update immediately
      refetch();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to upload profile photo.';
      setPhotoMessage({
        type: 'error',
        text: msg.replace(/^Upload failed \[\d+\]:\s*/, ''),
      });
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleRemovePhoto = async () => {
    if (!confirm('Are you sure you want to remove your profile photo?')) return;

    setIsRemovingPhoto(true);
    setPhotoMessage(null);

    try {
      await kmsApi.users.deleteAvatar();
      setProfile((prev) => prev ? { ...prev, avatarUrl: null } : null);
      setPhotoMessage({
        type: 'success',
        text: 'Profile photo removed successfully.',
      });
      cancelPreview();
      refetch();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to remove profile photo.';
      setPhotoMessage({
        type: 'error',
        text: msg,
      });
    } finally {
      setIsRemovingPhoto(false);
    }
  };

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
            {/* User Identity & Profile Photo Card */}
            <Card title="Authenticated Identity & Profile Photo (Keycloak OIDC)">
              <div className="space-y-4">
                {/* Photo feedback alerts */}
                {photoMessage && (
                  <div
                    className={`p-3 rounded-lg text-xs flex items-start gap-2 ${
                      photoMessage.type === 'success'
                        ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                        : 'bg-rose-50 border border-rose-200 text-rose-800'
                    }`}
                  >
                    {photoMessage.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    )}
                    <span className="font-medium">{photoMessage.text}</span>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row sm:items-start gap-5">
                  {/* Avatar with Photo Picker Overlay */}
                  <div className="flex flex-col items-center sm:items-start gap-2.5 shrink-0">
                    <div className="relative group">
                      {previewUrl ? (
                        <div className="relative">
                          <img
                            src={previewUrl}
                            alt="New Photo Preview"
                            className="w-20 h-20 rounded-full object-cover border-2 border-blue-600 shadow-md ring-2 ring-blue-200"
                          />
                          <span className="absolute -bottom-1 -right-1 bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-xs">
                            Preview
                          </span>
                        </div>
                      ) : profile.avatarUrl ? (
                        <div className="relative">
                          <img
                            src={profile.avatarUrl}
                            alt={profile.fullName || profile.username}
                            className="w-20 h-20 rounded-full object-cover border-2 border-slate-300 shadow-md hover:border-blue-600 transition-colors"
                          />
                        </div>
                      ) : (
                        <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-blue-700 to-indigo-600 text-white flex items-center justify-center font-bold text-2xl shrink-0 shadow-md">
                          {initials}
                        </div>
                      )}

                      {/* Quick upload click overlay */}
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploadingPhoto || isRemovingPhoto}
                        className="absolute inset-0 rounded-full bg-black/40 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer disabled:cursor-not-allowed"
                        title="Click to select photo"
                      >
                        <Camera className="w-5 h-5 drop-shadow" />
                        <span className="text-[10px] font-semibold mt-0.5">Change</span>
                      </button>
                    </div>

                    {/* Hidden Native File Input */}
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                    />

                    {/* Action buttons */}
                    <div className="flex flex-wrap items-center justify-center gap-1.5">
                      {!previewUrl ? (
                        <>
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploadingPhoto || isRemovingPhoto}
                            icon={<Camera className="w-3.5 h-3.5 text-blue-700" />}
                            className="text-[11px] font-semibold"
                          >
                            {profile.avatarUrl ? 'Change Photo' : 'Upload Photo'}
                          </Button>
                          {profile.avatarUrl && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={handleRemovePhoto}
                              disabled={isUploadingPhoto || isRemovingPhoto}
                              icon={<Trash2 className="w-3.5 h-3.5 text-rose-500" />}
                              className="text-[11px] text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-slate-300"
                            >
                              {isRemovingPhoto ? 'Removing...' : 'Remove'}
                            </Button>
                          )}
                        </>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <Button
                            type="button"
                            variant="primary"
                            size="sm"
                            onClick={handleUploadPhoto}
                            disabled={isUploadingPhoto}
                            icon={<Upload className="w-3.5 h-3.5" />}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px]"
                          >
                            {isUploadingPhoto ? 'Saving...' : 'Save Photo'}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={cancelPreview}
                            disabled={isUploadingPhoto}
                            icon={<X className="w-3.5 h-3.5" />}
                            className="text-[11px]"
                          >
                            Cancel
                          </Button>
                        </div>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 text-center">
                      JPG, PNG or WebP • Max 5 MB
                    </p>
                  </div>

                  {/* Profile Details */}
                  <div className="space-y-2.5 flex-1 min-w-0">
                    <div>
                      <h2 className="text-base font-bold text-kms-slate-900 truncate">
                        {profile.fullName || profile.username}
                      </h2>
                      <p className="text-xs text-kms-slate-500 truncate">
                        {profile.email} • Username: <span className="font-mono text-slate-700">{profile.username}</span>
                      </p>
                      {profile.department && (
                        <p className="text-xs text-kms-slate-600 mt-0.5">
                          Department: <strong className="text-slate-900">{profile.department}</strong>
                        </p>
                      )}
                      {profile.jobTitle && (
                        <p className="text-xs text-kms-slate-600">
                          Job Title: <span className="text-slate-800">{profile.jobTitle}</span>
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
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
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
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
