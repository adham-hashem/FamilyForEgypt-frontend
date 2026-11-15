import { useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, hasSessionHint, refreshSession, setSession, setSessionListener } from './api';
import { ROLE_RANK } from './format';
import type { AuthResponse, User, UserRole } from './types';

interface AuthState {
  user: User | null;
  /** True until we know whether a previous session can be resumed. */
  loading: boolean;
  login(email: string, password: string): Promise<User>;
  logout(): Promise<void>;
  /** Stores a new token pair (after a password change) or refreshes the profile. */
  accept(auth: AuthResponse): void;
  reload(): Promise<void>;
  hasRole(minimum: UserRole): boolean;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(hasSessionHint());
  const queryClient = useQueryClient();

  useEffect(() => {
    setSessionListener((auth) => setUser(auth?.user ?? null));
    if (hasSessionHint()) void refreshSession().finally(() => setLoading(false));
  }, []);

  const accept = useCallback((auth: AuthResponse) => {
    setSession(auth);
    setUser(auth.user);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const auth = await api<AuthResponse>('/api/auth/login', { method: 'POST', body: { email, password } });
    accept(auth);
    return auth.user;
  }, [accept]);

  const logout = useCallback(async () => {
    try {
      await api('/api/auth/logout', { method: 'POST', body: {} });
    } catch {
      /* signing out locally must always work, even offline */
    }
    setSession(null);
    setUser(null);
    queryClient.clear();
  }, [queryClient]);

  const reload = useCallback(async () => {
    setUser(await api<User>('/api/auth/me'));
  }, []);

  const value = useMemo<AuthState>(() => ({
    user, loading, login, logout, accept, reload,
    hasRole: (minimum) => !!user && ROLE_RANK[user.role] >= ROLE_RANK[minimum],
  }), [user, loading, login, logout, accept, reload]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
