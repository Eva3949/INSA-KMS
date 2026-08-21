import React from 'react';
import { Loader2, FolderOpen, AlertCircle, ShieldOff } from 'lucide-react';
import { Button } from './Button';

export const LoadingState: React.FC<{ message?: string }> = ({
  message = 'Loading document workspace...',
}) => (
  <div className="flex flex-col items-center justify-center p-12 text-center text-kms-slate-500 space-y-3">
    <Loader2 className="w-8 h-8 text-blue-700 animate-spin" />
    <p className="text-xs font-medium">{message}</p>
  </div>
);

export const EmptyState: React.FC<{
  title?: string;
  description?: string;
  message?: string;
  action?: React.ReactNode;
}> = ({
  title = 'No documents found',
  description,
  message,
  action,
}) => {
  const bodyText = description || message || 'There are no items matching your criteria in this folder or search view.';
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center kms-card bg-white space-y-3 border-dashed border-2 border-kms-slate-300">
      <FolderOpen className="w-10 h-10 text-kms-slate-400" />
      <div>
        <h4 className="text-sm font-bold text-kms-slate-800">{title}</h4>
        <p className="text-xs text-kms-slate-500 mt-1 max-w-sm">{bodyText}</p>
      </div>
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
};


export const ErrorState: React.FC<{
  title?: string;
  message?: string;
  onRetry?: () => void;
}> = ({
  title = 'Failed to load workspace data',
  message = 'An unexpected error occurred while communicating with the REST service backend.',
  onRetry,
}) => (
  <div className="p-6 kms-card bg-red-50/50 border border-red-200 text-center space-y-3">
    <AlertCircle className="w-8 h-8 text-red-600 mx-auto" />
    <div>
      <h4 className="text-sm font-bold text-red-900">{title}</h4>
      <p className="text-xs text-red-700 mt-1">{message}</p>
    </div>
    {onRetry && (
      <Button variant="outline" size="sm" onClick={onRetry} className="border-red-300 text-red-800 hover:bg-red-100">
        Retry Request
      </Button>
    )}
  </div>
);

export const PermissionDeniedState: React.FC<{ requiredRole?: string }> = ({
  requiredRole = 'ROLE_ADMIN',
}) => (
  <div className="flex flex-col items-center justify-center p-12 text-center kms-card bg-amber-50/40 border border-amber-200 space-y-3">
    <ShieldOff className="w-10 h-10 text-amber-700" />
    <div>
      <h4 className="text-sm font-bold text-amber-900">Access Restricted</h4>
      <p className="text-xs text-amber-800 mt-1 max-w-md">
        You do not have the required role permissions (<span className="font-mono font-semibold">{requiredRole}</span>) to view this governance or administration module.
      </p>
    </div>
  </div>
);
