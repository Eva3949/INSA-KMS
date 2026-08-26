'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AppShell } from '@/src/components/layout/AppShell';
import { Breadcrumb } from '@/src/components/ui/Breadcrumb';
import { Button } from '@/src/components/ui/Button';
import { Badge } from '@/src/components/ui/Badge';
import { LoadingState, EmptyState, ErrorState } from '@/src/components/ui/States';
import { Bell, Check, CheckCheck } from 'lucide-react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081/api/v1';

interface Notification {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

function formatTimestamp(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = sessionStorage.getItem('kms_access_token');
      const res = await fetch(`${API_BASE_URL}/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Failed to fetch notifications (${res.status})`);
      const data: Notification[] = await res.json();
      setNotifications(data);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const token = sessionStorage.getItem('kms_access_token');
      const res = await fetch(`${API_BASE_URL}/notifications/unread-count`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data: { count: number } = await res.json();
        setUnreadCount(data.count);
      }
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    fetchUnreadCount();
  }, [fetchNotifications, fetchUnreadCount]);

  const handleMarkAsRead = async (id: string) => {
    try {
      const token = sessionStorage.getItem('kms_access_token');
      const res = await fetch(`${API_BASE_URL}/notifications/${id}/read`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch {
      // silent
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const token = sessionStorage.getItem('kms_access_token');
      const res = await fetch(`${API_BASE_URL}/notifications/read-all`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
    } catch {
      // silent
    }
  };

  return (
    <AppShell>
      <div className="space-y-5 max-w-3xl mx-auto">
        <div className="flex items-center justify-between border-b border-kms-slate-200 pb-3">
          <div>
            <Breadcrumb items={[{ label: 'User Context' }, { label: 'Notifications' }]} />
            <h1 className="text-xl font-bold text-kms-slate-900 tracking-tight flex items-center gap-2">
              <Bell className="w-5 h-5 text-blue-700" />
              Notifications &amp; Subscription Alerts
              {unreadCount > 0 && (
                <Badge label={`${unreadCount}`} variant="red" />
              )}
            </h1>
          </div>

          {unreadCount > 0 && (
            <Button variant="outline" size="sm" icon={<CheckCheck className="w-4 h-4" />} onClick={handleMarkAllAsRead}>
              Mark All as Read
            </Button>
          )}
        </div>

        {loading && <LoadingState message="Loading notifications..." />}
        {error && <ErrorState message={error} onRetry={fetchNotifications} />}

        {!loading && !error && notifications.length === 0 && (
          <EmptyState
            title="No notifications"
            message="You have no unread notifications. Notifications for document shares, @mentions, and saved search matches will appear here."
          />
        )}

        {!loading && !error && notifications.length > 0 && (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                onClick={() => !notification.isRead && handleMarkAsRead(notification.id)}
                className={`p-4 rounded border cursor-pointer transition-colors ${
                  notification.isRead
                    ? 'bg-white border-kms-slate-200 hover:bg-kms-slate-50'
                    : 'bg-blue-50 border-blue-200 hover:bg-blue-100/70'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${notification.isRead ? 'bg-kms-slate-300' : 'bg-blue-600'}`} />
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-kms-slate-900">{notification.title}</h4>
                      <p className="text-xs text-kms-slate-600 mt-1 leading-relaxed">{notification.message}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {!notification.isRead && (
                      <Badge label="Unread" variant="blue" />
                    )}
                    <span className="text-[11px] text-kms-slate-400 whitespace-nowrap">{formatTimestamp(notification.createdAt)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
