'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  Check,
  CheckCheck,
  ExternalLink,
  FileText,
  CheckCircle2,
  UserCheck,
  ShieldAlert,
  Search,
  Layers,
  MessageSquare,
  Video,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { kmsApi } from '@/src/lib/api';
import { AuthUser } from '@/src/lib/auth-context';

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
  eventType?: string;
  targetType?: string;
  targetId?: string;
  actionUrl?: string;
}

interface NotificationDropdownProps {
  user?: AuthUser | null;
}

function formatTimeAgo(isoString?: string): string {
  if (!isoString) return '';
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 45) return 'Just now';
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

function getEventBadge(eventType?: string) {
  if (!eventType) {
    return { label: 'System', icon: Bell, bg: 'bg-slate-100 text-slate-700 border-slate-200' };
  }
  const type = eventType.toUpperCase();
  if (type.startsWith('BLOG_') || type.includes('BLOG')) {
    return { label: 'Blog', icon: MessageSquare, bg: 'bg-blue-50 text-blue-700 border-blue-200' };
  }
  if (type.startsWith('DOC_') || type.startsWith('DOCUMENT_')) {
    return { label: 'Document', icon: FileText, bg: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
  }
  if (type.startsWith('APPROVAL_') || type.includes('APPROV')) {
    return { label: 'Approval', icon: CheckCircle2, bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  }
  if (type.startsWith('KT_') || type.includes('TRANSFER')) {
    return { label: 'Knowledge Transfer', icon: Layers, bg: 'bg-teal-50 text-teal-700 border-teal-200' };
  }
  if (type.startsWith('HR_')) {
    return { label: 'HR & Org', icon: UserCheck, bg: 'bg-amber-50 text-amber-800 border-amber-200' };
  }
  if (type.includes('SEARCH')) {
    return { label: 'Search Alert', icon: Search, bg: 'bg-purple-50 text-purple-700 border-purple-200' };
  }
  if (type.includes('SECURITY') || type.includes('ACCESS')) {
    return { label: 'Security', icon: ShieldAlert, bg: 'bg-rose-50 text-rose-700 border-rose-200' };
  }
  if (type.startsWith('VIDEO_') || type.includes('VIDEO') || type.includes('VIRTUAL')) {
    return { label: 'Video Discussion', icon: Video, bg: 'bg-cyan-50 text-cyan-700 border-cyan-200' };
  }
  return { label: 'System', icon: Bell, bg: 'bg-slate-100 text-slate-700 border-slate-200' };
}

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({ user }) => {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [markingAllRead, setMarkingAllRead] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch unread count for current user
  const fetchUnreadCount = useCallback(() => {
    if (typeof window === 'undefined') return;
    const token = sessionStorage.getItem('kms_access_token');
    if (!token) {
      setUnreadCount(0);
      return;
    }
    kmsApi.notifications
      .getUnreadCount()
      .then((data) => {
        if (data && typeof data.unreadCount === 'number') {
          setUnreadCount(data.unreadCount);
        }
      })
      .catch(() => {
        // Safe fallback, keep existing count
      });
  }, []);

  // Fetch recent notifications on dropdown open
  const fetchRecentNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await kmsApi.notifications.list({ page: 0, size: 6, unreadOnly: false });
      const list = Array.isArray(data) ? data : data?.content ?? [];
      setNotifications(list);
      // Also refresh unread count to ensure exact sync
      fetchUnreadCount();
    } catch (err: any) {
      setError(err?.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [fetchUnreadCount]);

  // Initial fetch and 20s polling + kms_notification_updated event listener
  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 20000);

    const handleUpdate = (e: any) => {
      if (typeof e?.detail?.count === 'number') {
        setUnreadCount(e.detail.count);
      } else {
        fetchUnreadCount();
      }
    };

    window.addEventListener('kms_notification_updated', handleUpdate);
    return () => {
      clearInterval(interval);
      window.removeEventListener('kms_notification_updated', handleUpdate);
    };
  }, [fetchUnreadCount]);

  // Reset notification state when user logs out or changes
  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      setNotifications([]);
      setIsOpen(false);
    } else {
      fetchUnreadCount();
    }
  }, [user, fetchUnreadCount]);

  // Close dropdown on click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Toggle dropdown
  const handleToggle = () => {
    if (!isOpen) {
      setIsOpen(true);
      fetchRecentNotifications();
    } else {
      setIsOpen(false);
    }
  };

  // Mark a single notification as read and navigate if actionUrl exists
  const handleNotificationClick = async (item: NotificationItem) => {
    if (!item.isRead) {
      // Optimistic update
      setNotifications((prev) => prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n)));
      const newCount = Math.max(0, unreadCount - 1);
      setUnreadCount(newCount);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('kms_notification_updated', { detail: { count: newCount } }));
      }
      try {
        await kmsApi.notifications.markRead(item.id);
      } catch (err) {
        console.error('Failed to mark notification as read:', err);
      }
    }

    if (item.actionUrl && item.actionUrl.trim().length > 0) {
      setIsOpen(false);
      router.push(item.actionUrl.trim());
    }
  };

  // Mark single item read without navigating
  const handleMarkSingleRead = async (item: NotificationItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (item.isRead) return;

    // Optimistic update
    setNotifications((prev) => prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n)));
    const newCount = Math.max(0, unreadCount - 1);
    setUnreadCount(newCount);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('kms_notification_updated', { detail: { count: newCount } }));
    }

    try {
      await kmsApi.notifications.markRead(item.id);
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  // Mark all notifications as read
  const handleMarkAllAsRead = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (markingAllRead || unreadCount === 0) return;

    setMarkingAllRead(true);
    // Optimistic updates
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('kms_notification_updated', { detail: { count: 0 } }));
    }

    try {
      await kmsApi.notifications.markAllRead();
    } catch (err) {
      console.error('Failed to mark all as read:', err);
      // Re-fetch accurate count on error
      fetchUnreadCount();
      fetchRecentNotifications();
    } finally {
      setMarkingAllRead(false);
    }
  };

  const handleViewAll = () => {
    setIsOpen(false);
    router.push('/notifications');
  };

  if (!mounted) {
    return (
      <div className="p-1.5 text-slate-500 rounded-full relative">
        <Bell className="w-4 h-4" />
      </div>
    );
  }

  const badgeText = unreadCount > 99 ? '99+' : unreadCount.toString();

  return (
    <div className="relative" ref={containerRef}>
      {/* Bell Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        id="topbar-notification-bell"
        onClick={handleToggle}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label={unreadCount > 0 ? `Notifications (${unreadCount} unread)` : 'Notifications'}
        className={`p-1.5 rounded-full transition-colors relative focus:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-600 ${
          isOpen
            ? 'text-blue-700 bg-blue-50'
            : 'text-slate-500 hover:text-blue-700 hover:bg-slate-100'
        }`}
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span
            id="topbar-notification-badge"
            className="absolute -top-1 -right-1 min-w-[17px] h-4 px-1 bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white shadow-xs animate-in fade-in zoom-in-75 duration-200"
          >
            {badgeText}
          </span>
        )}
      </button>

      {/* Compact Dropdown Popover */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Recent notifications"
          className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-2 duration-150"
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-slate-900 tracking-wide uppercase">Notifications</h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 text-[11px] font-semibold bg-blue-100 text-blue-800 rounded-full">
                  {unreadCount} unread
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  type="button"
                  id="topbar-notification-mark-all-btn"
                  onClick={handleMarkAllAsRead}
                  disabled={markingAllRead}
                  className="flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 py-1 rounded transition-colors disabled:opacity-50"
                  title="Mark all notifications as read"
                >
                  {markingAllRead ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <CheckCheck className="w-3.5 h-3.5" />
                  )}
                  <span>Mark all read</span>
                </button>
              )}
            </div>
          </div>

          {/* Body: Notifications List */}
          <div className="max-h-[360px] overflow-y-auto divide-y divide-slate-100">
            {loading ? (
              <div className="p-6 text-center text-slate-400 space-y-3">
                <Loader2 className="w-5 h-5 animate-spin mx-auto text-blue-600" />
                <p className="text-xs">Loading notifications...</p>
              </div>
            ) : error ? (
              <div className="p-5 text-center space-y-2">
                <p className="text-xs text-rose-600 font-medium">{error}</p>
                <button
                  type="button"
                  onClick={fetchRecentNotifications}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded transition-colors"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Retry</span>
                </button>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2.5">
                  <Bell className="w-5 h-5" />
                </div>
                <p className="text-xs font-semibold text-slate-700">No notifications</p>
                <p className="text-[11px] text-slate-400 mt-0.5">You are all caught up!</p>
              </div>
            ) : (
              notifications.map((item) => {
                const badge = getEventBadge(item.eventType);
                const BadgeIcon = badge.icon;
                const timeAgo = formatTimeAgo(item.createdAt);

                return (
                  <div
                    key={item.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleNotificationClick(item)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleNotificationClick(item);
                      }
                    }}
                    className={`group relative p-3 transition-colors cursor-pointer flex gap-3 text-left border-l-4 ${
                      !item.isRead
                        ? 'bg-blue-50/40 hover:bg-blue-50/80 border-blue-600'
                        : 'hover:bg-slate-50 border-transparent'
                    }`}
                  >
                    {/* Event Icon */}
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${badge.bg}`}
                    >
                      <BadgeIcon className="w-4 h-4" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pr-6">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                          {badge.label}
                        </span>
                        {timeAgo && (
                          <>
                            <span className="text-slate-300 text-[10px]">•</span>
                            <span className="text-[10px] text-slate-400 font-normal">{timeAgo}</span>
                          </>
                        )}
                        {!item.isRead && (
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0 ml-auto mr-1" />
                        )}
                      </div>

                      <h4
                        className={`text-xs truncate ${
                          !item.isRead ? 'font-bold text-slate-900' : 'font-medium text-slate-700'
                        }`}
                      >
                        {item.title}
                      </h4>

                      <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-snug">
                        {item.message}
                      </p>
                    </div>

                    {/* Quick action: mark single read on hover/focus if unread */}
                    {!item.isRead && (
                      <button
                        type="button"
                        onClick={(e) => handleMarkSingleRead(item, e)}
                        className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 group-focus:opacity-100 p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                        title="Mark as read"
                        aria-label="Mark as read"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-2.5 bg-slate-50 border-t border-slate-100 text-center">
            <button
              type="button"
              id="topbar-notification-view-all-btn"
              onClick={handleViewAll}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold text-blue-700 hover:text-blue-800 hover:bg-blue-100/50 rounded-lg transition-colors"
            >
              <span>View all notifications</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
