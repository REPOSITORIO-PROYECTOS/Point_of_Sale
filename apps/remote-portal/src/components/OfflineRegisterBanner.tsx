import { AlertTriangle, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getConnectivityState, type RegisterConnectivity } from '@/lib/register-status';

type OfflineRegisterBannerProps = RegisterConnectivity & {
  className?: string;
  compact?: boolean;
};

export function OfflineRegisterBanner({
  online,
  lastSyncAt,
  lastSeen,
  hasSnapshot,
  className,
  compact = false,
}: OfflineRegisterBannerProps) {
  const state = getConnectivityState({ online, lastSyncAt, lastSeen, hasSnapshot });

  if (!state.showOfflineBanner && !state.showStaleBadge) {
    return null;
  }

  if (compact) {
    return (
      <p
        className={cn(
          'text-xs',
          !online ? 'text-amber-300' : 'text-slate-500',
          className,
        )}
      >
        {!online ? '🔴 Desconectada · ' : ''}
        {state.lastUpdateLabel}
      </p>
    );
  }

  return (
    <div
      className={cn(
        'rounded-xl border px-4 py-3 text-sm',
        !online
          ? 'border-amber-500/30 bg-amber-500/10 text-amber-100'
          : 'border-slate-500/30 bg-slate-500/10 text-slate-200',
        className,
      )}
      role="status"
    >
      <div className="flex items-start gap-3">
        {!online ? (
          <WifiOff className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
        ) : (
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-slate-300" />
        )}
        <div className="min-w-0">
          <p className="font-medium">
            {!online ? 'Caja desconectada' : 'Datos con demora'}
          </p>
          <p className="mt-1 text-xs opacity-90">
            {state.lastUpdateLabel}
            {state.hasCachedData
              ? '. Los valores mostrados son el último snapshot recibido.'
              : '. Aún no hay datos sincronizados desde esta caja.'}
          </p>
        </div>
      </div>
    </div>
  );
}
