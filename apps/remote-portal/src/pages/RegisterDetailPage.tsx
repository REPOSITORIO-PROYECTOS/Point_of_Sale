import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  Banknote,
  Clock3,
  RefreshCw,
  Receipt,
  Shield,
  Wifi,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import {
  createPortalWebSocket,
  formatCurrency,
  formatDateTime,
  formatRelativeTime,
  getRegisterSnapshot,
  licenseLabel,
  listRegisters,
  type RegisterSnapshot,
  type TenantRegister,
} from '@/lib/remote-api';
import { cn } from '@/lib/utils';

export function RegisterDetailPage() {
  const { clientNumber: routeClientNumber = '', registerId = '' } = useParams();
  const { session } = useAuth();
  const clientNumber = routeClientNumber || session?.clientNumber || '';
  const [register, setRegister] = useState<TenantRegister | null>(null);
  const [snapshot, setSnapshot] = useState<RegisterSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!clientNumber || !registerId) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const registers = await listRegisters(clientNumber);
      const current = registers.registers.find((item) => item.id === registerId) ?? null;
      setRegister(current);

      const summary = await getRegisterSnapshot(clientNumber, registerId);
      setSnapshot(summary);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'No se pudo cargar el detalle');
    } finally {
      setLoading(false);
    }
  }, [clientNumber, registerId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!clientNumber) {
      return;
    }

    const socket = createPortalWebSocket(clientNumber, (message) => {
      const payload = message as {
        type?: string;
        register?: TenantRegister;
        snapshot?: RegisterSnapshot;
      };

      if (payload.type === 'register_update' && payload.register?.id === registerId) {
        setRegister((current) => (current ? { ...current, ...payload.register } : payload.register ?? null));
      }

      if (payload.type === 'snapshot_update' && payload.snapshot?.registerId === registerId) {
        setSnapshot(payload.snapshot);
        setRegister((current) =>
          current
            ? {
                ...current,
                online: payload.snapshot?.online ?? current.online,
                lastSeen: payload.snapshot?.lastHeartbeatAt ?? current.lastSeen,
              }
            : current,
        );
      }
    });

    return () => socket.close();
  }, [clientNumber, registerId]);

  return (
    <section>
      <Link to="/" className="mb-4 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200">
        <ArrowLeft className="h-4 w-4" />
        Volver al dashboard
      </Link>

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">{register?.label ?? snapshot?.label ?? 'Caja'}</h2>
          <p className="text-sm text-slate-400">
            Cliente {clientNumber} · {register?.online ? '🟢 Online' : '🔴 Offline'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm hover:bg-white/5"
        >
          <RefreshCw className="h-4 w-4" />
          Refrescar
        </button>
      </div>

      {loading ? <p className="text-slate-400">Cargando detalle…</p> : null}
      {error ? <p className="mb-4 text-sm text-rose-300">{error}</p> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <article className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
          <div className="mb-2 flex items-center gap-2 text-teal-300">
            <Wifi className="h-4 w-4" />
            Conexión
          </div>
          <p className="text-xl font-semibold">{register?.online ? 'En línea' : 'Desconectada'}</p>
          <p className="mt-1 text-sm text-slate-400">
            Última sync: {formatRelativeTime(snapshot?.lastSyncAt ?? register?.lastSeen)}
          </p>
          <p className="text-xs text-slate-500">
            Heartbeat: {formatDateTime(snapshot?.lastHeartbeatAt ?? register?.lastSeen)}
          </p>
        </article>

        <article className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
          <div className="mb-2 flex items-center gap-2 text-teal-300">
            <Banknote className="h-4 w-4" />
            Sesión de caja
          </div>
          <p className="text-xl font-semibold">{snapshot?.cashSession.open ? 'Abierta' : 'Cerrada'}</p>
          {snapshot?.cashSession.open ? (
            <div className="mt-2 space-y-1 text-sm text-slate-400">
              <p>Apertura: {formatDateTime(snapshot.cashSession.openedAt)}</p>
              <p>Saldo inicial: {formatCurrency(snapshot.cashSession.openingBalance ?? 0)}</p>
              <p>Ventas sesión: {formatCurrency(snapshot.cashSession.salesTotal ?? 0)}</p>
              <p>Saldo esperado: {formatCurrency(snapshot.cashSession.expectedBalance ?? 0)}</p>
            </div>
          ) : (
            <p className="mt-1 text-sm text-slate-400">Sin sesión activa</p>
          )}
        </article>

        <article className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
          <div className="mb-2 flex items-center gap-2 text-teal-300">
            <Receipt className="h-4 w-4" />
            Ventas del día
          </div>
          <p className="text-xl font-semibold">
            {snapshot ? formatCurrency(snapshot.salesToday.total, snapshot.currency) : '—'}
          </p>
          <p className="mt-1 text-sm text-slate-400">{snapshot?.salesToday.count ?? 0} ventas</p>
        </article>

        <article className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
          <div className="mb-2 flex items-center gap-2 text-teal-300">
            <AlertTriangle className="h-4 w-4" />
            Alertas de stock
          </div>
          <p
            className={cn(
              'text-xl font-semibold',
              (snapshot?.stockAlerts ?? 0) > 0 ? 'text-amber-300' : 'text-slate-100',
            )}
          >
            {snapshot?.stockAlerts ?? 0}
          </p>
          <p className="mt-1 text-sm text-slate-400">Productos bajo mínimo</p>
        </article>

        <article className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
          <div className="mb-2 flex items-center gap-2 text-teal-300">
            <Shield className="h-4 w-4" />
            Licencia
          </div>
          <p className="text-xl font-semibold">{licenseLabel(snapshot?.licenseStatus)}</p>
          <p className="mt-1 text-sm text-slate-400">Agente v{snapshot?.agentVersion ?? '—'}</p>
        </article>

        <article className="rounded-2xl border border-white/10 bg-slate-900/70 p-5 md:col-span-2 xl:col-span-1">
          <div className="mb-2 flex items-center gap-2 text-teal-300">
            <Clock3 className="h-4 w-4" />
            Historial de heartbeats
          </div>
          {snapshot?.heartbeatHistory && snapshot.heartbeatHistory.length > 0 ? (
            <ul className="space-y-1 text-sm text-slate-300">
              {snapshot.heartbeatHistory.map((timestamp) => (
                <li key={timestamp} className="rounded-lg border border-white/5 px-3 py-2">
                  {formatDateTime(timestamp)}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-400">Sin heartbeats registrados todavía.</p>
          )}
        </article>
      </div>
    </section>
  );
}
