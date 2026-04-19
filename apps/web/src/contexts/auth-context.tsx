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
  loginByPassword: (phone: string, password: string) => Promise<LoginResult>;
  registerByPhone: (phone: string, code: string, password: string) => Promise<LoginResult>;
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
    console.log('[Auth] Page load - localStorage check:', {
      hasToken: !!savedToken,
      hasUser: !!savedUser,
      tokenPrefix: savedToken ? savedToken.substring(0, 20) + '...' : null,
    });
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

  // Monitor localStorage changes (detects when another tab or navigation clears auth)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = (e: StorageEvent) => {
      if (e.key === TOKEN_KEY && e.newValue === null) {
        console.warn('[Auth] ⚠️ localStorage auth_token was CLEARED. oldValue:', e.oldValue?.substring(0, 20));
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
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
    // Refresh 60 seconds before expiry (actual expires_in from login/refresh response)
    const expiresIn = parseInt(typeof localStorage !== 'undefined' ? (localStorage.getItem('token_expires_in') ?? '2592000') : '2592000', 10);
    const ms = (expiresIn - 60) * 1000;
    refreshTimerRef.current = setTimeout(async () => {
      try {
        const refreshToken = typeof localStorage !== 'undefined' ? localStorage.getItem(REFRESH_KEY) : null;
        if (!refreshToken) { logout(); return; }
        const result = await apiClient.auth.refresh(refreshToken);
        const newToken = result.access_token;
        const newRefreshToken = result.refresh_token.token;
        apiClient.setAuthToken(newToken);
        setToken(newToken);
        localStorage.setItem(TOKEN_KEY, newToken);
        localStorage.setItem(REFRESH_KEY, newRefreshToken);
        localStorage.setItem('token_expires_in', String(result.expires_in));
        // Reschedule
        const rt2 = localStorage.getItem(REFRESH_KEY);
        if (rt2) {
          refreshTimerRef.current = setTimeout(async () => {
            const rt = localStorage.getItem(REFRESH_KEY);
            if (rt) await apiClient.auth.refresh(rt);
          }, (result.expires_in - 60) * 1000);
        }
      } catch {
        logout();
      }
    }, ms);
    return () => { if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current); };
  }, [token]);

  const _setSession = useCallback((result: LoginResult) => {
    console.log('[Auth] ★ _setSession CALLED with result.ok =', result.ok, 'access_token exists:', !!result.access_token);

    if (!result.ok || !result.access_token) {
      console.error('[Auth] _setSession called with invalid result:', result);
      return;
    }

    const newToken = result.access_token;
    const refreshToken = typeof result.refresh_token === 'string'
      ? result.refresh_token
      : (result.refresh_token as { token: string; jti: string }).token;

    apiClient.setAuthToken(newToken);
    setToken(newToken);
    setUser(result.user);

    if (typeof localStorage !== 'undefined') {
      try {
        console.log('[Auth] Attempting localStorage write:', { TOKEN_KEY, REFRESH_KEY, USER_KEY });
        localStorage.setItem(TOKEN_KEY, newToken);
        console.log('[Auth] ✓ auth_token stored');
        localStorage.setItem(REFRESH_KEY, refreshToken);
        console.log('[Auth] ✓ refresh_token stored');
        localStorage.setItem(USER_KEY, JSON.stringify(result.user));
        console.log('[Auth] ✓ auth_user stored');
        localStorage.setItem('token_expires_in', String(result.expires_in ?? 7200));
        console.log('[Auth] ✓ token_expires_in stored');
      } catch (err) {
        console.error('[Auth] localStorage write failed:', err);
      }
    }

    // Fetch balance after login
    try {
      const bal = apiClient.wallet.getBalance();
      bal.then((data) => setBalance(data)).catch(() => {/* ignore */});
    } catch { /* ignore */ }

    // Protect logout for 2s (React StrictMode safety net)
    _skipNextLogout();

    // Force reload to ensure React re-renders with fresh auth state
    if (typeof window !== 'undefined') {
      setTimeout(() => { window.location.reload(); }, 500);
    }
  }, [_skipNextLogout]);

  const login = useCallback(async (phone: string, code: string): Promise<LoginResult> => {
    const result = await apiClient.auth.loginByCode(phone, code);
    _setSession(result);
    return result;
  }, [_setSession]);

  const loginByPassword = useCallback(async (phone: string, password: string): Promise<LoginResult> => {
    console.log('[Auth] loginByPassword called for', phone);
    const result = await apiClient.auth.loginByPassword(phone, password);
    console.log('[Auth] loginByPassword API result ok =', result.ok);
    _setSession(result as LoginResult);
    return result as LoginResult;
  }, [_setSession]);

  const registerByPhone = useCallback(async (phone: string, code: string, password: string): Promise<LoginResult> => {
    await apiClient.auth.registerByPhone(phone, code, password);
    // After registration, auto-login via password
    const loginResult = await apiClient.auth.loginByPassword(phone, password);
    _setSession(loginResult);
    return loginResult;
  }, [_setSession]);

  const sendCode = useCallback(async (phone: string) => {
    await apiClient.auth.sendCode(phone);
  }, []);

  const logout = useCallback((reason = '') => {
    // Skip if called within 2s after login (React StrictMode protection)
    if (Date.now() < skipLogoutUntil.current) {
      console.warn('[Auth] logout SKIPPED (within 2s protection window) reason:', reason);
      return;
    }
    console.warn('[Auth] ★★★ logout() CALLED reason:', reason, '★★★');
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

  // Ref to skip logout for 2s after login (React StrictMode safety)
  const skipLogoutUntil = useRef<number>(0);
  const skipNextLogout = () => { skipLogoutUntil.current = Date.now() + 2000; };

  // Skip logout if it fires within 2s after a login (React StrictMode safety)
  const skipLogoutTimer = useRef<NodeJS.Timeout | null>(null);
  const _skipNextLogout = () => {
    if (skipLogoutTimer.current) clearTimeout(skipLogoutTimer.current);
    skipLogoutTimer.current = setTimeout(() => { skipLogoutTimer.current = null; }, 2000);
  };
  const _shouldSkipLogout = () => skipLogoutTimer.current !== null;

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
        loginByPassword,
        registerByPhone,
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
