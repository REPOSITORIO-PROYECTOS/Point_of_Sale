import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { getPortalSession, loginPortal, logoutPortal, type PortalLoginResponse, type PortalRole } from '@/lib/remote-api';

export type PortalSession = PortalLoginResponse;

type AuthContextValue = {
  session: PortalSession | null;
  isBootstrapping: boolean;
  isDeveloper: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const STORAGE_KEY = 'pos-remote-portal-session';

const AuthContext = createContext<AuthContextValue | null>(null);

function loadSession(): PortalSession | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as PortalSession;
  } catch {
    return null;
  }
}

function persistSession(session: PortalSession | null) {
  if (!session) {
    localStorage.removeItem(STORAGE_KEY);
    return;
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function isDeveloperRole(role?: PortalRole): boolean {
  return role === 'developer';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<PortalSession | null>(() => loadSession());
  const [isBootstrapping, setIsBootstrapping] = useState(() => Boolean(loadSession()?.sessionToken));

  useEffect(() => {
    const stored = loadSession();
    if (!stored?.sessionToken) {
      if (stored) {
        persistSession(null);
        setSession(null);
      }
      setIsBootstrapping(false);
      return;
    }

    void getPortalSession(stored.sessionToken)
      .then((validated) => {
        persistSession(validated);
        setSession(validated);
      })
      .catch(() => {
        persistSession(null);
        setSession(null);
      })
      .finally(() => setIsBootstrapping(false));
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      isBootstrapping,
      isDeveloper: isDeveloperRole(session?.role),
      login: async (email, password) => {
        const normalized = email.trim().toLowerCase();
        if (!normalized) {
          throw new Error('Ingresá tu email');
        }

        const payload = await loginPortal(normalized, password);
        persistSession(payload);
        setSession(payload);
      },
      logout: async () => {
        const token = session?.sessionToken ?? loadSession()?.sessionToken;
        if (token) {
          await logoutPortal(token).catch(() => {
            // relay puede estar offline; igual limpiamos local
          });
        }

        persistSession(null);
        setSession(null);
      },
    }),
    [session, isBootstrapping],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}
