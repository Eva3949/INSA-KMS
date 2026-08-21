'use client';

import React, { useState } from 'react';
import { Lock, Eye, EyeOff, ShieldCheck, Info, Loader2 } from 'lucide-react';
import { Button } from '@/src/components/ui/Button';
import { Input } from '@/src/components/ui/Input';

const KEYCLOAK_URL = process.env.NEXT_PUBLIC_KEYCLOAK_URL || 'http://localhost:8080';
const REALM = process.env.NEXT_PUBLIC_KEYCLOAK_REALM || 'kms-realm';
const CLIENT_ID = process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID || 'kms-frontend-client';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081/api/v1';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  /**
   * Direct Grant (ROPC) Login Flow:
   * 1. POST credentials to Keycloak token endpoint — no browser redirect to Keycloak
   * 2. Store the JWT access token in sessionStorage
   * 3. Fetch user profile from Spring Boot backend
   * 4. Redirect to /admin (admins) or /library (others)
   */
  const handleDirectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      // Step 1: Get access token directly from Keycloak (runs in background, no redirect)
      const tokenRes = await fetch(
        `${KEYCLOAK_URL}/realms/${REALM}/protocol/openid-connect/token`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            grant_type: 'password',
            client_id: CLIENT_ID,
            username: username.trim(),
            password,
            scope: 'openid profile email',
          }),
        }
      );

      if (!tokenRes.ok) {
        const errData = await tokenRes.json().catch(() => ({}));
        if (errData?.error === 'invalid_grant') {
          throw new Error('Invalid username or password. Please try again.');
        }
        throw new Error(errData?.error_description || 'Authentication failed. Please try again.');
      }

      const tokenData = await tokenRes.json();
      const accessToken: string = tokenData.access_token;

      // Step 2: Store token — user stays on localhost:3000 entirely
      sessionStorage.setItem('kms_access_token', accessToken);
      if (tokenData.refresh_token) {
        sessionStorage.setItem('kms_refresh_token', tokenData.refresh_token);
      }
      document.cookie = 'kms_auth_present=true; path=/; samesite=lax';

      // Step 3: Fetch user role from backend for role-based redirect
      let redirectPath = '/library';
      try {
        const profileRes = await fetch(`${API_BASE_URL}/users/me`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (profileRes.ok) {
          const profile = await profileRes.json();
          const roles: string[] = profile.roles || profile.realmRoles || [];
          if (
            roles.includes('ROLE_ADMIN') ||
            roles.includes('ROLE_SYSTEM_ADMINISTRATOR') ||
            roles.includes('SYSTEM_ADMINISTRATOR')
          ) {
            redirectPath = '/admin';
          }
        }
      } catch {
        // Backend unavailable — use default library redirect
      }

      // Step 4: Navigate to dashboard directly — Keycloak page never opens
      window.location.href = redirectPath;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Authentication failed. Please try again.';
      setErrorMessage(message);
      setIsLoading(false);
    }
  };

  const handleSsoRedirect = () => {
    setIsLoading(true);
    const redirectUri = encodeURIComponent(`${window.location.origin}/auth/callback`);
    const ssoUrl = `${KEYCLOAK_URL}/realms/${REALM}/protocol/openid-connect/auth?client_id=${CLIENT_ID}&redirect_uri=${redirectUri}&response_type=code&scope=openid%20profile%20email`;
    window.location.href = ssoUrl;
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between font-sans text-slate-800">
      {/* Top Security Banner */}
      <div className="bg-white border-b border-slate-200 px-6 py-2 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 text-slate-600 font-medium">
          <ShieldCheck className="w-4 h-4 text-blue-700" />
          <span>INSA Official System — Authorized Access Only</span>
        </div>
        <div className="text-slate-400 text-[11px] font-mono hidden md:block">
          Security Level: High (Keycloak OAuth 2.0 / OIDC)
        </div>
      </div>

      {/* Main Login Card */}
      <div className="flex-1 flex items-center justify-center p-4 my-6">
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          {/* Header Branding */}
          <div className="p-8 bg-white border-b border-slate-100 text-center">
            <img
              src="/images/insalogo.png"
              alt="INSA"
              className="h-14 w-auto mx-auto mb-4 object-contain"
            />
            <h1 className="text-2xl font-black text-blue-900 tracking-tight">INSA KMS</h1>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mt-1">
              INSA Knowledge Management System
            </p>
            <div className="mt-4 pt-3 border-t border-slate-100">
              <h2 className="text-sm font-bold text-slate-800">Welcome back</h2>
              <p className="text-xs text-slate-500 mt-0.5">Sign in to continue</p>
            </div>
          </div>

          {/* Form Content */}
          <div className="p-6 space-y-5">
            {/* Error Message */}
            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg flex items-start gap-2">
                <Info className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>{errorMessage}</div>
              </div>
            )}

            {/* Credentials Form */}
            <form onSubmit={handleDirectSubmit} className="space-y-4">
              <Input
                label="Username / Email"
                type="text"
                placeholder="username or user@insa.gov.et"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white pr-10 text-slate-900 placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember Me */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600 font-medium">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 text-blue-700 rounded border-slate-300 focus:ring-blue-600"
                  />
                  <span>Remember me</span>
                </label>
              </div>

              {/* Sign In Button */}
              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full font-bold text-sm justify-center bg-blue-700 hover:bg-blue-800 text-white shadow-sm py-3 rounded-lg transition-colors"
                disabled={isLoading}
                icon={isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : undefined}
              >
                {isLoading ? 'Signing in...' : 'SIGN IN'}
              </Button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-3 my-3">
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-xs text-slate-400 font-medium tracking-wide">─ OR ─</span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>

            {/* SSO Button (opens Keycloak login page) */}
            <div>
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="w-full font-semibold text-xs justify-center border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-blue-300 hover:text-blue-900 py-3 rounded-lg transition-colors bg-white"
                onClick={handleSsoRedirect}
                disabled={isLoading}
                icon={
                  isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Lock className="w-4 h-4 text-blue-700" />
                  )
                }
              >
                Sign in with INSA SSO
              </Button>
            </div>

            {/* Security Note */}
            <div className="pt-2 text-center text-[11px] text-slate-400 space-y-0.5">
              <div className="font-semibold text-slate-500">Secure authentication</div>
              <div>Protected by INSA</div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="p-4 text-center text-xs text-slate-500 border-t border-slate-200 bg-white">
        <div className="font-semibold text-slate-700">INSA Knowledge Management System</div>
        <div className="text-[11px] text-slate-400 mt-0.5">&copy; 2026 INSA. All Rights Reserved.</div>
      </footer>
    </div>
  );
}
