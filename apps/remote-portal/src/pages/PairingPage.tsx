import { FormEvent, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth-context';
import { confirmPairing, requestPairingCode } from '@/lib/remote-api';
import { Copy, Radio } from 'lucide-react';

export function PairingPage() {
  const { session, isDeveloper } = useAuth();
  const [code, setCode] = useState('');
  const [registerLabel, setRegisterLabel] = useState('Caja 1');
  const [generatedCode, setGeneratedCode] = useState<{ code: string; expiresAt: string } | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  if (isDeveloper) {
    return <Navigate to="/clients" replace />;
  }

  const clientNumber = session?.clientNumber;
  if (!clientNumber) {
    return <Navigate to="/login" replace />;
  }

  async function handleGenerateCode(event: FormEvent) {
    event.preventDefault();
    if (!session) {
      return;
    }

    setMessage(null);
    setError(null);
    setIsGenerating(true);

    try {
      if (!clientNumber) {
        return;
      }
      const result = await requestPairingCode(clientNumber, registerLabel.trim());
      setGeneratedCode({ code: result.code, expiresAt: result.expiresAt });
      setCode(result.code);
      setMessage(`Código ${result.code} generado para ${clientNumber}. Confirmalo abajo y luego ingresalo en el POS.`);
    } catch (generateError) {
      setError(generateError instanceof Error ? generateError.message : 'No se pudo generar el código');
    } finally {
      setIsGenerating(false);
    }
  }

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
          ? `Código confirmado para ${result.registerLabel}. Ingresalo en el POS (Ajustes → Conexión Remota).`
          : 'Código confirmado. El POS puede completar el emparejamiento.',
      );
    } catch (confirmError) {
      setError(confirmError instanceof Error ? confirmError.message : 'No se pudo confirmar el código');
    }
  }

  return (
    <section className="max-w-xl space-y-6">
      <div>
        <h2 className="mb-2 text-2xl font-semibold">Emparejar caja</h2>
        <p className="text-sm text-slate-400">
          Cliente <span className="font-mono text-teal-300">{clientNumber}</span> — generá un código,
          confirmalo acá e ingresalo en el POS.
        </p>
      </div>

      <form onSubmit={(event) => void handleGenerateCode(event)} className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
        <h3 className="mb-3 font-medium">1. Generar código para el POS</h3>
        <label className="mb-2 block text-sm text-slate-300">Nombre de la caja</label>
        <input
          value={registerLabel}
          onChange={(event) => setRegisterLabel(event.target.value)}
          className="mb-4 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3"
          placeholder="Caja 1"
          required
        />
        <button
          type="submit"
          disabled={isGenerating}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-3 text-sm font-medium hover:bg-slate-700 disabled:opacity-60"
        >
          <Radio className="h-4 w-4" />
          {isGenerating ? 'Generando…' : 'Generar código de emparejamiento'}
        </button>

        {generatedCode ? (
          <div className="mt-4 rounded-xl border border-teal-500/30 bg-teal-500/10 p-4">
            <p className="text-xs text-slate-400">Código (vence {new Date(generatedCode.expiresAt).toLocaleTimeString('es-AR')})</p>
            <p className="font-mono text-2xl tracking-[0.35em] text-white">{generatedCode.code}</p>
            <button
              type="button"
              onClick={() => void navigator.clipboard.writeText(generatedCode.code)}
              className="mt-2 inline-flex items-center gap-1 text-xs text-teal-200 hover:underline"
            >
              <Copy className="h-3.5 w-3.5" />
              Copiar código
            </button>
          </div>
        ) : null}
      </form>

      <form onSubmit={(event) => void handleConfirm(event)} className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
        <h3 className="mb-3 font-medium">2. Confirmar código en el portal</h3>
        <label className="mb-2 block text-sm text-slate-300">Código de emparejamiento</label>
        <input
          value={code}
          onChange={(event) => setCode(event.target.value.toUpperCase())}
          className="mb-4 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 tracking-[0.3em]"
          placeholder="ABC123"
          maxLength={8}
          required
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
