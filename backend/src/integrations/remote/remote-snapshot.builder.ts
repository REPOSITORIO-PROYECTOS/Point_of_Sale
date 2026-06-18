export type CashSessionSnapshot = {
  open: boolean;
  openedAt?: string;
  openingBalance?: number;
  salesTotal?: number;
  expectedBalance?: number;
};

export type SalesTodaySnapshot = {
  count: number;
  total: number;
};

export type RemoteLicenseStatus = 'active' | 'grace' | 'invalid';

export type RegisterSnapshot = {
  registerId: string;
  clientNumber: string;
  label: string;
  online?: boolean;
  lastHeartbeatAt?: string;
  lastSyncAt: string;
  cashSession: CashSessionSnapshot;
  salesToday: SalesTodaySnapshot;
  stockAlerts: number;
  licenseStatus?: RemoteLicenseStatus;
  agentVersion?: string;
  currency: string;
  heartbeatHistory?: string[];
};

export type RemoteSnapshotInput = {
  registerId: string;
  clientNumber: string;
  label: string;
  cashSession: CashSessionSnapshot;
  salesToday: SalesTodaySnapshot;
  stockAlerts: number;
  licenseStatus: RemoteLicenseStatus;
  agentVersion: string;
  currency?: string;
};

export function buildRegisterSnapshot(input: RemoteSnapshotInput): RegisterSnapshot {
  const now = new Date().toISOString();

  return {
    registerId: input.registerId,
    clientNumber: input.clientNumber,
    label: input.label,
    lastSyncAt: now,
    lastHeartbeatAt: now,
    cashSession: input.cashSession,
    salesToday: input.salesToday,
    stockAlerts: input.stockAlerts,
    licenseStatus: input.licenseStatus,
    agentVersion: input.agentVersion,
    currency: input.currency ?? 'ARS',
  };
}

export function mapLicenseStatus(
  status: string,
  inGracePeriod: boolean,
): RemoteLicenseStatus {
  if (status === 'active') {
    return 'active';
  }

  if (inGracePeriod) {
    return 'grace';
  }

  return 'invalid';
}
