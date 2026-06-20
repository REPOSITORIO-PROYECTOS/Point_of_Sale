import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  Banknote,
  Clock3,
  History,
  Package,
  Percent,
  RefreshCw,
  Receipt,
  Shield,
  Tag,
  Wifi,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import {
  enqueueDeferredPriceIncrease,
  listDeferredCommands,
  type DeferredPriceIncrease,
} from '@/lib/deferred-queue';
import {
  createPortalWebSocket,
  formatCurrency,
  formatDateTime,
  formatRelativeTime,
  getPendingRegisterCommands,
  getRegisterCashHistory,
  getRegisterCatalog,
  getRegisterSnapshot,
  increaseRegisterPricesByCategory,
  licenseLabel,
  listRegisters,
  type CashSessionHistoryItem,
  type QueuedCommand,
  type RegisterCatalog,
  type RegisterCashHistory,
  type RegisterSnapshot,
  type TenantRegister,
} from '@/lib/remote-api';
import { cn } from '@/lib/utils';

type DetailTab = 'resumen' | 'precios' | 'cierres';

function paymentSummary(session: CashSessionHistoryItem): string {
  const breakdown = session.salesByPaymentMethod;
  if (!breakdown) {
    return '—';
  }

  const parts: string[] = [];
  if (breakdown.cash > 0) parts.push(`Efectivo ${formatCurrency(breakdown.cash)}`);
  if (breakdown.card > 0) parts.push(`Tarjeta ${formatCurrency(breakdown.card)}`);
  if (breakdown.transfer > 0) parts.push(`Transf. ${formatCurrency(breakdown.transfer)}`);
  if (breakdown.qr > 0) parts.push(`QR ${formatCurrency(breakdown.qr)}`);
  return parts.length > 0 ? parts.join(' · ') : '—';
}

export function RegisterDetailPage() {
  const { clientNumber: routeClientNumber = '', registerId = '' } = useParams();
  const { session, isDeveloper } = useAuth();
  const clientNumber = routeClientNumber || session?.clientNumber || '';
  const backHref = isDeveloper ? '/' : '/';

  const [register, setRegister] = useState<TenantRegister | null>(null);
  const [snapshot, setSnapshot] = useState<RegisterSnapshot | null>(null);
  const [catalog, setCatalog] = useState<RegisterCatalog | null>(null);
  const [cashHistory, setCashHistory] = useState<RegisterCashHistory | null>(null);
  const [activeTab, setActiveTab] = useState<DetailTab>('resumen');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [increasePercent, setIncreasePercent] = useState('');
  const [priceMessage, setPriceMessage] = useState<string | null>(null);
  const [priceError, setPriceError] = useState<string | null>(null);
  const [applyingPrices, setApplyingPrices] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [relayPending, setRelayPending] = useState<QueuedCommand[]>([]);
  const [localPending, setLocalPending] = useState<DeferredPriceIncrease[]>([]);

  const filteredProducts = useMemo(() => {
    if (!catalog || !selectedCategory) {
      return catalog?.products ?? [];
    }

    return catalog.products.filter((product) =>
      product.categories.some(
        (category) => category.trim().toLowerCase() === selectedCategory.trim().toLowerCase(),
      ),
    );
  }, [catalog, selectedCategory]);

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

  const loadCatalog = useCallback(
    async (refresh = false) => {
      if (!session?.sessionToken || !clientNumber || !registerId) {
        return;
      }

      setCatalogLoading(true);
      setPriceError(null);

      try {
        const data = await getRegisterCatalog(session.sessionToken, clientNumber, registerId, refresh);
        setCatalog(data);
        setSelectedCategory((current) => current || data.categories[0]?.name || '');
      } catch (loadError) {
        setPriceError(loadError instanceof Error ? loadError.message : 'No se pudo cargar el catálogo');
      } finally {
        setCatalogLoading(false);
      }
    },
    [clientNumber, registerId, session?.sessionToken],
  );

  const loadPendingCommands = useCallback(async () => {
    setLocalPending(listDeferredCommands(registerId));

    if (!session?.sessionToken || !clientNumber || !registerId) {
      return;
    }

    try {
      const data = await getPendingRegisterCommands(session.sessionToken, clientNumber, registerId);
      setRelayPending(data.commands);
    } catch {
      setRelayPending([]);
    }
  }, [clientNumber, registerId, session?.sessionToken]);

  const loadCashHistory = useCallback(
    async (refresh = false) => {
      if (!session?.sessionToken || !clientNumber || !registerId) {
        return;
      }

      setHistoryLoading(true);
      setError(null);

      try {
        const data = await getRegisterCashHistory(session.sessionToken, clientNumber, registerId, refresh);
        setCashHistory(data);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'No se pudo cargar el historial');
      } finally {
        setHistoryLoading(false);
      }
    },
    [clientNumber, registerId, session?.sessionToken],
  );

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (activeTab === 'precios') {
      void loadCatalog();
      void loadPendingCommands();
    }

    if (activeTab === 'cierres') {
      void loadCashHistory();
    }
  }, [activeTab, loadCatalog, loadCashHistory, loadPendingCommands]);

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

      if (payload.type === 'data_update' && payload.registerId === registerId) {
        if (activeTab === 'precios') {
          void loadCatalog();
        }
        if (activeTab === 'cierres') {
          void loadCashHistory();
        }
      }
    });

    return () => socket.close();
  }, [clientNumber, registerId, activeTab, loadCatalog, loadCashHistory]);

  async function handleApplyPriceIncrease() {
    if (!session?.sessionToken || !selectedCategory || !increasePercent) {
      return;
    }

    const percent = Number.parseFloat(increasePercent);
    if (!Number.isFinite(percent) || percent <= 0) {
      setPriceError('Ingresá un porcentaje válido');
      return;
    }

    if (!navigator.onLine) {
      enqueueDeferredPriceIncrease({
        clientNumber,
        registerId,
        category: selectedCategory,
        percent,
      });
      setLocalPending(listDeferredCommands(registerId));
      setPriceMessage(
        `Sin internet: aumento de ${percent}% para "${selectedCategory}" guardado. Se enviará al reconectar.`,
      );
      setIncreasePercent('');
      return;
    }

    setApplyingPrices(true);
    setPriceError(null);
    setPriceMessage(null);

    try {
      const response = await increaseRegisterPricesByCategory(
        session.sessionToken,
        clientNumber,
        registerId,
        selectedCategory,
        percent,
      );

      if (response.catalog) {
        setCatalog(response.catalog);
      }

      if (response.deferred) {
        setPriceMessage(response.message);
        void loadPendingCommands();
      } else {
        setPriceMessage(response.message);
        void load();
      }

      setIncreasePercent('');
    } catch (applyError) {
      if (!navigator.onLine || !register?.online) {
        enqueueDeferredPriceIncrease({
          clientNumber,
          registerId,
          category: selectedCategory,
          percent,
        });
        setLocalPending(listDeferredCommands(registerId));
        setPriceMessage(
          `Comando guardado en cola. Se aplicará cuando haya conexión con la caja.`,
        );
        setPriceError(null);
      } else {
        setPriceError(applyError instanceof Error ? applyError.message : 'No se pudieron actualizar precios');
      }
    } finally {
      setApplyingPrices(false);
    }
  }

  const tabs: Array<{ id: DetailTab; label: string; icon: typeof Receipt }> = [
    { id: 'resumen', label: 'Resumen', icon: Receipt },
    { id: 'precios', label: 'Precios', icon: Tag },
    { id: 'cierres', label: 'Cierres', icon: History },
  ];

  return (
    <section>
      <Link to={backHref} className="mb-4 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200">
        <ArrowLeft className="h-4 w-4" />
        Volver al dashboard
      </Link>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">{register?.label ?? snapshot?.label ?? 'Caja'}</h2>
          <p className="text-sm text-slate-400">
            Cliente {clientNumber} · {register?.online ? 'Online' : 'Offline'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            void load();
            if (activeTab === 'precios') void loadCatalog(true);
            if (activeTab === 'cierres') void loadCashHistory(true);
          }}
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm hover:bg-white/5"
        >
          <RefreshCw className="h-4 w-4" />
          Refrescar
        </button>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm transition',
                activeTab === tab.id
                  ? 'bg-teal-500/20 text-teal-100 ring-1 ring-teal-500/30'
                  : 'border border-white/10 text-slate-300 hover:bg-white/5',
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {loading ? <p className="text-slate-400">Cargando detalle…</p> : null}
      {error ? <p className="mb-4 text-sm text-rose-300">{error}</p> : null}

      {activeTab === 'resumen' ? (
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
              Sesión de caja hoy
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
      ) : null}

      {activeTab === 'precios' ? (
        <div className="space-y-4">
          {!register?.online ? (
            <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
              La caja está offline. Podés encolar aumentos; se aplicarán al reconectar el POS. El sistema local sigue
              vendiendo con normalidad.
            </p>
          ) : null}

          {(relayPending.length > 0 || localPending.length > 0) ? (
            <article className="rounded-2xl border border-teal-500/20 bg-teal-500/5 p-4">
              <h3 className="mb-2 text-sm font-medium text-teal-100">Comandos pendientes (diferido)</h3>
              <ul className="space-y-2 text-sm text-slate-300">
                {relayPending.map((command) => {
                  const payload = command.payload as { category?: string; percent?: number };
                  return (
                    <li key={command.id} className="rounded-lg border border-white/5 px-3 py-2">
                      +{payload.percent ?? '?'}% · {payload.category ?? command.action} · esperando caja
                    </li>
                  );
                })}
                {localPending.map((command) => (
                  <li key={command.id} className="rounded-lg border border-white/5 px-3 py-2">
                    +{command.percent}% · {command.category} · esperando internet/relay
                  </li>
                ))}
              </ul>
            </article>
          ) : null}

          {catalog?.stale ? (
            <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
              Mostrando datos en caché{catalog.error ? `: ${catalog.error}` : ''}.
            </p>
          ) : null}

          {priceMessage ? (
            <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
              {priceMessage}
            </p>
          ) : null}

          {priceError ? <p className="text-sm text-rose-300">{priceError}</p> : null}

          <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
            <aside className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-medium">Categorías</h3>
                <button
                  type="button"
                  onClick={() => void loadCatalog(true)}
                  className="text-xs text-teal-300 hover:underline"
                >
                  Traer del POS
                </button>
              </div>

              {catalogLoading ? <p className="text-sm text-slate-400">Cargando…</p> : null}

              {!catalogLoading && (catalog?.categories.length ?? 0) === 0 ? (
                <p className="text-sm text-slate-400">Sin categorías todavía.</p>
              ) : null}

              <ul className="space-y-1">
                {catalog?.categories.map((category) => (
                  <li key={category.name}>
                    <button
                      type="button"
                      onClick={() => setSelectedCategory(category.name)}
                      className={cn(
                        'flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition',
                        selectedCategory === category.name
                          ? 'bg-teal-500/15 text-teal-100'
                          : 'hover:bg-white/5 text-slate-300',
                      )}
                    >
                      <span>{category.name}</span>
                      <span className="text-xs text-slate-500">{category.productCount}</span>
                    </button>
                  </li>
                ))}
              </ul>

              {catalog?.syncedAt ? (
                <p className="mt-3 text-xs text-slate-500">
                  Sync: {formatRelativeTime(catalog.syncedAt)}
                </p>
              ) : null}
            </aside>

            <div className="space-y-4">
              <article className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
                <div className="mb-4 flex items-center gap-2 text-teal-300">
                  <Percent className="h-4 w-4" />
                  Aumentar precios por categoría
                </div>

                <p className="mb-4 text-sm text-slate-400">
                  El cambio se envía a la caja abierta y actualiza el POS al instante.
                </p>

                <div className="grid gap-3 sm:grid-cols-[1fr_140px_auto]">
                  <div>
                    <label className="mb-1 block text-xs text-slate-400">Categoría</label>
                    <select
                      value={selectedCategory}
                      onChange={(event) => setSelectedCategory(event.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm"
                    >
                      {catalog?.categories.map((category) => (
                        <option key={category.name} value={category.name}>
                          {category.name} ({category.productCount})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs text-slate-400">Aumento %</label>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={increasePercent}
                      onChange={(event) => setIncreasePercent(event.target.value)}
                      placeholder="10"
                      className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm"
                    />
                  </div>

                  <div className="flex items-end">
                    <button
                      type="button"
                      disabled={applyingPrices || !selectedCategory}
                      onClick={() => void handleApplyPriceIncrease()}
                      className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {applyingPrices ? 'Aplicando…' : register?.online ? 'Aplicar en caja' : 'Encolar diferido'}
                    </button>
                  </div>
                </div>
              </article>

              <article className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
                <div className="mb-4 flex items-center gap-2 text-teal-300">
                  <Package className="h-4 w-4" />
                  Productos {selectedCategory ? `· ${selectedCategory}` : ''}
                </div>

                {catalogLoading ? <p className="text-sm text-slate-400">Cargando productos…</p> : null}

                {!catalogLoading && filteredProducts.length === 0 ? (
                  <p className="text-sm text-slate-400">No hay productos en esta categoría.</p>
                ) : null}

                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10 text-left text-slate-400">
                        <th className="px-3 py-2 font-medium">Producto</th>
                        <th className="px-3 py-2 font-medium">Precio</th>
                        <th className="px-3 py-2 font-medium">Stock</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProducts.map((product) => (
                        <tr key={product.id} className="border-b border-white/5">
                          <td className="px-3 py-2">{product.name}</td>
                          <td className="px-3 py-2">{formatCurrency(product.price)}</td>
                          <td className="px-3 py-2">{product.stock ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </article>
            </div>
          </div>
        </div>
      ) : null}

      {activeTab === 'cierres' ? (
        <div className="space-y-4">
          {!register?.online ? (
            <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
              La caja está offline. Conectá el POS para traer el historial actualizado.
            </p>
          ) : null}

          {cashHistory?.stale ? (
            <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
              Mostrando historial en caché{cashHistory.error ? `: ${cashHistory.error}` : ''}.
            </p>
          ) : null}

          {historyLoading ? <p className="text-slate-400">Cargando historial…</p> : null}

          {cashHistory?.currentSession ? (
            <article className="rounded-2xl border border-teal-500/20 bg-teal-500/5 p-5">
              <h3 className="mb-2 font-medium text-teal-100">Sesión actual (hoy)</h3>
              <div className="grid gap-2 text-sm text-slate-300 sm:grid-cols-2">
                <p>Apertura: {formatDateTime(cashHistory.currentSession.startTime)}</p>
                <p>Estado: {cashHistory.currentSession.isOpen ? 'Abierta' : 'Cerrada'}</p>
                <p>Saldo inicial: {formatCurrency(cashHistory.currentSession.initialBalance)}</p>
                <p>Ventas: {formatCurrency(cashHistory.currentSession.totalSales)}</p>
              </div>
            </article>
          ) : null}

          <article className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-medium">Cierres anteriores</h3>
              <button
                type="button"
                onClick={() => void loadCashHistory(true)}
                className="text-xs text-teal-300 hover:underline"
              >
                Traer del POS
              </button>
            </div>

            {!historyLoading && (cashHistory?.closedSessions.length ?? 0) === 0 ? (
              <p className="text-sm text-slate-400">Todavía no hay cierres registrados.</p>
            ) : null}

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-left text-slate-400">
                    <th className="px-3 py-2 font-medium">Apertura</th>
                    <th className="px-3 py-2 font-medium">Cierre</th>
                    <th className="px-3 py-2 font-medium">Ventas</th>
                    <th className="px-3 py-2 font-medium">Contado</th>
                    <th className="px-3 py-2 font-medium">Operaciones</th>
                    <th className="px-3 py-2 font-medium">Cerró</th>
                    <th className="px-3 py-2 font-medium">Pagos</th>
                  </tr>
                </thead>
                <tbody>
                  {cashHistory?.closedSessions.map((session) => (
                    <tr key={session.id} className="border-b border-white/5 align-top">
                      <td className="px-3 py-2">{formatDateTime(session.startTime)}</td>
                      <td className="px-3 py-2">{formatDateTime(session.endTime)}</td>
                      <td className="px-3 py-2">{formatCurrency(session.totalSales)}</td>
                      <td className="px-3 py-2">{formatCurrency(session.countedAmount ?? session.expectedBalance ?? 0)}</td>
                      <td className="px-3 py-2">{session.transactionsCount ?? '—'}</td>
                      <td className="px-3 py-2">
                        {session.closedByUsername
                          ? `${session.closedByUsername}${session.closedByRole ? ` (${session.closedByRole})` : ''}`
                          : '—'}
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-400">{paymentSummary(session)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {cashHistory?.syncedAt ? (
              <p className="mt-3 text-xs text-slate-500">
                Sync: {formatRelativeTime(cashHistory.syncedAt)}
              </p>
            ) : null}
          </article>
        </div>
      ) : null}
    </section>
  );
}
