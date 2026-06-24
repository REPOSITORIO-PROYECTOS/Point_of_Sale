import { Clock3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatLastUpdateLabel, getLastSyncIso } from '@/lib/register-status';

type StaleDataBadgeProps = {
  online: boolean;
  lastSyncAt?: string;
  lastSeen?: string;
  className?: string;
};

export function StaleDataBadge({ online, lastSyncAt, lastSeen, className }: StaleDataBadgeProps) {
  const lastSyncIso = getLastSyncIso(lastSyncAt, lastSeen);

  if (online && lastSyncIso) {
    const diffMs = Date.now() - new Date(lastSyncIso).getTime();
    if (diffMs <= 5 * 60_000) {
      return null;
    }
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium',
        online ? 'bg-slate-500/15 text-slate-300' : 'bg-amber-500/15 text-amber-200',
        className,
      )}
    >
      <Clock3 className="h-3 w-3" />
      {formatLastUpdateLabel(lastSyncIso)}
    </span>
  );
}
