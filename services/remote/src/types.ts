export type PortalRole = 'developer' | 'client';

export type Tenant = {
  id: string;
  clientNumber: string;
  name: string;
  contactEmail: string;
  /** Hash bcrypt de la contraseña del portal (nunca exponer en API). */
  portalPasswordHash?: string;
  createdAt: string;
};

export type PortalAuthPayload = {
  role: PortalRole;
  email: string;
  portalUserId: string;
  clientNumber?: string;
  tenantId?: string;
  tenantName?: string;
};

export type PortalLoginResponse = PortalAuthPayload & {
  sessionToken: string;
  expiresAt: string;
};

export type RegisterClientResponse = {
  tenant: Tenant;
  clientNumber: string;
  email: string;
  message: string;
};

export type ClientOverview = {
  clientNumber: string;
  name: string;
  contactEmail: string;
  createdAt: string;
  registers: RegisterSummary[];
  /** Vistas / cajas disponibles para este cliente en el portal. */
  availableViews: string[];
  unreadMessages: number;
};

export type TenantMessage = {
  id: string;
  clientNumber: string;
  tenantName: string;
  fromEmail: string;
  body: string;
  createdAt: string;
  readAt?: string;
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
  | { type: 'snapshot'; payload: RegisterSnapshot }
  | {
      type: 'data_push';
      payload: {
        catalog?: unknown;
        cashHistory?: unknown;
        pushedAt?: string;
      };
    }
  | { type: 'command_response'; commandId: string; ok: boolean; payload?: unknown; error?: string };

export type WsRelayToAgentMessage = {
  type: 'command';
  commandId: string;
  action: string;
  payload?: unknown;
};

export type CatalogCategorySummary = {
  name: string;
  productCount: number;
};

export type CatalogProductSummary = {
  id: string;
  name: string;
  price: number;
  categories: string[];
  stock?: number;
};

export type RegisterCatalog = {
  registerId: string;
  clientNumber: string;
  categories: CatalogCategorySummary[];
  products: CatalogProductSummary[];
  syncedAt: string;
};

export type CashSessionHistoryItem = {
  id: string;
  startTime: string;
  endTime?: string;
  initialBalance: number;
  expectedBalance?: number;
  countedAmount?: number;
  totalSales: number;
  salesByPaymentMethod?: {
    cash: number;
    card: number;
    transfer: number;
    qr: number;
  };
  isOpen?: boolean;
  closedByUsername?: string;
  closedByRole?: string;
  transactionsCount?: number;
};

export type RegisterCashHistory = {
  registerId: string;
  clientNumber: string;
  currentSession: CashSessionHistoryItem | null;
  closedSessions: CashSessionHistoryItem[];
  syncedAt: string;
};

export type QueuedCommand = {
  id: string;
  registerId: string;
  clientNumber: string;
  action: string;
  payload: unknown;
  createdAt: string;
  attempts: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  lastError?: string;
  completedAt?: string;
};

export type WsPortalMessage =
  | { type: 'subscribe'; clientNumber: string }
  | { type: 'ping' };

export type WsServerMessage =
  | { type: 'registers'; registers: RegisterPresence[] }
  | { type: 'register_update'; register: RegisterPresence }
  | { type: 'snapshot_update'; snapshot: RegisterSnapshot }
  | {
      type: 'data_update';
      registerId: string;
      catalogSyncedAt?: string;
      cashHistorySyncedAt?: string;
    }
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
