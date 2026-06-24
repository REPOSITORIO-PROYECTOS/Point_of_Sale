export function getLastSyncIso(
  lastSyncAt?: string,
  lastSeen?: string,
): string | undefined {
  return lastSyncAt ?? lastSeen;
}

export function formatLastUpdateLabel(iso?: string): string {
  if (!iso) {
    return 'Sin datos sincronizados';
  }

  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60_000);

  if (minutes < 1) {
    return 'Última actualización: ahora';
  }

  if (minutes < 60) {
    return `Última actualización: hace ${minutes} min`;
  }

  const hours = Math.round(minutes / 60);
  if (hours < 48) {
    return `Última actualización: hace ${hours} h`;
  }

  const days = Math.round(hours / 24);
  return `Última actualización: hace ${days} d`;
}

export function isStaleSnapshot(iso?: string, staleAfterMinutes = 5): boolean {
  if (!iso) {
    return true;
  }

  const diffMs = Date.now() - new Date(iso).getTime();
  return diffMs > staleAfterMinutes * 60_000;
}

export type RegisterConnectivity = {
  online: boolean;
  lastSyncAt?: string;
  lastSeen?: string;
  hasSnapshot?: boolean;
};

export function getConnectivityState(register: RegisterConnectivity): {
  showOfflineBanner: boolean;
  showStaleBadge: boolean;
  lastUpdateLabel: string;
  hasCachedData: boolean;
} {
  const lastSyncIso = getLastSyncIso(register.lastSyncAt, register.lastSeen);
  const hasCachedData = Boolean(register.hasSnapshot ?? lastSyncIso);
  const stale = isStaleSnapshot(lastSyncIso);

  return {
    showOfflineBanner: !register.online,
    showStaleBadge: !register.online || stale,
    lastUpdateLabel: formatLastUpdateLabel(lastSyncIso),
    hasCachedData,
  };
}
