import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { AuthContext, type AuthContextValue } from "./auth-context";
import { PosAPI, type AuthUser, type UpdateProfilePayload } from "./pos-api";
import { getPermissionsForRole } from "./user-roles";

const AUTH_TOKEN_KEY = "pos.auth.token";
const AUTH_USER_KEY = "pos.auth.user";

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

function isApiConnectivityError(error: unknown): boolean {
  if (error instanceof TypeError) return true;
  if (error instanceof Error) {
    return (
      error.message === "Failed to fetch" ||
      /Request failed \(5\d\d\)/.test(error.message)
    );
  }
  return false;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(AUTH_TOKEN_KEY));
  const [user, setUser] = useState<AuthUser | null>(() => readStoredUser());
  const [needsSetup, setNeedsSetup] = useState(false);
  const [apiUnavailable, setApiUnavailable] = useState(false);
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
    setApiUnavailable(false);
  }, []);

  const setupAdmin = useCallback(async (username: string, password: string, confirmPassword: string) => {
    const result = await PosAPI.setupAdmin({ username, password, confirmPassword });
    persistSession(result.accessToken, result.user);
    setToken(result.accessToken);
    setUser(result.user);
    setNeedsSetup(false);
    setApiUnavailable(false);
  }, []);

  const updateProfile = useCallback(async (payload: UpdateProfilePayload) => {
    const result = await PosAPI.updateProfile(payload);
    persistSession(result.accessToken, result.user);
    setToken(result.accessToken);
    setUser(result.user);
  }, []);

  useEffect(() => {
    function onAuthExpired() {
      logout();
      toast.error("Sesión expirada", {
        description: "Volvé a iniciar sesión para importar o editar productos.",
        duration: 8000,
      });
    }

    window.addEventListener("pos:auth-expired", onAuthExpired);
    return () => window.removeEventListener("pos:auth-expired", onAuthExpired);
  }, [logout]);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        const status = await PosAPI.getSetupStatus();
        if (cancelled) return;

        setApiUnavailable(false);

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
      } catch (error) {
        if (cancelled) return;
        if (isApiConnectivityError(error)) {
          setApiUnavailable(true);
        } else {
          logout();
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [token, logout]);

  const value = useMemo<AuthContextValue>(() => {
    const permissions = getPermissionsForRole(user?.role ?? "");

    return {
      user,
      token,
      isLoading,
      needsSetup,
      apiUnavailable,
      login,
      setupAdmin,
      updateProfile,
      logout,
      isAdmin: user?.role === "admin",
      permissions,
      canViewAudit: permissions.canViewAudit,
      canEditProducts: permissions.canEditProducts,
    };
  }, [user, token, isLoading, needsSetup, apiUnavailable, login, setupAdmin, updateProfile, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
