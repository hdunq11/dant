import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { concertApi } from '../api/concertApi';
import { clearStoredTokens, getApiErrorMessage, getStoredTokens, setStoredTokens } from '../api/client';
import type { User } from '../types';

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string) => Promise<void>;
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
  }, []);

  const register = useCallback(
    async (email: string, password: string, fullName: string) => {
      await concertApi.register({
        email: email.trim(),
        password,
        password_confirm: password,
        full_name: fullName.trim(),
      });
      await login(email, password);
    },
    [login]
  );

  const logout = useCallback(() => {
    clearStoredTokens();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      isLoading,
      isAuthenticated: !!user,
      login,
      register,
      logout,
      refreshUser,
    }),
    [user, isLoading, login, register, logout, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export { getApiErrorMessage };
