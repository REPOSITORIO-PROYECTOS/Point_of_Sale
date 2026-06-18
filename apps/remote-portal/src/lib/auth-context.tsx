import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

type PortalSession = {
  clientNumber: string;
  portalUserId: string;
  devMode: boolean;
};

type AuthContextValue = {
  session: PortalSession | null;
  login: (clientNumber: string, password: string) => void;
  logout: () => void;
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<PortalSession | null>(() => loadSession());

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      login: (clientNumber, password) => {
        const normalized = clientNumber.trim().toUpperCase();
        const devMode = import.meta.env.DEV && (!password || password === 'dev');

        if (!normalized) {
          throw new Error('Ingresá el número de cliente');
        }

        if (!devMode && password.length < 4) {
          throw new Error('Contraseña inválida');
        }

        const nextSession: PortalSession = {
          clientNumber: normalized,
          portalUserId: `portal-${normalized.toLowerCase()}`,
          devMode,
        };

        localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSession));
        setSession(nextSession);
      },
      logout: () => {
        localStorage.removeItem(STORAGE_KEY);
        setSession(null);
      },
    }),
    [session],
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
