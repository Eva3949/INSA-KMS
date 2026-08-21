'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, ShieldCheck, AlertCircle } from 'lucide-react';
import { UserRole } from '@/src/lib/auth';

const KEYCLOAK_URL =
  process.env.NEXT_PUBLIC_KEYCLOAK_URL || 'http://localhost:8080';
const REALM =
  process.env.NEXT_PUBLIC_KEYCLOAK_REALM || 'kms-realm';
const CLIENT_ID =
  process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID || 'kms-frontend-client';
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081/api/v1';

type CallbackStatus = 'exchanging' | 'fetching_profile' | 'redirecting' | 'error';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<CallbackStatus>('exchanging');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get('code');
    const errorParam = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    if (errorParam) {
      setErrorMessage(errorDescription || errorParam);
      setStatus('error');
      return;
    }

    if (!code) {
      setErrorMessage('No authorization code received from identity provider.');
      setStatus('error');
      return;
    }

    const doExchange = async () => {
      try {
        // Exchange authorization code for access token
        setStatus('exchanging');
        const redirectUri = `${window.location.origin}/auth/callback`;
        const tokenUrl = `${KEYCLOAK_URL}/realms/${REALM}/protocol/openid-connect/token`;

        const tokenParams = new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: CLIENT_ID,
          code,
          redirect_uri: redirectUri,
        });

        const tokenRes = await fetch(tokenUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: tokenParams.toString(),
        });

        if (!tokenRes.ok) {
          const errorData = await tokenRes.text();
          throw new Error(`Token exchange failed: ${errorData}`);
        }

        const tokenData = await tokenRes.json();
        const accessToken: string = tokenData.access_token;

        if (!accessToken) {
          throw new Error('No access token in response from identity provider.');
        }

        // Store token
        sessionStorage.setItem('kms_access_token', accessToken);
        if (tokenData.refresh_token) {
          sessionStorage.setItem('kms_refresh_token', tokenData.refresh_token);
        }
        // Set a cookie so the Next.js middleware can detect authenticated state
        document.cookie = 'kms_auth_present=true; path=/; samesite=lax';

        // Fetch user profile to determine roles
        setStatus('fetching_profile');
        const profileRes = await fetch(`${API_BASE_URL}/users/me`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (!profileRes.ok) {
          throw new Error(`Failed to retrieve user profile: ${profileRes.status}`);
        }

        const profile = await profileRes.json();
        const roles: UserRole[] = (profile.roles || []) as UserRole[];

        // Role-based landing redirect
        setStatus('redirecting');
        if (roles.includes('ROLE_ADMIN')) {
          router.replace('/admin');
        } else {
          router.replace('/library');
        }
      } catch (err: unknown) {
        console.error('[AuthCallback] Error:', err);
        const message = err instanceof Error ? err.message : 'Authentication failed.';
        setErrorMessage(message);
        setStatus('error');
      }
    };

    doExchange();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const statusMessages: Record<CallbackStatus, string> = {
    exchanging: 'Exchanging authorization code with Keycloak...',
    fetching_profile: 'Retrieving your authenticated profile and roles...',
    redirecting: 'Authentication successful. Redirecting to your workspace...',
    error: 'Authentication Error',
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-md shadow-2xl overflow-hidden">
        <div className="p-6 bg-slate-950 border-b border-slate-800 text-center">
          <h1 className="text-lg font-bold text-white tracking-wide">INSA KMS</h1>
          <p className="text-xs text-slate-400 mt-0.5">Secure Authentication Gateway</p>
        </div>

        <div className="p-8 flex flex-col items-center gap-4 text-center">
          {status === 'error' ? (
            <>
              <AlertCircle className="w-10 h-10 text-red-500" />
              <div>
                <h2 className="text-base font-bold text-red-400">Authentication Failed</h2>
                <p className="text-xs text-slate-400 mt-2 max-w-xs">{errorMessage}</p>
              </div>
              <button
                onClick={() => router.replace('/login')}
                className="mt-2 px-4 py-2 bg-blue-700 hover:bg-blue-600 text-white text-xs font-semibold rounded transition-colors"
              >
                Return to Login
              </button>
            </>
          ) : (
            <>
              {status === 'redirecting' ? (
                <ShieldCheck className="w-10 h-10 text-emerald-500" />
              ) : (
                <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
              )}
              <div>
                <h2 className="text-base font-semibold text-white">
                  {statusMessages[status]}
                </h2>
                <p className="text-xs text-slate-500 mt-2">
                  Please wait while your session is securely established.
                </p>
              </div>
              <div className="flex gap-1.5 mt-2">
                {(['exchanging', 'fetching_profile', 'redirecting'] as const).map((s, i) => (
                  <div
                    key={s}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      (['exchanging', 'fetching_profile', 'redirecting'] as const).indexOf(status) >= i
                        ? 'bg-blue-500'
                        : 'bg-slate-700'
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
          <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
        </div>
      }
    >
      <AuthCallbackContent />
    </React.Suspense>
  );
}
