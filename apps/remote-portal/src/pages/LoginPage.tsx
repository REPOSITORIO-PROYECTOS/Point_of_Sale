import { FormEvent, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth-context';
import { listTenants, type Tenant } from '@/lib/remote-api';

export function LoginPage() {
  const { session, login } = useAuth();
  const [clientNumber, setClientNumber] = useState('CLI-00001');
  const [password, setPassword] = useState('');
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void listTenants()
      .then((data) => setTenants(data.tenants))
      .catch(() => {
        // relay puede no estar disponible en build estático
      });
  }, []);

  if (session) {
    return <Navigate to="/" replace />;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    try {
      login(clientNumber, password);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'No se pudo iniciar sesión');
    }
  }

  function handleSelectTenant(tenant: Tenant) {
    setError(null);

    try {
      login(tenant.clientNumber, password);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'No se pudo iniciar sesión');
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900/80 p-8 shadow-2xl"
      >
        <div className="mb-6 flex items-center gap-3">
          <img src="/logo.png" alt="POS Remoto" className="h-12 w-12 rounded-xl" />
          <div>
            <h1 className="text-xl font-semibold">POS Remoto</h1>
            <p className="text-sm text-slate-400">Administración de cajas</p>
          </div>
        </div>

        <label className="mb-2 block text-sm text-slate-300">Número de cliente</label>
        <input
          value={clientNumber}
          onChange={(event) => setClientNumber(event.target.value)}
          className="mb-4 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 outline-none ring-teal-500 focus:ring-2"
          placeholder="CLI-00042"
        />

        {tenants.length > 0 ? (
          <div className="mb-4">
            <p className="mb-2 text-xs text-slate-400">O elegí un cliente existente:</p>
            <div className="flex flex-wrap gap-2">
              {tenants.map((tenant) => (
                <button
                  key={tenant.id}
                  type="button"
                  onClick={() => handleSelectTenant(tenant)}
                  className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-200 hover:border-teal-500/40 hover:bg-white/5"
                >
                  {tenant.clientNumber}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <label className="mb-2 block text-sm text-slate-300">Contraseña</label>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="mb-2 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 outline-none ring-teal-500 focus:ring-2"
          placeholder="dev: dejar vacío"
        />

        {import.meta.env.DEV ? (
          <p className="mb-4 text-xs text-teal-300/80">Modo dev: podés dejar la contraseña vacía.</p>
        ) : null}

        {error ? <p className="mb-4 text-sm text-rose-400">{error}</p> : null}

        <button
          type="submit"
          className="w-full rounded-xl bg-teal-600 px-4 py-3 font-medium text-white transition hover:bg-teal-500"
        >
          Ingresar
        </button>
      </form>
    </div>
  );
}
