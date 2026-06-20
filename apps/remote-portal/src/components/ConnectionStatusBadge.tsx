import { cn } from '@/lib/utils';
import { useConnectionStatus } from '@/lib/use-connection-status';

export function ConnectionStatusBadge() {
  const status = useConnectionStatus();

  if (status.checking && !status.lastCheckedAt) {
    return (
      <span className="rounded-full border border-white/10 px-2.5 py-1 text-xs text-slate-400">
        Verificando conexión…
      </span>
    );
  }

  const isHealthy = status.browserOnline && status.relayOnline;

  return (
    <span
      className={cn(
        'rounded-full px-2.5 py-1 text-xs',
        isHealthy
          ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
          : 'border border-amber-500/30 bg-amber-500/10 text-amber-100',
      )}
      title={
        !status.browserOnline
          ? 'Sin internet en este dispositivo'
          : !status.relayOnline
            ? status.relayError ?? 'Relay no disponible'
            : 'Portal y relay conectados'
      }
    >
      {!status.browserOnline
        ? 'Sin internet'
        : !status.relayOnline
          ? 'Relay offline'
          : 'En línea'}
    </span>
  );
}
