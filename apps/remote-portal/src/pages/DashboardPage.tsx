import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Banknote, Bell, Circle, Eye, Receipt, RefreshCw, Shield } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import {
  createPortalWebSocket,
  formatCurrency,
  formatRelativeTime,
  getClientsOverview,
  getTenantMessages,
  listRegisters,
  type ClientOverview,
  type RegisterSnapshot,
  type TenantRegister,
} from '@/lib/remote-api';
import { cn } from '@/lib/utils';

function DeveloperDashboard() {
  const { session } = useAuth();
  const [clients, setClients] = useState<ClientOverview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadOverview() {
    if (!session?.sessionToken) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await getClientsOverview(session.sessionToken);
      setClients(data.clients);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'No se pudo cargar el panel');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadOverview();
  }, [session?.sessionToken]);

  const totalRegisters = clients.reduce((sum, client) => sum + client.registers.length, 0);
  const onlineRegisters = clients.reduce(
    (sum, client) => sum + client.registers.filter((register) => register.online).length,
    0,
  );

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-semibold">
            <Shield className="h-6 w-6 text-teal-400" />
            Panel desarrollador
          </h2>
          <p className="text-sm text-slate-400">Vista global de todos los clientes y cajas</p>
        </div>
        <button
          type="button"
          onClick={() => void loadOverview()}
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm hover:bg-white/5"
        >
          <RefreshCw className="h-4 w-4" />
          Actualizar
        </button>
      </div>

      {clients.length > 0 ? (
        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3">
            <p className="text-xs text-slate-400">Clientes</p>
            <p className="text-2xl font-semibold">{clients.length}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3">
            <p className="text-xs text-slate-400">Cajas totales</p>
            <p className="text-2xl font-semibold">{totalRegisters}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3">
            <p className="text-xs text-slate-400">Cajas online</p>
            <p className="text-2xl font-semibold">{onlineRegisters}</p>
          </div>
        </div>
      ) : null}

      {loading ? <p className="text-slate-400">Cargando clientes…</p> : null}
      {error ? <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{error}</p> : null}

      <div className="space-y-4">
        {clients.map((client) => (
          <div key={client.clientNumber} className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-medium">{client.name}</h3>
                <p className="font-mono text-sm text-teal-300">{client.clientNumber}</p>
                <p className="text-xs text-slate-500">{client.contactEmail}</p>
              </div>
              <Link
                to="/clients"
                className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 text-xs hover:bg-white/5"
              >
                <Eye className="h-3.5 w-3.5" />
                Gestionar
              </Link>
            </div>

            <div className="mb-3">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Vistas disponibles</p>
              <div className="flex flex-wrap gap-2">
                {client.availableViews.map((view) => (
                  <span
                    key={view}
                    className="rounded-full border border-teal-500/20 bg-teal-500/10 px-2.5 py-1 text-xs text-teal-200"
                  >
                    {view}
                  </span>
                ))}
              </div>
            </div>

            {client.registers.length === 0 ? (
              <p className="text-sm text-slate-500">Sin cajas emparejadas todavía.</p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {client.registers.map((register) => (
                  <Link
                    key={register.id}
                    to={`/clients/${client.clientNumber}/registers/${register.id}`}
                    className="rounded-xl border border-white/5 p-3 transition hover:border-teal-500/30"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span className="font-medium">{register.label}</span>
                      <span
                        className={cn(
                          'text-xs',
                          register.online ? 'text-emerald-300' : 'text-rose-300',
                        )}
                      >
                        {register.online ? 'Online' : 'Offline'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Ventas: {register.snapshot ? formatCurrency(register.snapshot.salesToday.total) : '—'}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

function ClientDashboard() {
  const { session } = useAuth();
  const [registers, setRegisters] = useState<TenantRegister[]>([]);
  const [tenantName, setTenantName] = useState('');
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadRegisters() {
    if (!session?.clientNumber) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await listRegisters(session.clientNumber);
      setTenantName(data.name);
      setRegisters(data.registers);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'No se pudieron cargar las cajas');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadRegisters();
    if (session?.sessionToken) {
      void getTenantMessages(session.sessionToken)
        .then((data) => setUnreadMessages(data.messages.filter((message) => !message.readAt).length))
        .catch(() => setUnreadMessages(0));
    }
  }, [session?.clientNumber, session?.sessionToken]);

  useEffect(() => {
    if (!session?.clientNumber) {
      return;
    }

    const socket = createPortalWebSocket(session.clientNumber, (message) => {
      const payload = message as {
        type?: string;
        registers?: TenantRegister[];
        register?: TenantRegister;
        snapshot?: RegisterSnapshot;
      };

      if (payload.type === 'registers' && payload.registers) {
        setRegisters(payload.registers.map((register) => ({ ...register, paired: register.paired ?? true })));
      }

      if (payload.type === 'register_update' && payload.register) {
        setRegisters((current) =>
          current.map((register) =>
            register.id === payload.register?.id
              ? { ...register, ...payload.register, paired: register.paired }
              : register,
          ),
        );
      }

      if (payload.type === 'snapshot_update' && payload.snapshot) {
        setRegisters((current) =>
          current.map((register) =>
            register.id === payload.snapshot?.registerId
              ? {
                  ...register,
                  online: payload.snapshot?.online ?? register.online,
                  lastSeen: payload.snapshot?.lastHeartbeatAt ?? register.lastSeen,
                  snapshot: {
                    salesToday: payload.snapshot.salesToday,
                    cashSession: payload.snapshot.cashSession,
                    stockAlerts: payload.snapshot.stockAlerts,
                    licenseStatus: payload.snapshot.licenseStatus,
                    lastSyncAt: payload.snapshot.lastSyncAt,
                  },
                }
              : register,
          ),
        );
      }
    });

    return () => socket.close();
  }, [session?.clientNumber]);

  const onlineCount = registers.filter((r) => r.online).length;
  const totalSales = registers.reduce((sum, r) => sum + (r.snapshot?.salesToday.total ?? 0), 0);
  const openCash = registers.filter((r) => r.snapshot?.cashSession.open).length;

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Dashboard</h2>
          <p className="text-sm text-slate-400">
            {session?.email} · {session?.clientNumber} {tenantName ? `· ${tenantName}` : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadRegisters()}
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm hover:bg-white/5"
        >
          <RefreshCw className="h-4 w-4" />
          Actualizar
        </button>
      </div>

      {unreadMessages > 0 ? (
        <Link
          to="/account"
          className="mb-6 flex items-center gap-2 rounded-xl border border-teal-500/30 bg-teal-500/10 px-4 py-3 text-sm text-teal-100 hover:bg-teal-500/15"
        >
          <Bell className="h-4 w-4" />
          Tenés {unreadMessages} mensaje(s) del equipo — ver en Mi cuenta
        </Link>
      ) : null}

      {registers.length > 0 ? (
        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3">
            <p className="text-xs text-slate-400">Cajas online</p>
            <p className="text-2xl font-semibold">
              {onlineCount}/{registers.length}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3">
            <p className="text-xs text-slate-400">Ventas hoy (total)</p>
            <p className="text-2xl font-semibold">{formatCurrency(totalSales)}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3">
            <p className="text-xs text-slate-400">Cajas abiertas</p>
            <p className="text-2xl font-semibold">{openCash}</p>
          </div>
        </div>
      ) : null}

      {loading ? <p className="text-slate-400">Cargando cajas…</p> : null}
      {error ? <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{error}</p> : null}

      {!loading && registers.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-slate-400">
          <p>No hay cajas registradas todavía.</p>
          <p className="mt-2 text-sm">
            Andá a <Link to="/pairing" className="text-teal-300 underline">Emparejar</Link> para conectar el POS.
          </p>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        {registers.map((register) => (
          <Link
            key={register.id}
            to={`/registers/${register.id}`}
            className="rounded-2xl border border-white/10 bg-slate-900/70 p-5 transition hover:border-teal-500/30"
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-medium">{register.label}</h3>
              <span
                className={cn(
                  'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium',
                  register.online ? 'bg-emerald-500/15 text-emerald-300' : 'bg-rose-500/15 text-rose-300',
                )}
              >
                <Circle className={cn('h-2 w-2 fill-current', register.online ? 'text-emerald-400' : 'text-rose-400')} />
                {register.online ? 'Online' : 'Offline'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl border border-white/5 px-3 py-2">
                <p className="mb-1 inline-flex items-center gap-1 text-slate-400">
                  <Receipt className="h-3.5 w-3.5" />
                  Ventas hoy
                </p>
                <p className="font-medium">
                  {register.snapshot ? formatCurrency(register.snapshot.salesToday.total) : '—'}
                </p>
              </div>
              <div className="rounded-xl border border-white/5 px-3 py-2">
                <p className="mb-1 inline-flex items-center gap-1 text-slate-400">
                  <Banknote className="h-3.5 w-3.5" />
                  Caja
                </p>
                <p className="font-medium">
                  {register.snapshot?.cashSession.open ? 'Abierta' : 'Cerrada'}
                </p>
                <p className="text-xs text-slate-500">
                  Sync {formatRelativeTime(register.snapshot?.lastSyncAt ?? register.lastSeen)}
                </p>
              </div>
            </div>

            <p className="mt-3 text-xs text-teal-300">Ver precios, cierres y resumen →</p>
          </Link>
        ))}
      </div>
    </>
  );
}

export function DashboardPage() {
  const { isDeveloper } = useAuth();

  return (
    <section>
      {isDeveloper ? <DeveloperDashboard /> : <ClientDashboard />}
    </section>
  );
}
