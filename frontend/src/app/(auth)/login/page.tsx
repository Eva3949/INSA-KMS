'use client';

import React, { useState } from 'react';
import { Lock, Eye, EyeOff, ShieldCheck, Info, Loader2 } from 'lucide-react';
import { Button } from '@/src/components/ui/Button';
import { Input } from '@/src/components/ui/Input';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSsoRedirect = () => {
    setIsLoading(true);
    // Keycloak OIDC Authorization Code Flow Redirect
    const keycloakIssuer = process.env.NEXT_PUBLIC_KEYCLOAK_URL || 'http://localhost:8080';
    const realm = process.env.NEXT_PUBLIC_KEYCLOAK_REALM || 'kms-realm';
    const clientId = process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID || 'kms-frontend-client';
    const redirectUri = encodeURIComponent(`${window.location.origin}/auth/callback`);

    const ssoUrl = `${keycloakIssuer}/realms/${realm}/protocol/openid-connect/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=openid%20profile%20email`;
    window.location.href = ssoUrl;
  };

  const handleDirectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    // Route authentication through official Keycloak OIDC Authorization Code Flow
    handleSsoRedirect();
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

      {/* Main Login Card Center Container */}
      <div className="flex-1 flex items-center justify-center p-4 my-6">
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          {/* Header Branding with Official INSA Logo */}
          <div className="p-8 bg-white border-b border-slate-100 text-center">
            {/* Official INSA Logo Asset */}
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
            {/* Error Message Box */}
            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg flex items-start gap-2">
                <Info className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>{errorMessage}</div>
              </div>
            )}

            {/* Form for Direct Credentials */}
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
                <label className="block text-xs font-semibold text-slate-700">
                  Password
                </label>
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

              {/* Remember Me Option */}
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

              {/* Primary SIGN IN Button */}
              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full font-bold text-sm justify-center bg-blue-700 hover:bg-blue-800 text-white shadow-sm py-3 rounded-lg transition-colors"
                disabled={isLoading}
                icon={isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : undefined}
              >
                SIGN IN
              </Button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-3 my-3">
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-xs text-slate-400 font-medium tracking-wide">─ OR ─</span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>

            {/* Secondary INSA SSO Button */}
            <div>
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="w-full font-semibold text-xs justify-center border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-blue-300 hover:text-blue-900 py-3 rounded-lg transition-colors bg-white"
                onClick={handleSsoRedirect}
                disabled={isLoading}
                icon={isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4 text-blue-700" />}
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

      {/* Official Footer */}
      <footer className="p-4 text-center text-xs text-slate-500 border-t border-slate-200 bg-white">
        <div className="font-semibold text-slate-700">INSA Knowledge Management System</div>
        <div className="text-[11px] text-slate-400 mt-0.5">&copy; 2026 INSA. All Rights Reserved.</div>
      </footer>
    </div>
  );
}
