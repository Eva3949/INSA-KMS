'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldX, Home, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/src/lib/auth-context';

export default function UnauthorizedPage() {
  const { user, roles } = useAuth();

  const homePath = roles.includes('ROLE_ADMIN') ? '/admin' : '/library';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-center">
      <div className="bg-white border border-rose-200 p-8 rounded-xl max-w-lg shadow-sm space-y-5 w-full">
        {/* Header */}
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center">
            <ShieldX className="w-8 h-8 text-rose-600" />
          </div>
        </div>

        <div>
          <div className="text-xs font-mono text-rose-600 mb-2 uppercase tracking-widest font-bold">HTTP 403</div>
          <h1 className="text-2xl font-bold text-slate-900">Access Denied</h1>
          <p className="text-sm text-slate-600 mt-3 leading-relaxed">
            Your authenticated identity does not have the required permission to access this resource.
          </p>
          <p className="text-xs text-slate-400 mt-2">
            This access restriction is enforced by the backend authorization layer and cannot be bypassed.
          </p>
        </div>

        {/* User context */}
        {user && (
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-left space-y-1">
            <div className="text-[11px] text-slate-400 uppercase tracking-wider font-bold mb-2">
              Your Current Identity
            </div>
            <div className="text-xs text-slate-700">
              <span className="text-slate-500">User:</span>{' '}
              <span className="font-semibold text-slate-900">{user.fullName || user.username}</span>
            </div>
            <div className="text-xs text-slate-700">
              <span className="text-slate-500">Roles:</span>{' '}
              <span className="font-mono text-blue-700">{roles.join(', ') || 'None assigned'}</span>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center gap-3 justify-center pt-2">
          <Link
            href={homePath}
            className="flex items-center gap-2 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-md transition-colors shadow-xs"
          >
            <Home className="w-4 h-4" />
            Return to My Workspace
          </Link>
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-300 rounded-md transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </button>
        </div>

        <p className="text-[11px] text-slate-400">
          If you believe this is an error, contact your System Administrator.
        </p>
      </div>
    </div>
  );
}

