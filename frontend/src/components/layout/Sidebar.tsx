'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  FileText, 
  Folder, 
  Search, 
  User, 
  Users, 
  Star, 
  Clock, 
  Trash2, 
  ShieldCheck, 
  BarChart2, 
  FileLock2, 
  Settings, 
  LayoutDashboard,
  Bell,
  HardDrive,
  Tag,
  FileCheck2,
  BookmarkCheck,
  ShieldAlert
} from 'lucide-react';
import { UserRole, hasRole } from '@/src/lib/auth';
import { AuthUser } from '@/src/lib/auth-context';
import { kmsApi } from '@/src/lib/api';

interface SidebarProps {
  userRoles: UserRole[];
  user: AuthUser | null;
}

export const Sidebar: React.FC<SidebarProps> = ({ userRoles, user }) => {
  const pathname = usePathname();

  const mainNav = [
    { href: '/', label: 'Dashboard', icon: LayoutDashboard, role: 'ROLE_VIEWER' },
    { href: '/library', label: 'Document Library', icon: Folder, role: 'ROLE_VIEWER' },
    { href: '/search', label: 'Advanced Search', icon: Search, role: 'ROLE_VIEWER' },
    { href: '/search/saved', label: 'Saved Searches & Alerts', icon: BookmarkCheck, role: 'ROLE_VIEWER' },
    { href: '/my-documents', label: 'My Documents', icon: User, role: 'ROLE_CONTRIBUTOR' },
    { href: '/shared-with-me', label: 'Shared With Me', icon: Users, role: 'ROLE_VIEWER' },
    { href: '/favorites', label: 'Favorites', icon: Star, role: 'ROLE_VIEWER' },
    { href: '/recent', label: 'Recent Documents', icon: Clock, role: 'ROLE_VIEWER' },
    { href: '/recycle-bin', label: 'Recycle Bin', icon: Trash2, role: 'ROLE_CONTRIBUTOR' },
    { href: '/notifications', label: 'Notifications', icon: Bell, role: 'ROLE_VIEWER' },
    { href: '/profile', label: 'User Profile', icon: User, role: 'ROLE_VIEWER' },
  ];

  const complianceNav = [
    { href: '/governance/retention', label: 'Retention Policies', icon: FileLock2, role: 'ROLE_COMPLIANCE_OFFICER' },
    { href: '/governance/legal-holds', label: 'Legal Holds', icon: ShieldCheck, role: 'ROLE_COMPLIANCE_OFFICER' },
    { href: '/governance/audit-logs', label: 'Audit Logs', icon: FileText, role: 'ROLE_IT_SECURITY' },
  ];

  const adminNav = [
    { href: '/admin', label: 'Admin Dashboard', icon: Settings, role: 'ROLE_ADMIN' },
    { href: '/admin/users', label: 'Users & Groups', icon: Users, role: 'ROLE_ADMIN' },
    { href: '/admin/roles', label: 'Roles & Matrix', icon: ShieldCheck, role: 'ROLE_ADMIN' },
    { href: '/admin/departments', label: 'Departments & Quotas', icon: BarChart2, role: 'ROLE_ADMIN' },
    { href: '/admin/document-types', label: 'Document Types', icon: FileCheck2, role: 'ROLE_ADMIN' },
    { href: '/admin/taxonomy', label: 'Taxonomy & Tags', icon: Tag, role: 'ROLE_ADMIN' },
    { href: '/admin/storage', label: 'Storage & Integrity', icon: HardDrive, role: 'ROLE_ADMIN' },
    { href: '/admin/reports', label: 'Usage & Stale Reports', icon: BarChart2, role: 'ROLE_ADMIN' },
    { href: '/admin/security', label: 'Security Alerts', icon: ShieldAlert, role: 'ROLE_IT_SECURITY' },
    { href: '/admin/settings', label: 'System Settings', icon: Settings, role: 'ROLE_ADMIN' },
  ];

  const isAdmin = hasRole(userRoles, 'ROLE_ADMIN');
  const [storageUsed, setStorageUsed] = useState<number | null>(null);
  const [storageTotal, setStorageTotal] = useState<number | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    kmsApi.admin.getSummary().then((data) => {
      const used = (data as { storageQuotaUsedBytes?: number }).storageQuotaUsedBytes;
      const total = (data as { storageQuotaTotalBytes?: number }).storageQuotaTotalBytes;
      if (used != null) setStorageUsed(used);
      if (total != null) setStorageTotal(total);
    }).catch(() => {
      // Non-critical — ignore storage fetch errors
    });
  }, [isAdmin]);

  const formatBytes = (bytes: number) => {
    const gb = bytes / (1024 * 1024 * 1024);
    return gb >= 1 ? `${gb.toFixed(1)} GB` : `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
  };

  const storagePercent =
    storageUsed != null && storageTotal != null && storageTotal > 0
      ? Math.min(100, (storageUsed / storageTotal) * 100)
      : null;

  const userInitials = user?.fullName
    ? user.fullName
        .split(' ')
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : user?.username?.slice(0, 2).toUpperCase() ?? '??';

  return (
    <aside className="w-64 bg-white text-slate-700 flex flex-col border-r border-slate-200 shrink-0 h-screen sticky top-0 shadow-2xs">
      {/* Branding with Official INSA Logo */}
      <Link href="/" className="h-16 px-4 flex items-center gap-3 border-b border-slate-200 bg-white hover:bg-slate-50 transition-colors">
        <img
          src="/images/insalogo.png"
          alt="INSA"
          className="h-9 w-auto object-contain"
        />
        <div>
          <h1 className="text-sm font-black text-blue-900 tracking-tight">INSA KMS</h1>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Knowledge System</p>
        </div>
      </Link>

      {/* Primary Navigation */}
      <div className="flex-1 overflow-y-auto py-3 px-2 space-y-5">
        <div>
          <div className="px-3 pb-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Workspace
          </div>
          <nav className="space-y-0.5" aria-label="Main Navigation">
            {mainNav.map((item) => {
              const Icon = item.icon;
              const isAllowed = hasRole(userRoles, item.role as UserRole);
              if (!isAllowed) return null;

              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-xs rounded transition-all ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 font-bold border-l-4 border-blue-700 pl-2'
                      : 'hover:bg-slate-50 text-slate-600 hover:text-slate-900 font-medium'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-700' : 'text-slate-400'}`} />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Compliance & Governance */}
        {complianceNav.some((item) => hasRole(userRoles, item.role as UserRole)) && (
          <div>
            <div className="px-3 pb-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Compliance &amp; Governance
            </div>
            <nav className="space-y-0.5" aria-label="Compliance Navigation">
              {complianceNav.map((item) => {
                const Icon = item.icon;
                const isAllowed = hasRole(userRoles, item.role as UserRole);
                if (!isAllowed) return null;

                const isActive = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-xs rounded transition-all ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 font-bold border-l-4 border-blue-700 pl-2'
                        : 'hover:bg-slate-50 text-slate-600 hover:text-slate-900 font-medium'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-700' : 'text-slate-400'}`} />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        )}

        {/* Administration Section */}
        {adminNav.some((item) => hasRole(userRoles, item.role as UserRole)) && (
          <div>
            <div className="px-3 pb-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Administration
            </div>
            <nav className="space-y-0.5" aria-label="Admin Navigation">
              {adminNav.map((item) => {
                const Icon = item.icon;
                const isAllowed = hasRole(userRoles, item.role as UserRole);
                if (!isAllowed) return null;

                const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-xs rounded transition-all ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 font-bold border-l-4 border-blue-700 pl-2'
                        : 'hover:bg-slate-50 text-slate-600 hover:text-slate-900 font-medium'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-700' : 'text-slate-400'}`} />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        )}
      </div>

      {/* User Identity & Storage Footer */}
      <div className="p-3 border-t border-slate-200 bg-slate-50/60 text-xs shrink-0 space-y-2">
        {/* User identity strip */}
        {user && (
          <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
            <div className="w-7 h-7 rounded-full bg-blue-700 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
              {userInitials}
            </div>
            <div className="min-w-0">
              <div className="text-slate-900 font-bold truncate text-xs">{user.fullName || user.username}</div>
              <div className="text-[10px] text-slate-500 truncate font-medium">
                {user.department || user.email}
              </div>
            </div>
          </div>
        )}

        {/* Storage quota — admin only, real data */}
        {isAdmin && storagePercent !== null && storageUsed !== null && storageTotal !== null ? (
          <>
            <div className="flex items-center justify-between text-slate-600 mb-1 text-[11px]">
              <span>Storage Quota</span>
              <span className="font-semibold text-slate-900">
                {formatBytes(storageUsed)} / {formatBytes(storageTotal)}
              </span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-1.5 rounded-full ${storagePercent > 80 ? 'bg-rose-500' : storagePercent > 60 ? 'bg-amber-500' : 'bg-blue-600'}`}
                style={{ width: `${storagePercent}%` }}
              />
            </div>
          </>
        ) : isAdmin ? (
          <div className="text-slate-400 text-[11px]">Loading storage info...</div>
        ) : null}
      </div>
    </aside>
  );
};
