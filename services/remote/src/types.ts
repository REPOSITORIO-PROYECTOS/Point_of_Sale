export type Tenant = {
  id: string;
  clientNumber: string;
  name: string;
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

export type RegisterSnapshot = {
  registerId: string;
  clientNumber: string;
  label: string;
  salesToday: number;
  ticketCount: number;
  cashSessionOpen: boolean;
  lastSync: string;
  currency: string;
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
  | { type: 'pong' };

export type RegisterPresence = {
  id: string;
  label: string;
  online: boolean;
  lastSeen?: string;
  assignedPortalUserIds: string[];
};
