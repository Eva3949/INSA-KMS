'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from 'react';
import { useRouter } from 'next/navigation';
import { UserRole } from '@/src/lib/auth';

export interface AuthUser {
  id?: string;
  username: string;
  email: string;
  fullName: string;
  department?: string;
  roles: UserRole[];
}

interface AuthContextValue {
  user: AuthUser | null;
  roles: UserRole[];
  isAuthenticated: boolean;
  isLoading: boolean;
  logout: () => void;
  refetch: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  roles: [],
  isAuthenticated: false,
  isLoading: true,
  logout: () => {},
  refetch: () => {},
});

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}

function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem('kms_access_token');
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081/api/v1';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isMounted = useRef(true);

  const fetchUser = useCallback(async () => {
    const token = getStoredToken();
    if (!token) {
      if (isMounted.current) setIsLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401) {
        sessionStorage.removeItem('kms_access_token');
        if (isMounted.current) {
          setUser(null);
          setIsLoading(false);
        }
        router.replace('/login');
        return;
      }

      if (!res.ok) {
        throw new Error(`Failed to fetch user profile: ${res.status}`);
      }

      const data = await res.json();
      if (isMounted.current) {
        setUser({
          id: data.id,
          username: data.username,
          email: data.email,
          fullName: data.fullName || data.username,
          department: data.department,
          roles: (data.roles || []) as UserRole[],
        });
      }
    } catch (err) {
      console.error('[AuthContext] fetchUser error:', err);
      if (isMounted.current) {
        setUser(null);
      }
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, [router]);

  useEffect(() => {
    isMounted.current = true;
    fetchUser();
    return () => {
      isMounted.current = false;
    };
  }, [fetchUser]);

  const logout = useCallback(() => {
    // Clear all local session data — no redirect to Keycloak logout page
    sessionStorage.removeItem('kms_access_token');
    sessionStorage.removeItem('kms_refresh_token');
    setUser(null);
    // Clear the middleware auth signal cookie
    document.cookie = 'kms_auth_present=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    // Redirect directly to login page — Keycloak UI never opens
    window.location.href = '/login';
  }, []);


  const value: AuthContextValue = {
    user,
    roles: user?.roles ?? [],
    isAuthenticated: user !== null,
    isLoading,
    logout,
    refetch: fetchUser,
  };

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}
