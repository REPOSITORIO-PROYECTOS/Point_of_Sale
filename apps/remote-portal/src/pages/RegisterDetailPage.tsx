import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Banknote, Receipt, Wifi } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import {
  formatCurrency,
  formatRelativeTime,
  getRegisterSnapshot,
  listRegisters,
  type RegisterSnapshot,
  type TenantRegister,
} from '@/lib/remote-api';

export function RegisterDetailPage() {
  const { registerId = '' } = useParams();
  const { session } = useAuth();
  const [register, setRegister] = useState<TenantRegister | null>(null);
  const [snapshot, setSnapshot] = useState<RegisterSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session || !registerId) {
      return;
    }

    async function load() {
      try {
        const registers = await listRegisters(session.clientNumber);
        const current = registers.registers.find((item) => item.id === registerId) ?? null;
        setRegister(current);

        const summary = await getRegisterSnapshot(session.clientNumber, registerId);
        setSnapshot(summary);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'No se pudo cargar el detalle');
      }
    }

    void load();
  }, [session, registerId]);

  return (
    <section>
      <Link to="/" className="mb-4 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200">
        <ArrowLeft className="h-4 w-4" />
        Volver al panel
      </Link>

      <div className="mb-6">
        <h2 className="text-2xl font-semibold">{register?.label ?? 'Caja'}</h2>
        <p className="text-sm text-slate-400">Detalle remoto (MVP mock + snapshots del agente)</p>
      </div>

      {error ? <p className="mb-4 text-sm text-rose-300">{error}</p> : null}

      <div className="grid gap-4 md:grid-cols-3">
        <article className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
          <div className="mb-2 flex items-center gap-2 text-teal-300">
            <Receipt className="h-4 w-4" />
            Ventas hoy
          </div>
          <p className="text-2xl font-semibold">
            {snapshot ? formatCurrency(snapshot.salesToday, snapshot.currency) : '—'}
          </p>
          <p className="mt-1 text-sm text-slate-400">{snapshot?.ticketCount ?? 0} tickets</p>
        </article>

        <article className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
          <div className="mb-2 flex items-center gap-2 text-teal-300">
            <Banknote className="h-4 w-4" />
            Sesión de caja
          </div>
          <p className="text-2xl font-semibold">{snapshot?.cashSessionOpen ? 'Abierta' : 'Cerrada'}</p>
          <p className="mt-1 text-sm text-slate-400">Estado reportado por el agente</p>
        </article>

        <article className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
          <div className="mb-2 flex items-center gap-2 text-teal-300">
            <Wifi className="h-4 w-4" />
            Última sync
          </div>
          <p className="text-2xl font-semibold">{formatRelativeTime(snapshot?.lastSync ?? register?.lastSeen)}</p>
          <p className="mt-1 text-sm text-slate-400">{register?.online ? 'En línea' : 'Desconectada'}</p>
        </article>
      </div>
    </section>
  );
}
