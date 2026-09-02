'use client';

import React, { useState } from 'react';
import { Search, Bell, LogOut, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { GlobalSearchModal } from './GlobalSearchModal';
import { useAuth } from '@/src/lib/auth-context';
import { AuthUser } from '@/src/lib/auth-context';

interface TopHeaderProps {
  user?: AuthUser | null;
}

export const TopHeader: React.FC<TopHeaderProps> = ({ user }) => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const { logout } = useAuth();

  React.useEffect(() => {
    const fetchUnread = () => {
      const token = typeof window !== 'undefined' ? sessionStorage.getItem('kms_access_token') : null;
      if (!token) return;
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081/api/v1';
      fetch(`${API_BASE_URL}/notifications/unread-count`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data != null) {
            const count = typeof data === 'number' ? data : data?.count ?? data?.unreadCount ?? 0;
            setUnreadCount(count);
          }
        })
        .catch(() => {});
    };

    fetchUnread();
    const interval = setInterval(fetchUnread, 20000);

    const handleUpdate = (e: any) => {
      if (typeof e?.detail?.count === 'number') {
        setUnreadCount(e.detail.count);
      } else {
        fetchUnread();
      }
    };

    window.addEventListener('kms_notification_updated', handleUpdate);
    return () => {
      clearInterval(interval);
      window.removeEventListener('kms_notification_updated', handleUpdate);
    };
  }, []);

  const initials = user?.fullName
    ? user.fullName
        .split(' ')
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : user?.username?.slice(0, 2).toUpperCase() ?? '?';

  const displayName = user?.fullName || user?.username || 'User';
  const displayDept = user?.department || user?.email || '';

  return (
    <>
      <header className="h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
        {/* Global Search Trigger Bar */}
        <button
          onClick={() => setIsSearchOpen(true)}
          className="flex items-center gap-3 bg-slate-50 hover:bg-slate-100 border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-600 rounded-md px-3.5 py-1.5 text-xs text-slate-500 w-80 transition-all shadow-2xs"
          aria-label="Open quick search"
        >
          <Search className="w-4 h-4 text-blue-700 shrink-0" />
          <span className="flex-1 text-left font-medium">Quick Search (Ctrl+K)...</span>
          <kbd className="bg-white border border-slate-300 text-slate-600 rounded px-1.5 py-0.5 text-[10px] font-mono shadow-2xs">
            Ctrl+K
          </kbd>
        </button>

        {/* Right User Controls */}
        <div className="flex items-center gap-4 text-xs">
          {/* Environment Status Badge */}
          <div className="hidden md:flex items-center gap-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded font-mono font-semibold text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            Keycloak OIDC: Active
          </div>

          {/* Notifications Trigger */}
          <Link
            href="/notifications"
            className="p-1.5 text-slate-500 hover:text-blue-700 rounded-full hover:bg-slate-100 relative transition-colors"
            aria-label={unreadCount > 0 ? `Notifications (${unreadCount} unread)` : 'Notifications'}
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </Link>

          {/* User Profile Info */}
          <Link href="/profile" className="flex items-center gap-2 text-slate-800 hover:text-blue-800 font-semibold border-l border-slate-200 pl-4">
            <div className="w-7 h-7 rounded-full bg-blue-700 text-white flex items-center justify-center font-bold text-xs shadow-xs">
              {initials}
            </div>
            <div className="hidden lg:block text-left leading-tight">
              <div className="text-slate-900 font-bold">{displayName}</div>
              {displayDept && (
                <div className="text-[10px] text-slate-500 font-normal">{displayDept}</div>
              )}
            </div>
          </Link>

          {/* Sign Out */}
          <button
            onClick={logout}
            className="text-slate-400 hover:text-rose-600 p-1.5 rounded-full hover:bg-rose-50 transition-colors"
            title="Sign Out"
            aria-label="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>


      <GlobalSearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
};
