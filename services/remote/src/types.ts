export type Tenant = {
  id: string;
  clientNumber: string;
  name: string;
  contactEmail?: string;
  createdAt: string;
};

export type Register = {
  id: string;
  tenantId: string;
  label: string;
  machineId?: string;
  assignedPortalUserIds: string[];
  deviceToken?: string;
  lastSeen?: string;
  online: boolean;
};

export type PairingCode = {
  code: string;
  tenantId: string;
  registerId: string;
  expiresAt: string;
  confirmed: boolean;
  confirmedByPortalUserId?: string;
};

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

export type RegisterSnapshot = {
  registerId: string;
  clientNumber: string;
  label: string;
  online: boolean;
  lastHeartbeatAt?: string;
  lastSyncAt: string;
  cashSession: CashSessionSnapshot;
  salesToday: SalesTodaySnapshot;
  stockAlerts: number;
  licenseStatus?: 'active' | 'grace' | 'invalid';
  agentVersion?: string;
  currency: string;
  heartbeatHistory?: string[];
};

export type RegisterSummary = {
  id: string;
  label: string;
  online: boolean;
  lastSeen?: string;
  paired: boolean;
  snapshot?: Pick<
    RegisterSnapshot,
    'salesToday' | 'cashSession' | 'stockAlerts' | 'licenseStatus' | 'lastSyncAt'
  >;
};

export type TenantDetail = {
  clientNumber: string;
  name: string;
  contactEmail?: string;
  createdAt: string;
  registers: RegisterSummary[];
};

export type WsAgentMessage =
  | { type: 'heartbeat'; at: string }
  | { type: 'snapshot'; payload: RegisterSnapshot };

export type WsPortalMessage =
  | { type: 'subscribe'; clientNumber: string }
  | { type: 'ping' };

export type WsServerMessage =
  | { type: 'registers'; registers: RegisterPresence[] }
  | { type: 'register_update'; register: RegisterPresence }
  | { type: 'snapshot_update'; snapshot: RegisterSnapshot }
  | { type: 'pong' };

export type RegisterPresence = {
  id: string;
  label: string;
  online: boolean;
  lastSeen?: string;
  assignedPortalUserIds: string[];
  snapshot?: Pick<
    RegisterSnapshot,
    'salesToday' | 'cashSession' | 'stockAlerts' | 'licenseStatus' | 'lastSyncAt'
  >;
};
