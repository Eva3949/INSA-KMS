import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that do not require authentication
const PUBLIC_PATHS = [
  '/login',
  '/auth/callback',
  '/_next',
  '/favicon.ico',
  '/api',
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/') || pathname.startsWith(p));
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow public paths
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // Check for token in cookie (set by client after OIDC callback)
  // Note: sessionStorage is client-only so we use a cookie as the middleware signal.
  // The real authoritative check is always the backend (Spring Security / JWT).
  const tokenCookie = request.cookies.get('kms_auth_present');

  if (!tokenCookie || tokenCookie.value !== 'true') {
    // No auth signal ? redirect to login, preserving intended destination
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Match all routes except static files and Next.js internals
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
