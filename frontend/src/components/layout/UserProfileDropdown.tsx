'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { 
  User, 
  FileText, 
  Users, 
  Star, 
  Clock, 
  Trash2, 
  GitPullRequestArrow, 
  LogOut, 
  ChevronDown, 
  Settings,
  ShieldCheck
} from 'lucide-react';
import { AuthUser, useAuth } from '@/src/lib/auth-context';
import { hasRole } from '@/src/lib/auth';

interface UserProfileDropdownProps {
  user?: AuthUser | null;
}

export const UserProfileDropdown: React.FC<UserProfileDropdownProps> = ({ user }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { logout, roles } = useAuth();

  const isSuperAdmin = roles.includes('ROLE_SUPER_ADMIN');
  const isAdmin = hasRole(roles, 'ROLE_ADMIN');

  const initials = user?.fullName
    ? user.fullName
        .split(' ')
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : user?.username?.slice(0, 2).toUpperCase() ?? '?';

  const displayName = user?.fullName || user?.username || 'User';
  const displayEmail = user?.email || '';
  const displayDept = user?.department || '';

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const personalWorkspaceItems = [
    {
      href: '/my-documents',
      label: 'My Documents',
      icon: FileText,
      description: 'Your uploaded and drafted files',
    },
    {
      href: '/shared-with-me',
      label: 'Shared With Me',
      icon: Users,
      description: 'Documents shared by team members',
    },
    {
      href: '/favorites',
      label: 'Starred Favorites',
      icon: Star,
      description: 'Bookmarked quick-access items',
    },
    {
      href: '/recent',
      label: 'Recently Opened',
      icon: Clock,
      description: 'Recently accessed resources',
    },
    {
      href: '/my-approvals',
      label: 'My Submissions',
      icon: GitPullRequestArrow,
      description: 'Track your pending approval requests',
    },
    {
      href: '/recycle-bin',
      label: 'Recycle Bin',
      icon: Trash2,
      description: 'Deleted files & recovery queue',
    },
  ];

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className={`flex items-center gap-2 text-slate-800 hover:text-blue-800 font-semibold border-l border-slate-200 pl-2.5 sm:pl-3.5 py-1 rounded-md transition-colors ${
          isOpen ? 'bg-slate-100/80 text-blue-700' : ''
        }`}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="User Profile and Personal Workspace menu"
      >
        <div className="relative shrink-0">
          {user?.avatarUrl && !avatarError ? (
            <img
              src={user.avatarUrl}
              alt={displayName}
              onError={() => setAvatarError(true)}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover border border-slate-300 shadow-xs"
            />
          ) : (
            <div
              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full text-white flex items-center justify-center font-bold text-xs shadow-xs ${
                isSuperAdmin
                  ? 'bg-gradient-to-tr from-amber-600 to-orange-500'
                  : isAdmin
                  ? 'bg-gradient-to-tr from-blue-600 to-indigo-600'
                  : 'bg-blue-700'
              }`}
            >
              {initials}
            </div>
          )}
          {/* Active online dot */}
          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full" />
        </div>

        <div className="hidden lg:block text-left leading-tight max-w-[140px]">
          <div className="text-slate-900 font-bold truncate text-xs">{displayName}</div>
          {displayDept && (
            <div className="text-[10px] text-slate-500 font-normal truncate">{displayDept}</div>
          )}
        </div>

        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-blue-600' : ''
          }`}
        />
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-88 bg-white rounded-xl shadow-xl border border-slate-200/90 py-2 z-50 animate-in fade-in-0 zoom-in-95 duration-150 origin-top-right divide-y divide-slate-100">
          {/* User Profile Header Card */}
          <div className="px-4 py-3 bg-gradient-to-b from-slate-50/80 to-white">
            <div className="flex items-start gap-3">
              {user?.avatarUrl && !avatarError ? (
                <img
                  src={user.avatarUrl}
                  alt={displayName}
                  className="w-10 h-10 rounded-xl object-cover border border-slate-300 shadow-xs shrink-0"
                />
              ) : (
                <div
                  className={`w-10 h-10 rounded-xl text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0 ${
                    isSuperAdmin
                      ? 'bg-gradient-to-tr from-amber-600 to-orange-500'
                      : isAdmin
                      ? 'bg-gradient-to-tr from-blue-600 to-indigo-600'
                      : 'bg-gradient-to-tr from-slate-700 to-slate-900'
                  }`}
                >
                  {initials}
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1.5">
                  <h4 className="text-sm font-bold text-slate-900 truncate">{displayName}</h4>
                  {isSuperAdmin ? (
                    <span className="text-[9px] font-black px-1.5 py-0.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded uppercase tracking-wider shadow-2xs shrink-0">
                      SUPER ADMIN
                    </span>
                  ) : isAdmin ? (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 bg-blue-600 text-white rounded uppercase tracking-wider shadow-2xs shrink-0">
                      ADMIN
                    </span>
                  ) : (
                    <span className="text-[9px] font-semibold px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded uppercase tracking-wider shrink-0">
                      MEMBER
                    </span>
                  )}
                </div>

                {displayEmail && (
                  <p className="text-xs text-slate-500 truncate mt-0.5">{displayEmail}</p>
                )}
                {displayDept && (
                  <p className="text-[11px] text-blue-600 font-medium truncate mt-0.5">
                    {displayDept}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Personal Workspace Navigation Group */}
          <div className="py-2">
            <div className="px-3 pb-1.5 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Personal Workspace
              </span>
              <span className="text-[9px] font-semibold px-1.5 py-0.25 bg-blue-50 text-blue-700 rounded">
                Personal
              </span>
            </div>

            <div className="space-y-0.5 px-1.5">
              {personalWorkspaceItems.map((item) => {
                const ItemIcon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-slate-700 hover:text-blue-700 hover:bg-blue-50/70 group transition-all"
                  >
                    <div className="w-7 h-7 rounded-md bg-slate-100 text-slate-500 group-hover:bg-blue-100 group-hover:text-blue-700 flex items-center justify-center shrink-0 transition-colors">
                      <ItemIcon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-slate-800 group-hover:text-blue-700">
                        {item.label}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">
                        {item.description}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Account & Profile Link */}
          <div className="py-1.5 px-1.5">
            <Link
              href="/profile"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-slate-700 hover:text-blue-700 hover:bg-slate-50 group transition-colors"
            >
              <div className="w-7 h-7 rounded-md bg-slate-100 text-slate-500 group-hover:bg-slate-200 group-hover:text-slate-800 flex items-center justify-center shrink-0 transition-colors">
                <Settings className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-800 group-hover:text-blue-700">
                  Profile &amp; Account Settings
                </p>
                <p className="text-[10px] text-slate-400 truncate">
                  Personal credentials, preferences &amp; 2FA
                </p>
              </div>
            </Link>
          </div>

          {/* Logout Action */}
          <div className="p-1.5 bg-slate-50/60">
            <button
              onClick={() => {
                setIsOpen(false);
                logout();
              }}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-rose-600 hover:text-rose-700 hover:bg-rose-50 font-medium text-xs transition-colors"
            >
              <div className="w-7 h-7 rounded-md bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <LogOut className="w-4 h-4" />
              </div>
              <span className="font-semibold">Sign Out from INSA KMS</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
