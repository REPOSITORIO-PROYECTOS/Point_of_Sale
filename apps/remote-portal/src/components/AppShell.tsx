import { Link, Outlet } from 'react-router-dom';
import { LogOut, Radio, Shield, User, Users } from 'lucide-react';
import { ConnectionStatusBadge } from '@/components/ConnectionStatusBadge';
import { useAuth } from '@/lib/auth-context';
import { useDeferredSync } from '@/lib/use-deferred-sync';

export function AppShell() {
  const { session, logout, isDeveloper } = useAuth();
  useDeferredSync();

  return (
    <div className="min-h-screen bg-linear-to-b from-slate-950 via-slate-900 to-slate-950">
      <header className="border-b border-white/10 bg-slate-950/70 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="POS Remoto" className="h-10 w-10 rounded-xl" />
            <div>
              <p className="text-sm font-semibold text-teal-300">POS Remoto</p>
              <p className="text-xs text-slate-400">
                {isDeveloper ? (
                  <>
                    <Shield className="mr-1 inline h-3 w-3" />
                    Desarrollador · {session?.email}
                  </>
                ) : (
                  <>
                    {session?.tenantName} · <span className="font-mono">{session?.clientNumber}</span>
                  </>
                )}
              </p>
            </div>
          </div>

          <nav className="flex items-center gap-3 text-sm">
            <ConnectionStatusBadge />
            <Link to="/" className="rounded-lg px-3 py-2 hover:bg-white/5">
              Dashboard
            </Link>
            {isDeveloper ? (
              <Link to="/clients" className="inline-flex items-center gap-1 rounded-lg px-3 py-2 hover:bg-white/5">
                <Users className="h-4 w-4" />
                Clientes
              </Link>
            ) : (
              <>
                <Link to="/pairing" className="inline-flex items-center gap-1 rounded-lg px-3 py-2 hover:bg-white/5">
                  <Radio className="h-4 w-4" />
                  Emparejar
                </Link>
                <Link to="/account" className="inline-flex items-center gap-1 rounded-lg px-3 py-2 hover:bg-white/5">
                  <User className="h-4 w-4" />
                  Mi cuenta
                </Link>
              </>
            )}
            <button
              type="button"
              onClick={() => void logout()}
              className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-slate-300 hover:bg-white/5"
            >
              <LogOut className="h-4 w-4" />
              Salir
            </button>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
