import { Link, Outlet } from 'react-router-dom';
import { LogOut, Radio } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

export function AppShell() {
  const { session, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <header className="border-b border-white/10 bg-slate-950/70 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="POS Remoto" className="h-10 w-10 rounded-xl" />
            <div>
              <p className="text-sm font-semibold text-teal-300">POS Remoto</p>
              <p className="text-xs text-slate-400">{session?.clientNumber}</p>
            </div>
          </div>

          <nav className="flex items-center gap-3 text-sm">
            <Link to="/" className="rounded-lg px-3 py-2 hover:bg-white/5">
              Cajas
            </Link>
            <Link to="/assign" className="rounded-lg px-3 py-2 hover:bg-white/5">
              Asignar
            </Link>
            <Link to="/pairing" className="inline-flex items-center gap-1 rounded-lg px-3 py-2 hover:bg-white/5">
              <Radio className="h-4 w-4" />
              Emparejar
            </Link>
            <button
              type="button"
              onClick={logout}
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
