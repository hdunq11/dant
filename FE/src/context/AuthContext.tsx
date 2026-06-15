import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { concertApi, type RegisterPayload } from '../api/concertApi';
import { clearStoredTokens, getApiErrorMessage, getStoredTokens, setStoredTokens } from '../api/client';
import type { User } from '../types';

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isOrganizer: boolean;
  isOrganizerApproved: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (payload: RegisterPayload) => Promise<User>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const { access } = getStoredTokens();
    if (!access) {
      setUser(null);
      return;
    }
    const res = await concertApi.getMe();
    setUser(res.data);
  }, []);

  useEffect(() => {
    refreshUser()
      .catch(() => {
        clearStoredTokens();
        setUser(null);
      })
      .finally(() => setIsLoading(false));
  }, [refreshUser]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await concertApi.login(email.trim(), password);
    setStoredTokens(res.data.access, res.data.refresh);
    setUser(res.data.user);
    return res.data.user;
  }, []);

  const register = useCallback(
    async (payload: RegisterPayload) => {
      const res = await concertApi.register({
        ...payload,
        email: payload.email.trim(),
        full_name: payload.full_name.trim(),
      });
      await login(payload.email, payload.password);
      return res.data;
    },
    [login]
  );

  const logout = useCallback(() => {
    clearStoredTokens();
    setUser(null);
  }, []);

  const isAdmin = !!user && (user.role === 'admin' || user.is_staff === true);
  const isOrganizer = !!user && (user.role === 'organizer' || !!user.organizer_profile);
  const isOrganizerApproved = isOrganizer && user?.organizer_profile?.status === 'approved';

  const value = useMemo(
    () => ({
      user,
      isLoading,
      isAuthenticated: !!user,
      isAdmin,
      isOrganizer,
      isOrganizerApproved,
      login,
      register,
      logout,
      refreshUser,
    }),
    [user, isLoading, isAdmin, isOrganizer, isOrganizerApproved, login, register, logout, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export { getApiErrorMessage };
