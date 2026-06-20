import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronUp, MessageSquare, Plus } from 'lucide-react';
import { ClientCredentialsCard } from '@/components/ClientCredentialsCard';
import { useAuth } from '@/lib/auth-context';
import {
  formatDateTime,
  getClientsOverview,
  getDeveloperSentMessages,
  registerClient,
  sendDeveloperMessage,
  type ClientOverview,
  type TenantMessage,
} from '@/lib/remote-api';

export function ClientsPage() {
  const { session } = useAuth();
  const [clients, setClients] = useState<ClientOverview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [expandedClient, setExpandedClient] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createdClient, setCreatedClient] = useState<{
    businessName: string;
    clientNumber: string;
    email: string;
    password: string;
  } | null>(null);
  const [messageDrafts, setMessageDrafts] = useState<Record<string, string>>({});
  const [sentMessages, setSentMessages] = useState<Record<string, TenantMessage[]>>({});
  const [sendingTo, setSendingTo] = useState<string | null>(null);

  async function refreshClients() {
    if (!session?.sessionToken) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await getClientsOverview(session.sessionToken);
      setClients(data.clients);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'No se pudieron cargar los clientes');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refreshClients();
  }, [session?.sessionToken]);

  async function loadSentMessages(clientNumber: string) {
    if (!session?.sessionToken) {
      return;
    }

    const data = await getDeveloperSentMessages(session.sessionToken, clientNumber);
    setSentMessages((current) => ({ ...current, [clientNumber]: data.messages }));
  }

  async function handleExpand(clientNumber: string) {
    const next = expandedClient === clientNumber ? null : clientNumber;
    setExpandedClient(next);
    if (next) {
      await loadSentMessages(clientNumber);
    }
  }

  async function handleCreateClient(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setCreatedClient(null);
    setIsCreating(true);

    try {
      const result = await registerClient(name, email, password);
      setCreatedClient({
        businessName: result.tenant.name,
        clientNumber: result.clientNumber,
        email: result.email,
        password,
      });
      setName('');
      setEmail('');
      setPassword('');
      setShowCreateForm(false);
      await refreshClients();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'No se pudo crear el cliente');
    } finally {
      setIsCreating(false);
    }
  }

  async function handleSendMessage(clientNumber: string) {
    if (!session?.sessionToken) {
      return;
    }

    const body = messageDrafts[clientNumber]?.trim();
    if (!body) {
      return;
    }

    setSendingTo(clientNumber);
    setError(null);

    try {
      await sendDeveloperMessage(session.sessionToken, clientNumber, body);
      setMessageDrafts((current) => ({ ...current, [clientNumber]: '' }));
      await loadSentMessages(clientNumber);
      await refreshClients();
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : 'No se pudo enviar el mensaje');
    } finally {
      setSendingTo(null);
    }
  }

  return (
    <section className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Clientes</h2>
          <p className="text-sm text-slate-400">Alta, credenciales y mensajes a cada empresa</p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreateForm((current) => !current)}
          className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-medium hover:bg-teal-500"
        >
          <Plus className="h-4 w-4" />
          Nuevo cliente
        </button>
      </div>

      {error ? <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{error}</p> : null}

      {createdClient ? (
        <ClientCredentialsCard
          businessName={createdClient.businessName}
          clientNumber={createdClient.clientNumber}
          email={createdClient.email}
          password={createdClient.password}
        />
      ) : null}

      {showCreateForm ? (
        <form onSubmit={(event) => void handleCreateClient(event)} className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
          <h3 className="mb-4 font-medium">Crear cliente (email + contraseña + ID automático)</h3>
          <div className="grid gap-3 md:grid-cols-3">
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="rounded-xl border border-white/10 bg-slate-950 px-4 py-3"
              placeholder="Nombre del negocio"
              required
            />
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="rounded-xl border border-white/10 bg-slate-950 px-4 py-3"
              placeholder="Email de acceso"
              required
            />
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="rounded-xl border border-white/10 bg-slate-950 px-4 py-3"
              placeholder="Contraseña (min. 6)"
              minLength={6}
              required
            />
          </div>
          <button
            type="submit"
            disabled={isCreating}
            className="mt-4 rounded-xl bg-teal-600 px-4 py-3 font-medium hover:bg-teal-500 disabled:opacity-60"
          >
            {isCreating ? 'Creando…' : 'Crear cliente'}
          </button>
        </form>
      ) : null}

      <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
        <h3 className="mb-4 font-medium">Listado de clientes ({clients.length})</h3>
        {loading ? <p className="text-slate-400">Cargando…</p> : null}
        {!loading && clients.length === 0 ? (
          <p className="text-slate-400">Todavía no hay clientes registrados.</p>
        ) : null}

        <div className="space-y-3">
          {clients.map((client) => {
            const isExpanded = expandedClient === client.clientNumber;
            const history = sentMessages[client.clientNumber] ?? [];

            return (
              <div key={client.clientNumber} className="rounded-xl border border-white/5">
                <button
                  type="button"
                  onClick={() => void handleExpand(client.clientNumber)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-white/5"
                >
                  <div>
                    <p className="font-medium">{client.name}</p>
                    <p className="font-mono text-sm text-teal-300">{client.clientNumber}</p>
                    <p className="text-xs text-slate-500">{client.contactEmail}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {client.unreadMessages > 0 ? (
                      <span className="rounded-full bg-teal-600 px-2 py-0.5 text-xs">
                        {client.unreadMessages} sin leer
                      </span>
                    ) : null}
                    <span className="text-xs text-slate-400">{client.registers.length} caja(s)</span>
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                </button>

                {isExpanded ? (
                  <div className="border-t border-white/5 px-4 py-4 space-y-4">
                    <div>
                      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                        Vistas del portal
                      </p>
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

                    {client.registers.length > 0 ? (
                      <div className="space-y-2">
                        {client.registers.map((register) => (
                          <Link
                            key={register.id}
                            to={`/clients/${client.clientNumber}/registers/${register.id}`}
                            className="flex items-center justify-between rounded-lg border border-white/5 px-3 py-2 text-sm hover:border-teal-500/30"
                          >
                            <span>{register.label}</span>
                            <span className={register.online ? 'text-emerald-300' : 'text-rose-300'}>
                              {register.online ? 'Online' : 'Offline'}
                            </span>
                          </Link>
                        ))}
                      </div>
                    ) : null}

                    <div className="rounded-xl border border-white/10 bg-slate-950/50 p-4">
                      <p className="mb-2 inline-flex items-center gap-2 text-sm font-medium">
                        <MessageSquare className="h-4 w-4 text-teal-300" />
                        Enviar mensaje a la empresa
                      </p>
                      <textarea
                        value={messageDrafts[client.clientNumber] ?? ''}
                        onChange={(event) =>
                          setMessageDrafts((current) => ({
                            ...current,
                            [client.clientNumber]: event.target.value,
                          }))
                        }
                        className="mb-3 min-h-24 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm"
                        placeholder="Ej: Bienvenido, acá tenés el link del portal y podés cambiar tu contraseña en Mi cuenta…"
                      />
                      <button
                        type="button"
                        disabled={sendingTo === client.clientNumber}
                        onClick={() => void handleSendMessage(client.clientNumber)}
                        className="rounded-lg bg-teal-700 px-3 py-2 text-sm hover:bg-teal-600 disabled:opacity-60"
                      >
                        {sendingTo === client.clientNumber ? 'Enviando…' : 'Enviar mensaje'}
                      </button>

                      {history.length > 0 ? (
                        <div className="mt-4 space-y-2">
                          <p className="text-xs text-slate-500">Mensajes enviados</p>
                          {history.map((message) => (
                            <div key={message.id} className="rounded-lg border border-white/5 px-3 py-2 text-xs">
                              <p className="text-slate-400">{formatDateTime(message.createdAt)}</p>
                              <p className="whitespace-pre-wrap text-slate-300">{message.body}</p>
                              <p className="mt-1 text-slate-500">
                                {message.readAt ? 'Leído' : 'Pendiente de lectura'}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
