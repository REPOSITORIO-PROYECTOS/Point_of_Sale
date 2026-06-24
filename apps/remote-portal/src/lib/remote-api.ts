const apiBase = import.meta.env.VITE_REMOTE_API_URL ?? '/api';

export type PortalRole = 'developer' | 'client';

export type Tenant = {
  id: string;
  clientNumber: string;
  name: string;
  contactEmail: string;
  createdAt: string;
};

export type PortalLoginResponse = {
  role: PortalRole;
  email: string;
  portalUserId: string;
  clientNumber?: string;
  tenantId?: string;
  tenantName?: string;
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
  registers: TenantRegister[];
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

export type RegisterSnapshotSummary = {
  salesToday: SalesTodaySnapshot;
  cashSession: CashSessionSnapshot;
  stockAlerts: number;
  licenseStatus?: 'active' | 'grace' | 'invalid';
  lastSyncAt: string;
};

export type TenantRegister = {
  id: string;
  label: string;
  machineId?: string;
  online: boolean;
  lastSeen?: string;
  assignedPortalUserIds: string[];
  paired: boolean;
  snapshot?: RegisterSnapshotSummary;
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
  stale?: boolean;
  error?: string;
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
  stale?: boolean;
  error?: string;
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

export type IncreasePricesResponse = {
  ok: boolean;
  deferred?: boolean;
  message: string;
  queuedCommand?: QueuedCommand;
  result?: { affectedCount: number; category: string; percent: number; syncedAt: string };
  catalog?: RegisterCatalog;
};

export type TenantDetail = {
  clientNumber: string;
  name: string;
  contactEmail?: string;
  createdAt: string;
  registers: TenantRegister[];
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBase}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `Request failed (${response.status})`);
  }

  return response.json() as Promise<T>;
}

export function getHealth() {
  return request<{ status: string; service: string }>('/health');
}

export function loginPortal(email: string, password: string) {
  return request<PortalLoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export function getPortalSession(sessionToken: string) {
  return request<PortalLoginResponse>('/auth/me', {
    headers: {
      Authorization: `Bearer ${sessionToken}`,
    },
  });
}

export function logoutPortal(sessionToken: string) {
  return request<{ ok: boolean }>('/auth/logout', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${sessionToken}`,
    },
  });
}

export function registerClient(name: string, email: string, password: string) {
  return request<RegisterClientResponse>('/auth/register-client', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  });
}

export function previewNextClientNumber() {
  return request<{ clientNumber: string }>('/auth/next-client-number');
}

export function getClientsOverview(sessionToken: string) {
  return request<{ clients: ClientOverview[] }>('/admin/clients-overview', {
    headers: {
      Authorization: `Bearer ${sessionToken}`,
    },
  });
}

export function changePortalPassword(
  sessionToken: string,
  currentPassword: string,
  newPassword: string,
) {
  return request<{ ok: boolean; message: string }>('/auth/change-password', {
    method: 'POST',
    headers: { Authorization: `Bearer ${sessionToken}` },
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

export function getTenantMessages(sessionToken: string) {
  return request<{ messages: TenantMessage[] }>('/messages', {
    headers: { Authorization: `Bearer ${sessionToken}` },
  });
}

export function markTenantMessageRead(sessionToken: string, messageId: string) {
  return request<{ message: TenantMessage }>(`/messages/${encodeURIComponent(messageId)}/read`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${sessionToken}` },
  });
}

export function sendDeveloperMessage(sessionToken: string, clientNumber: string, body: string) {
  return request<{ message: TenantMessage }>(
    `/admin/tenants/${encodeURIComponent(clientNumber)}/messages`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${sessionToken}` },
      body: JSON.stringify({ body }),
    },
  );
}

export function getDeveloperSentMessages(sessionToken: string, clientNumber: string) {
  return request<{ messages: TenantMessage[] }>(
    `/admin/tenants/${encodeURIComponent(clientNumber)}/messages`,
    {
      headers: { Authorization: `Bearer ${sessionToken}` },
    },
  );
}

export function listTenants() {
  return request<{ tenants: Tenant[] }>('/admin/tenants');
}

export function getTenantDetail(clientNumber: string) {
  return request<TenantDetail>(`/tenants/${encodeURIComponent(clientNumber)}`);
}

export function listRegisters(clientNumber: string) {
  return request<{
    clientNumber: string;
    name: string;
    contactEmail?: string;
    registers: TenantRegister[];
  }>(`/tenants/${encodeURIComponent(clientNumber)}/registers`);
}

export function getRegisterSnapshot(clientNumber: string, registerId: string) {
  return request<RegisterSnapshot>(
    `/tenants/${encodeURIComponent(clientNumber)}/registers/${encodeURIComponent(registerId)}/snapshot`,
  );
}

function authHeaders(sessionToken: string): HeadersInit {
  return { Authorization: `Bearer ${sessionToken}` };
}

export function getRegisterCatalog(
  sessionToken: string,
  clientNumber: string,
  registerId: string,
  refresh = false,
) {
  const query = refresh ? '?refresh=1' : '';
  return request<RegisterCatalog>(
    `/tenants/${encodeURIComponent(clientNumber)}/registers/${encodeURIComponent(registerId)}/catalog${query}`,
    { headers: authHeaders(sessionToken) },
  );
}

export function getRegisterCashHistory(
  sessionToken: string,
  clientNumber: string,
  registerId: string,
  refresh = false,
) {
  const query = refresh ? '?refresh=1' : '';
  return request<RegisterCashHistory>(
    `/tenants/${encodeURIComponent(clientNumber)}/registers/${encodeURIComponent(registerId)}/cash-sessions/history${query}`,
    { headers: authHeaders(sessionToken) },
  );
}

export function increaseRegisterPricesByCategory(
  sessionToken: string,
  clientNumber: string,
  registerId: string,
  category: string,
  percent: number,
) {
  return requestWithAcceptedStatus<IncreasePricesResponse>(
    `/tenants/${encodeURIComponent(clientNumber)}/registers/${encodeURIComponent(registerId)}/commands/increase-prices`,
    {
      method: 'POST',
      headers: authHeaders(sessionToken),
      body: JSON.stringify({ category, percent }),
    },
  );
}

export function getPendingRegisterCommands(
  sessionToken: string,
  clientNumber: string,
  registerId: string,
) {
  return request<{ registerOnline: boolean; commands: QueuedCommand[] }>(
    `/tenants/${encodeURIComponent(clientNumber)}/registers/${encodeURIComponent(registerId)}/commands/pending`,
    { headers: authHeaders(sessionToken) },
  );
}

async function requestWithAcceptedStatus<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBase}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  const body = (await response.json().catch(() => ({}))) as T & { error?: string };

  if (response.status === 202 || response.ok) {
    return body;
  }

  throw new Error(body.error ?? `Request failed (${response.status})`);
}

export function confirmPairing(code: string, portalUserId: string) {
  return request<{ code: string; confirmed: boolean; registerLabel?: string }>('/pairing/confirm', {
    method: 'POST',
    body: JSON.stringify({ code, portalUserId }),
  });
}

export function requestPairingCode(clientNumber: string, registerLabel: string, machineId?: string) {
  return request<{ code: string; expiresAt: string; registerId: string }>('/pairing/request', {
    method: 'POST',
    body: JSON.stringify({ clientNumber, registerLabel, machineId }),
  });
}

export function createTenant(clientNumber: string, name: string, contactEmail?: string) {
  return request<Tenant>('/admin/tenants', {
    method: 'POST',
    body: JSON.stringify({ clientNumber, name, contactEmail }),
  });
}

export function createRegister(clientNumber: string, registerLabel: string, portalUserIds: string[] = []) {
  return request('/admin/registers', {
    method: 'POST',
    body: JSON.stringify({ clientNumber, registerLabel, portalUserIds }),
  });
}

export function assignRegisters(registerIds: string[], portalUserId: string) {
  return request('/admin/assign-registers', {
    method: 'POST',
    body: JSON.stringify({ registerIds, portalUserId }),
  });
}

export function createPortalWebSocket(clientNumber: string, onMessage: (data: unknown) => void): WebSocket {
  const relayUrl = import.meta.env.VITE_REMOTE_WS_URL as string | undefined;
  const wsBase = relayUrl ?? `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.hostname}:5090`;
  const socket = new WebSocket(`${wsBase}/ws/portal`);

  socket.addEventListener('open', () => {
    socket.send(JSON.stringify({ type: 'subscribe', clientNumber }));
  });

  socket.addEventListener('message', (event) => {
    try {
      onMessage(JSON.parse(String(event.data)));
    } catch {
      // ignore malformed payloads
    }
  });

  return socket;
}

export function formatCurrency(value: number, currency = 'ARS'): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatRelativeTime(iso?: string): string {
  if (!iso) {
    return 'Sin datos';
  }

  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60_000);

  if (minutes < 1) {
    return 'ahora';
  }

  if (minutes < 60) {
    return `hace ${minutes} min`;
  }

  const hours = Math.round(minutes / 60);
  return `hace ${hours} h`;
}

export function formatDateTime(iso?: string): string {
  if (!iso) {
    return '—';
  }

  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(iso));
}

export function licenseLabel(status?: RegisterSnapshot['licenseStatus']): string {
  if (status === 'active') {
    return 'Activa';
  }

  if (status === 'grace') {
    return 'Gracia';
  }

  if (status === 'invalid') {
    return 'Inválida';
  }

  return 'Sin datos';
}
