"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { AuthTokens, AuthUser } from "@/types/shared";
import { ApiError, apiRequest } from "./api";

// Access token lives only in memory (a ref, not localStorage) — the
// tradeoff PROGRESS.md documents: it dies on refresh, which is why the
// refresh token is the thing persisted, and every mount does one silent
// refresh to re-establish a session before anything protected renders.
const REFRESH_TOKEN_KEY = "schultask.refreshToken";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

type SignupInput = { orgName: string; name: string; email: string; password: string };

type AuthContextValue = {
  status: AuthStatus;
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (input: SignupInput) => Promise<void>;
  logout: () => Promise<void>;
  authFetch: <T>(path: string, options?: { method?: string; body?: unknown }) => Promise<T>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<AuthUser | null>(null);
  const accessTokenRef = useRef<string | null>(null);

  const applySession = useCallback(async (tokens: AuthTokens) => {
    accessTokenRef.current = tokens.accessToken;
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
    const me = await apiRequest<AuthUser>("/auth/me", { token: tokens.accessToken });
    setUser(me);
    setStatus("authenticated");
  }, []);

  const clearSession = useCallback(() => {
    accessTokenRef.current = null;
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    setUser(null);
    setStatus("unauthenticated");
  }, []);

  useEffect(() => {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (!refreshToken) {
      setStatus("unauthenticated");
      return;
    }
    apiRequest<AuthTokens>("/auth/refresh", { method: "POST", body: { refreshToken } })
      .then(applySession)
      .catch(() => clearSession());
    // Runs once on mount only — applySession/clearSession are stable refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const tokens = await apiRequest<AuthTokens>("/auth/login", {
        method: "POST",
        body: { email, password },
      });
      await applySession(tokens);
    },
    [applySession],
  );

  const signup = useCallback(
    async (input: SignupInput) => {
      const tokens = await apiRequest<AuthTokens>("/auth/signup", { method: "POST", body: input });
      await applySession(tokens);
    },
    [applySession],
  );

  const logout = useCallback(async () => {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (refreshToken) {
      await apiRequest("/auth/logout", { method: "POST", body: { refreshToken } }).catch(() => {});
    }
    clearSession();
  }, [clearSession]);

  // Attaches the current access token, and on a 401 does exactly one
  // silent-refresh-and-retry before giving up and clearing the session —
  // covers the access token expiring mid-session without forcing a
  // re-login on every page.
  const authFetch = useCallback(
    async <T,>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> => {
      try {
        return await apiRequest<T>(path, { ...options, token: accessTokenRef.current });
      } catch (err) {
        if (!(err instanceof ApiError) || err.status !== 401) throw err;

        const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
        if (!refreshToken) {
          clearSession();
          throw err;
        }
        try {
          const tokens = await apiRequest<AuthTokens>("/auth/refresh", {
            method: "POST",
            body: { refreshToken },
          });
          accessTokenRef.current = tokens.accessToken;
          localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
          return await apiRequest<T>(path, { ...options, token: tokens.accessToken });
        } catch {
          clearSession();
          throw err;
        }
      }
    },
    [clearSession],
  );

  return (
    <AuthContext.Provider value={{ status, user, login, signup, logout, authFetch }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
