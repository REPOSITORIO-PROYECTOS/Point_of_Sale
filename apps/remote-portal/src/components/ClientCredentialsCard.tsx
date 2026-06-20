import { Copy, KeyRound, Mail } from 'lucide-react';
import { useState } from 'react';
import { buildClientWelcomeMessage, getPortalPublicUrl } from '@/lib/welcome-message';

type ClientCredentialsCardProps = {
  businessName: string;
  clientNumber: string;
  email: string;
  password: string;
  onEnterNow?: () => void;
  enterLabel?: string;
};

export function ClientCredentialsCard({
  businessName,
  clientNumber,
  email,
  password,
  onEnterNow,
  enterLabel = 'Ingresar ahora',
}: ClientCredentialsCardProps) {
  const [copied, setCopied] = useState(false);
  const portalUrl = getPortalPublicUrl();
  const welcomeText = buildClientWelcomeMessage({
    businessName,
    clientNumber,
    email,
    password,
    portalUrl,
  });

  async function copyWelcomeMessage() {
    await navigator.clipboard.writeText(welcomeText);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-xl border border-teal-500/30 bg-teal-500/10 p-4">
      <p className="mb-2 flex items-center gap-2 text-sm font-medium text-teal-100">
        <KeyRound className="h-4 w-4" />
        Mensaje para enviar al cliente
      </p>
      <p className="text-sm text-teal-100">{businessName}</p>
      <p className="font-mono text-lg text-white">{clientNumber}</p>

      <div className="mt-3 space-y-1 text-sm text-teal-200/90">
        <p className="inline-flex items-center gap-1">
          <Mail className="h-3.5 w-3.5" />
          {email}
        </p>
        <p>
          Contraseña: <span className="font-mono">{password}</span>
        </p>
        <p>
          Link:{' '}
          <a href={portalUrl} target="_blank" rel="noreferrer" className="underline">
            {portalUrl}
          </a>
        </p>
      </div>

      <pre className="mt-3 max-h-48 overflow-auto rounded-lg border border-white/10 bg-slate-950/80 p-3 text-xs whitespace-pre-wrap text-slate-300">
        {welcomeText}
      </pre>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void copyWelcomeMessage()}
          className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 text-xs hover:bg-white/5"
        >
          <Copy className="h-3.5 w-3.5" />
          {copied ? 'Copiado' : 'Copiar mensaje completo'}
        </button>
        {onEnterNow ? (
          <button
            type="button"
            onClick={onEnterNow}
            className="rounded-lg bg-teal-700 px-3 py-1.5 text-xs hover:bg-teal-600"
          >
            {enterLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}
