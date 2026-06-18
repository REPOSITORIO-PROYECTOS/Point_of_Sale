import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, UserPlus } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import {
  createRegister,
  createTenant,
  listTenants,
  type Tenant,
} from '@/lib/remote-api';

export function ClientsPage() {
  const { session, login } = useAuth();
  const navigate = useNavigate();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [clientNumber, setClientNumber] = useState('');
  const [name, setName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [assignClientNumber, setAssignClientNumber] = useState(session?.clientNumber ?? '');
  const [registerLabel, setRegisterLabel] = useState('Caja 1');

  async function refreshTenants() {
    setLoading(true);
    setError(null);

    try {
      const data = await listTenants();
      setTenants(data.tenants);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'No se pudieron cargar los clientes');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refreshTenants();
  }, []);

  async function handleCreateClient(event: FormEvent) {
    event.preventDefault();
    setMessage(null);
    setError(null);

    try {
      await createTenant(clientNumber, name, contactEmail || undefined);
      setMessage(`Cliente ${clientNumber.trim().toUpperCase()} creado.`);
      setClientNumber('');
      setName('');
      setContactEmail('');
      setShowCreateForm(false);
      await refreshTenants();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'No se pudo crear el cliente');
    }
  }

  async function handleAssignRegister(event: FormEvent) {
    event.preventDefault();
    if (!session) {
      return;
    }

    setMessage(null);
    setError(null);

    try {
      await createRegister(assignClientNumber, registerLabel, [session.portalUserId]);
      setMessage(`Caja "${registerLabel}" asignada a ${assignClientNumber.trim().toUpperCase()}.`);
      setRegisterLabel('');
      await refreshTenants();
    } catch (assignError) {
      setError(assignError instanceof Error ? assignError.message : 'No se pudo asignar la caja');
    }
  }

  return (
    <section className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Clientes</h2>
          <p className="text-sm text-slate-400">Administrá clientes y asigná cajas por número de cliente.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreateForm((current) => !current)}
          className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-medium hover:bg-teal-500"
        >
          <Plus className="h-4 w-4" />
          Crear cliente
        </button>
      </div>

      {message ? <p className="rounded-xl border border-teal-500/30 bg-teal-500/10 px-4 py-3 text-sm text-teal-200">{message}</p> : null}
      {error ? <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{error}</p> : null}

      {showCreateForm ? (
        <form onSubmit={handleCreateClient} className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
          <h3 className="mb-4 font-medium">Nuevo cliente</h3>
          <div className="grid gap-3 md:grid-cols-3">
            <input
              value={clientNumber}
              onChange={(event) => setClientNumber(event.target.value)}
              className="rounded-xl border border-white/10 bg-slate-950 px-4 py-3"
              placeholder="Número de cliente"
              required
            />
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="rounded-xl border border-white/10 bg-slate-950 px-4 py-3"
              placeholder="Nombre"
              required
            />
            <input
              value={contactEmail}
              onChange={(event) => setContactEmail(event.target.value)}
              className="rounded-xl border border-white/10 bg-slate-950 px-4 py-3"
              placeholder="Email (opcional)"
              type="email"
            />
          </div>
          <button type="submit" className="mt-4 rounded-xl bg-teal-600 px-4 py-3 font-medium hover:bg-teal-500">
            Guardar cliente
          </button>
        </form>
      ) : null}

      <form onSubmit={handleAssignRegister} className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
        <h3 className="mb-3 inline-flex items-center gap-2 font-medium">
          <UserPlus className="h-4 w-4 text-teal-300" />
          Asignar caja
        </h3>
        <div className="grid gap-3 md:grid-cols-2">
          <input
            value={assignClientNumber}
            onChange={(event) => setAssignClientNumber(event.target.value)}
            className="rounded-xl border border-white/10 bg-slate-950 px-4 py-3"
            placeholder="Número de cliente"
            required
          />
          <input
            value={registerLabel}
            onChange={(event) => setRegisterLabel(event.target.value)}
            className="rounded-xl border border-white/10 bg-slate-950 px-4 py-3"
            placeholder="Etiqueta de caja"
            required
          />
        </div>
        <button type="submit" className="mt-4 rounded-xl bg-slate-800 px-4 py-3 hover:bg-slate-700">
          Guardar caja
        </button>
      </form>

      <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
        <h3 className="mb-4 font-medium">Listado de clientes</h3>
        {loading ? <p className="text-slate-400">Cargando…</p> : null}
        {!loading && tenants.length === 0 ? (
          <p className="text-slate-400">Todavía no hay clientes registrados.</p>
        ) : null}
        <div className="space-y-3">
          {tenants.map((tenant) => (
            <button
              key={tenant.id}
              type="button"
              onClick={() => {
                login(tenant.clientNumber, '');
                navigate('/');
              }}
              className="flex w-full items-center justify-between rounded-xl border border-white/5 px-4 py-3 text-left transition hover:border-teal-500/30 hover:bg-white/5"
            >
              <div>
                <p className="font-medium">{tenant.name}</p>
                <p className="text-sm text-slate-400">{tenant.clientNumber}</p>
              </div>
              {tenant.contactEmail ? <p className="text-xs text-slate-500">{tenant.contactEmail}</p> : null}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
