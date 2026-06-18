import { FormEvent, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { confirmPairing } from '@/lib/remote-api';

export function PairingPage() {
  const { session } = useAuth();
  const [code, setCode] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm(event: FormEvent) {
    event.preventDefault();
    if (!session) {
      return;
    }

    setMessage(null);
    setError(null);

    try {
      const result = await confirmPairing(code.trim().toUpperCase(), session.portalUserId);
      setMessage(
        result.registerLabel
          ? `Código confirmado para ${result.registerLabel}. Ahora el POS puede completar el emparejamiento.`
          : 'Código confirmado. El POS puede completar el emparejamiento.',
      );
      setCode('');
    } catch (confirmError) {
      setError(confirmError instanceof Error ? confirmError.message : 'No se pudo confirmar el código');
    }
  }

  return (
    <section className="max-w-xl">
      <h2 className="mb-2 text-2xl font-semibold">Emparejar caja</h2>
      <p className="mb-6 text-sm text-slate-400">
        El POS solicita un código con <code className="text-teal-300">POST /pairing/request</code>. Confirmalo acá
        antes de que la caja llame a <code className="text-teal-300">POST /api/remote/pair</code>.
      </p>

      <form onSubmit={(event) => void handleConfirm(event)} className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
        <label className="mb-2 block text-sm text-slate-300">Código de emparejamiento</label>
        <input
          value={code}
          onChange={(event) => setCode(event.target.value.toUpperCase())}
          className="mb-4 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 tracking-[0.3em]"
          placeholder="ABC123"
          maxLength={8}
        />

        {message ? <p className="mb-3 text-sm text-teal-200">{message}</p> : null}
        {error ? <p className="mb-3 text-sm text-rose-300">{error}</p> : null}

        <button type="submit" className="rounded-xl bg-teal-600 px-4 py-3 font-medium hover:bg-teal-500">
          Confirmar emparejamiento
        </button>
      </form>
    </section>
  );
}
