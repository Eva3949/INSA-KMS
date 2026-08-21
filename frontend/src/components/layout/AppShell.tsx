'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { TopHeader } from './TopHeader';
import { useAuth } from '@/src/lib/auth-context';
import { Loader2 } from 'lucide-react';

interface AppShellProps {
  children: React.ReactNode;
  /** Optional: require a specific role to access this shell. If the user lacks it, show 403. */
  requiredRole?: string;
}

export const AppShell: React.FC<AppShellProps> = ({ children, requiredRole }) => {
  const { user, roles, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  // While auth state is being resolved, show a full-page loader
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <span className="text-xs font-medium">Loading secure workspace...</span>
        </div>
      </div>
    );
  }

  // If not authenticated, redirect to login (belt-and-suspenders beyond middleware)
  if (!isAuthenticated) {
    router.replace('/login');
    return null;
  }

  // Role-based access control: if a required role is specified and user lacks it
  if (
    requiredRole &&
    !roles.includes('ROLE_ADMIN') &&
    !roles.includes(requiredRole as never)
  ) {
    router.replace('/unauthorized');
    return null;
  }

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900 antialiased">
      {/* Sidebar Navigation */}
      <Sidebar userRoles={roles} user={user} />

      {/* Main Workspace Layout Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <TopHeader user={user} />
        <main className="flex-1 p-6 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
