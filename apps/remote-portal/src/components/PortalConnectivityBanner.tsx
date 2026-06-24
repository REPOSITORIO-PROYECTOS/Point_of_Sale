import { WifiOff } from 'lucide-react';
import type { ConnectionStatus } from '@/lib/use-connection-status';

type PortalConnectivityBannerProps = {
  status: ConnectionStatus;
};

export function PortalConnectivityBanner({ status }: PortalConnectivityBannerProps) {
  if (status.checking && !status.lastCheckedAt) {
    return null;
  }

  if (status.browserOnline && status.relayOnline) {
    return null;
  }

  return (
    <div
      className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-100"
      role="status"
    >
      <div className="mx-auto flex max-w-5xl items-start gap-2">
        <WifiOff className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          {!status.browserOnline
            ? 'Sin conexión a internet en este dispositivo. Podés ver datos cacheados; los cambios se encolan hasta reconectar.'
            : `No se puede contactar el relay remoto${status.relayError ? ` (${status.relayError})` : ''}. Los datos de las cajas pueden estar desactualizados.`}
        </p>
      </div>
    </div>
  );
}
