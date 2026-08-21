'use client';

import React from 'react';
import { AppShell } from '@/src/components/layout/AppShell';
import { Breadcrumb } from '@/src/components/ui/Breadcrumb';
import { Button } from '@/src/components/ui/Button';
import { EmptyState } from '@/src/components/ui/States';
import { Bell, Check } from 'lucide-react';

export default function NotificationsPage() {
  // Notifications are event-driven. If the backend does not have a notifications
  // endpoint yet, we display a proper empty state rather than fake data.
  const notifications: never[] = [];

  return (
    <AppShell>
      <div className="space-y-5 max-w-3xl mx-auto">
        <div className="flex items-center justify-between border-b border-kms-slate-200 pb-3">
          <div>
            <Breadcrumb items={[{ label: 'User Context' }, { label: 'Notifications' }]} />
            <h1 className="text-xl font-bold text-kms-slate-900 tracking-tight flex items-center gap-2">
              <Bell className="w-5 h-5 text-blue-700" />
              Notifications &amp; Subscription Alerts
            </h1>
          </div>

          {notifications.length > 0 && (
            <Button variant="outline" size="sm" icon={<Check className="w-4 h-4" />}>
              Mark All as Read
            </Button>
          )}
        </div>

        <EmptyState
          title="No notifications"
          message="You have no unread notifications. Notifications for document shares, @mentions, and saved search matches will appear here."
        />
      </div>
    </AppShell>
  );
}
