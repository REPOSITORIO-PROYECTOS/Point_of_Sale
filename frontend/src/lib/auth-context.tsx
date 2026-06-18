import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { PosAPI, type AuthUser } from "../../lib/pos-api";

const AUTH_TOKEN_KEY = "pos.auth.token";
const AUTH_USER_KEY = "pos.auth.user";

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isAdmin: boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredUser(): AuthUser | null {
  const raw = localStorage.getItem(AUTH_USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(AUTH_TOKEN_KEY));
  const [user, setUser] = useState<AuthUser | null>(() => readStoredUser());
  const [isLoading, setIsLoading] = useState(Boolean(token));

  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const result = await PosAPI.login(username, password);
    localStorage.setItem(AUTH_TOKEN_KEY, result.accessToken);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(result.user));
    setToken(result.accessToken);
    setUser(result.user);
  }, []);

  useEffect(() => {
    if (!token) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    PosAPI.getMe()
      .then((profile) => {
        if (cancelled) return;
        setUser(profile);
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(profile));
      })
      .catch(() => {
        if (cancelled) return;
        logout();
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token, logout]);

  const value = useMemo(
    () => ({
      user,
      token,
      isLoading,
      login,
      logout,
      isAdmin: user?.role === "admin",
    }),
    [user, token, isLoading, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe usarse dentro de AuthProvider");
  }
  return context;
}
