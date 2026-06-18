import { FormEvent, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth-context';

export function LoginPage() {
  const { session, login } = useAuth();
  const [clientNumber, setClientNumber] = useState('CLI-00001');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

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
