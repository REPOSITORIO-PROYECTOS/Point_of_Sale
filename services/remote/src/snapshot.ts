import type { Register, RegisterSnapshot } from './types.js';

export function buildDefaultSnapshot(
  register: Register,
  clientNumber: string,
  heartbeatHistory: string[] = [],
): RegisterSnapshot {
  const now = new Date().toISOString();

  return {
    registerId: register.id,
    clientNumber,
    label: register.label,
    online: register.online,
    lastHeartbeatAt: register.lastSeen ?? now,
    lastSyncAt: register.lastSeen ?? now,
    cashSession: { open: false },
    salesToday: { count: 0, total: 0 },
    stockAlerts: 0,
    currency: 'ARS',
    heartbeatHistory,
  };
}

export function normalizeSnapshot(
  payload: RegisterSnapshot,
  register: Register,
  heartbeatHistory: string[] = [],
): RegisterSnapshot {
  const legacySalesTotal =
    typeof (payload as RegisterSnapshot & { salesToday?: number }).salesToday === 'number'
      ? (payload as RegisterSnapshot & { salesToday: number }).salesToday
      : undefined;
  const legacyTicketCount = (payload as RegisterSnapshot & { ticketCount?: number }).ticketCount;
  const legacyCashOpen = (payload as RegisterSnapshot & { cashSessionOpen?: boolean }).cashSessionOpen;
  const legacyLastSync = (payload as RegisterSnapshot & { lastSync?: string }).lastSync;

  const salesToday =
    payload.salesToday && typeof payload.salesToday === 'object'
      ? payload.salesToday
      : {
          count: legacyTicketCount ?? 0,
          total: legacySalesTotal ?? 0,
        };

  const cashSession =
    payload.cashSession && typeof payload.cashSession === 'object'
      ? payload.cashSession
      : { open: legacyCashOpen ?? false };

  return {
    registerId: payload.registerId,
    clientNumber: payload.clientNumber,
    label: payload.label ?? register.label,
    online: register.online,
    lastHeartbeatAt: payload.lastHeartbeatAt ?? register.lastSeen,
    lastSyncAt: payload.lastSyncAt ?? legacyLastSync ?? register.lastSeen ?? new Date().toISOString(),
    cashSession,
    salesToday,
    stockAlerts: payload.stockAlerts ?? 0,
    licenseStatus: payload.licenseStatus,
    agentVersion: payload.agentVersion,
    currency: payload.currency ?? 'ARS',
    heartbeatHistory: payload.heartbeatHistory ?? heartbeatHistory,
  };
}

export function snapshotSummary(snapshot: RegisterSnapshot): RegisterPresenceSnapshotSummary {
  return {
    salesToday: snapshot.salesToday,
    cashSession: snapshot.cashSession,
    stockAlerts: snapshot.stockAlerts,
    licenseStatus: snapshot.licenseStatus,
    lastSyncAt: snapshot.lastSyncAt,
  };
}

export type RegisterPresenceSnapshotSummary = Pick<
  RegisterSnapshot,
  'salesToday' | 'cashSession' | 'stockAlerts' | 'licenseStatus' | 'lastSyncAt'
>;
