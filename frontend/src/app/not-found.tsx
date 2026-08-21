import React from 'react';
import Link from 'next/link';
import { AlertCircle, Home } from 'lucide-react';
import { Button } from '@/src/components/ui/Button';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-kms-slate-900 flex flex-col items-center justify-center p-4 text-center text-white">
      <div className="bg-kms-slate-950 border border-kms-slate-800 p-8 rounded-md max-w-md shadow-2xl space-y-4">
        <AlertCircle className="w-12 h-12 text-blue-500 mx-auto" />
        <div>
          <h1 className="text-2xl font-bold font-mono">404 - Resource Not Found</h1>
          <p className="text-xs text-kms-slate-400 mt-2">
            The requested document, folder, or route does not exist or has been moved within the enterprise repository.
          </p>
        </div>

        <div className="pt-2">
          <Link href="/library">
            <Button variant="primary" size="md" icon={<Home className="w-4 h-4" />}>
              Return to Document Library
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
