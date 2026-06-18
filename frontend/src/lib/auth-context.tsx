import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { PosAPI, type AuthUser } from "./pos-api";

const AUTH_TOKEN_KEY = "pos.auth.token";
const AUTH_USER_KEY = "pos.auth.user";

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  needsSetup: boolean;
  login: (username: string, password: string) => Promise<void>;
  setupAdmin: (username: string, password: string, confirmPassword: string) => Promise<void>;
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

function persistSession(accessToken: string, authUser: AuthUser) {
  localStorage.setItem(AUTH_TOKEN_KEY, accessToken);
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(authUser));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(AUTH_TOKEN_KEY));
  const [user, setUser] = useState<AuthUser | null>(() => readStoredUser());
  const [needsSetup, setNeedsSetup] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const result = await PosAPI.login(username, password);
    persistSession(result.accessToken, result.user);
    setToken(result.accessToken);
    setUser(result.user);
    setNeedsSetup(false);
  }, []);

  const setupAdmin = useCallback(async (username: string, password: string, confirmPassword: string) => {
    const result = await PosAPI.setupAdmin({ username, password, confirmPassword });
    persistSession(result.accessToken, result.user);
    setToken(result.accessToken);
    setUser(result.user);
    setNeedsSetup(false);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        const status = await PosAPI.getSetupStatus();
        if (cancelled) return;

        if (status.needsSetup) {
          logout();
          setNeedsSetup(true);
          setIsLoading(false);
          return;
        }

        setNeedsSetup(false);

        if (!token) {
          setIsLoading(false);
          return;
        }

        const profile = await PosAPI.getMe();
        if (cancelled) return;
        setUser(profile);
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(profile));
      } catch {
        if (cancelled) return;
        logout();
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [token, logout]);

  const value = useMemo(
    () => ({
      user,
      token,
      isLoading,
      needsSetup,
      login,
      setupAdmin,
      logout,
      isAdmin: user?.role === "admin",
    }),
    [user, token, isLoading, needsSetup, login, setupAdmin, logout],
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
