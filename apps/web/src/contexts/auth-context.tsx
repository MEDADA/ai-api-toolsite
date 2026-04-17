'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { apiClient } from '@/lib/api-client';
import type { LoginResult, WalletBalance } from '@/lib/shared-types';

interface UserInfo {
  id: string;
  phone?: string;
  email?: string;
  level: string;
  gift_credit: boolean;
}

interface AuthContextValue {
  user: UserInfo | null;
  token: string | null;
  isLoggedIn: boolean;
  balance: WalletBalance | null;
  loading: boolean;
  login: (phone: string, code: string) => Promise<LoginResult>;
  sendCode: (phone: string) => Promise<void>;
  logout: () => void;
  refetchBalance: () => Promise<void>;
  refetchProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const TOKEN_KEY = 'auth_token';
const REFRESH_KEY = 'auth_refresh_token';
const USER_KEY = 'auth_user';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Restore session from localStorage
  useEffect(() => {
    const savedToken = typeof localStorage !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;
    const savedUser = typeof localStorage !== 'undefined' ? localStorage.getItem(USER_KEY) : null;
    if (savedToken && savedUser) {
      apiClient.setAuthToken(savedToken);
      setToken(savedToken);
      try {
        setUser(JSON.parse(savedUser) as UserInfo);
      } catch {
        // ignore
      }
    }
    setLoading(false);
  }, []);

  // Fetch balance when logged in
  useEffect(() => {
    if (!token) return;
    apiClient.setAuthToken(token);
    apiClient.wallet.getBalance().then((data) => {
      setBalance(data);
    }).catch(() => {
      // Token may be expired — handled by apiClient interceptor
    });
  }, [token]);

  // Schedule token refresh
  useEffect(() => {
    if (!token) return;
    // Refresh 60 seconds before expiry (assume 7 days = 604800s)
    const ms = (604800 - 60) * 1000;
    refreshTimerRef.current = setTimeout(async () => {
      try {
        const refreshToken = typeof localStorage !== 'undefined' ? localStorage.getItem(REFRESH_KEY) : null;
        if (!refreshToken) { logout(); return; }
        const result = await apiClient.auth.refresh(refreshToken);
        const newToken = result.access_token;
        apiClient.setAuthToken(newToken);
        setToken(newToken);
        localStorage.setItem(TOKEN_KEY, newToken);
        // Reschedule
        const rt2 = typeof localStorage !== 'undefined' ? localStorage.getItem(REFRESH_KEY) : null;
        if (rt2) {
          refreshTimerRef.current = setTimeout(async () => {
            await apiClient.auth.refresh(rt2);
          }, (result.expires_in - 60) * 1000);
        }
      } catch {
        logout();
      }
    }, ms);
    return () => { if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current); };
  }, [token]);

  const login = useCallback(async (phone: string, code: string): Promise<LoginResult> => {
    const result = await apiClient.auth.loginByCode(phone, code);
    const newToken = result.access_token;
    const refreshToken = result.refresh_token;

    apiClient.setAuthToken(newToken);
    setToken(newToken);
    setUser(result.user);

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(TOKEN_KEY, newToken);
      localStorage.setItem(REFRESH_KEY, refreshToken);
      localStorage.setItem(USER_KEY, JSON.stringify(result.user));
    }

    // Fetch balance after login
    try {
      const bal = await apiClient.wallet.getBalance();
      setBalance(bal);
    } catch { /* ignore */ }

    return result;
  }, []);

  const sendCode = useCallback(async (phone: string) => {
    return await apiClient.auth.sendCode(phone);
  }, []);

  const logout = useCallback(() => {
    apiClient.clearAuthToken();
    setToken(null);
    setUser(null);
    setBalance(null);
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(REFRESH_KEY);
      localStorage.removeItem(USER_KEY);
    }
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
  }, []);

  const refetchBalance = useCallback(async () => {
    if (!token) return;
    try {
      const bal = await apiClient.wallet.getBalance();
      setBalance(bal);
    } catch { /* ignore */ }
  }, [token]);

  const refetchProfile = useCallback(async () => {
    if (!token) return;
    try {
      const profile = await apiClient.user.getProfile();
      setUser((prev) => prev ? { ...prev, ...(profile as Partial<UserInfo>) } : null);
    } catch { /* ignore */ }
  }, [token]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoggedIn: !!token && !!user,
        balance,
        loading,
        login,
        sendCode,
        logout,
        refetchBalance,
        refetchProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
