const apiBase = import.meta.env.VITE_REMOTE_API_URL ?? '/api';

export type Tenant = {
  id: string;
  clientNumber: string;
  name: string;
  contactEmail?: string;
  createdAt: string;
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

export function confirmPairing(code: string, portalUserId: string) {
  return request<{ code: string; confirmed: boolean; registerLabel?: string }>('/pairing/confirm', {
    method: 'POST',
    body: JSON.stringify({ code, portalUserId }),
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
