import { FormEvent, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import { ClientCredentialsCard } from '@/components/ClientCredentialsCard';
import { useAuth } from '@/lib/auth-context';
import { previewNextClientNumber, registerClient } from '@/lib/remote-api';

export function LoginPage() {
  const { session, login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newClientName, setNewClientName] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newClientPassword, setNewClientPassword] = useState('');
  const [newClientPasswordConfirm, setNewClientPasswordConfirm] = useState('');
  const [nextClientPreview, setNextClientPreview] = useState<string | null>(null);
  const [createdClient, setCreatedClient] = useState<{
    clientNumber: string;
    email: string;
    name: string;
    password: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');

  if (session) {
    return <Navigate to="/" replace />;
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await login(email, password);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'No se pudo iniciar sesión');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handlePreviewNextId() {
    setError(null);
    try {
      const preview = await previewNextClientNumber();
      setNextClientPreview(preview.clientNumber);
    } catch (previewError) {
      setError(previewError instanceof Error ? previewError.message : 'No se pudo obtener el próximo ID');
    }
  }

  async function handleRegisterClient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setCreatedClient(null);

    if (newClientPassword !== newClientPasswordConfirm) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setIsCreating(true);

    try {
      const result = await registerClient(newClientName, newClientEmail, newClientPassword);
      setCreatedClient({
        clientNumber: result.clientNumber,
        email: result.email,
        name: result.tenant.name,
        password: newClientPassword,
      });
      setEmail(result.email);
      setPassword(newClientPassword);
      setNextClientPreview(result.clientNumber);
    } catch (registerError) {
      setError(registerError instanceof Error ? registerError.message : 'No se pudo crear el cliente');
    } finally {
      setIsCreating(false);
    }
  }

  function enterAfterRegister() {
    if (!createdClient) {
      return;
    }

    void (async () => {
      setIsSubmitting(true);
      setError(null);
      try {
        await login(email, password);
      } catch (loginError) {
        setError(loginError instanceof Error ? loginError.message : 'No se pudo ingresar');
      } finally {
        setIsSubmitting(false);
      }
    })();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-8">
      <div className="w-full max-w-lg space-y-4">
        <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-8 shadow-2xl">
          <div className="mb-6 flex items-center gap-3">
            <img src="/logo.png" alt="POS Remoto" className="h-12 w-12 rounded-xl" />
            <div>
              <h1 className="text-xl font-semibold">POS Remoto</h1>
              <p className="text-sm text-slate-400">Portal de administración de cajas</p>
            </div>
          </div>

          <div className="mb-6 grid grid-cols-2 gap-2 rounded-xl bg-slate-950/80 p-1">
            <button
              type="button"
              onClick={() => setActiveTab('login')}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                activeTab === 'login' ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Ingresar
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('register')}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                activeTab === 'register' ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Nuevo cliente
            </button>
          </div>

          {error ? <p className="mb-4 text-sm text-rose-400">{error}</p> : null}

          {activeTab === 'login' ? (
            <form onSubmit={(event) => void handleLogin(event)}>
              <label className="mb-2 block text-sm text-slate-300">Email</label>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mb-4 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 outline-none ring-teal-500 focus:ring-2"
                placeholder="tu@negocio.com"
                autoComplete="email"
                required
              />

              <label className="mb-2 block text-sm text-slate-300">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mb-4 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 outline-none ring-teal-500 focus:ring-2"
                placeholder="Tu contraseña"
                autoComplete="current-password"
                required
              />

              <div className="mb-4 rounded-xl border border-white/5 bg-slate-950/60 px-4 py-3 text-xs text-slate-400">
                <p className="mb-1 font-medium text-slate-300">Accesos de desarrollo</p>
                <p>
                  Desarrollador: <code className="text-teal-300">developer@pos.local</code> /{' '}
                  <code className="text-teal-300">dev1234</code>
                </p>
                <p className="mt-1">
                  Cliente demo: <code className="text-teal-300">demo@pos.local</code> /{' '}
                  <code className="text-teal-300">demo1234</code>
                </p>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-xl bg-teal-600 px-4 py-3 font-medium text-white transition hover:bg-teal-500 disabled:opacity-60"
              >
                {isSubmitting ? 'Ingresando…' : 'Ingresar al portal'}
              </button>
            </form>
          ) : (
            <form onSubmit={(event) => void handleRegisterClient(event)}>
              <p className="mb-4 text-sm text-slate-400">
                Creá tu cuenta con email y contraseña. Se genera un ID{' '}
                <code className="text-teal-300">CLI-xxxxx</code> para emparejar el POS.
              </p>

              <label className="mb-2 block text-sm text-slate-300">Nombre del negocio</label>
              <input
                value={newClientName}
                onChange={(event) => setNewClientName(event.target.value)}
                className="mb-4 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 outline-none ring-teal-500 focus:ring-2"
                placeholder="Armería Malvinas"
                required
              />

              <label className="mb-2 block text-sm text-slate-300">Email</label>
              <input
                type="email"
                value={newClientEmail}
                onChange={(event) => setNewClientEmail(event.target.value)}
                className="mb-4 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 outline-none ring-teal-500 focus:ring-2"
                placeholder="contacto@negocio.com"
                autoComplete="email"
                required
              />

              <label className="mb-2 block text-sm text-slate-300">Contraseña</label>
              <input
                type="password"
                value={newClientPassword}
                onChange={(event) => setNewClientPassword(event.target.value)}
                className="mb-4 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 outline-none ring-teal-500 focus:ring-2"
                placeholder="Mínimo 6 caracteres"
                minLength={6}
                autoComplete="new-password"
                required
              />

              <label className="mb-2 block text-sm text-slate-300">Confirmar contraseña</label>
              <input
                type="password"
                value={newClientPasswordConfirm}
                onChange={(event) => setNewClientPasswordConfirm(event.target.value)}
                className="mb-4 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 outline-none ring-teal-500 focus:ring-2"
                placeholder="Repetí la contraseña"
                minLength={6}
                autoComplete="new-password"
                required
              />

              <button
                type="button"
                onClick={() => void handlePreviewNextId()}
                className="mb-4 inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm hover:bg-white/5"
              >
                Ver próximo ID POS
                {nextClientPreview ? (
                  <span className="font-mono text-teal-200">{nextClientPreview}</span>
                ) : null}
              </button>

              <button
                type="submit"
                disabled={isCreating}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-3 font-medium text-white transition hover:bg-teal-500 disabled:opacity-60"
              >
                <UserPlus className="h-4 w-4" />
                {isCreating ? 'Creando…' : 'Crear cuenta de cliente'}
              </button>
            </form>
          )}

          {createdClient ? (
            <ClientCredentialsCard
              businessName={createdClient.name}
              clientNumber={createdClient.clientNumber}
              email={createdClient.email}
              password={createdClient.password}
              onEnterNow={enterAfterRegister}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
