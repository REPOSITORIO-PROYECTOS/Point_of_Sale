const DEFAULT_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${DEFAULT_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  const data = (await response.json().catch(() => ({}))) as T & { message?: string | string[] };

  if (!response.ok) {
    const message = Array.isArray(data.message) ? data.message.join(', ') : data.message;
    throw new Error(message ?? `Request failed (${response.status})`);
  }

  return data;
}

export type AfipConfigStatus = {
  configured: boolean;
  cuit: string | null;
  puntoVenta: number;
  production: boolean;
  hasCertificate: boolean;
  hasPrivateKey: boolean;
  certPath: string;
  keyPath: string;
  configPath: string;
  updatedAt: string | null;
};

export type AfipHealthStatus = {
  afipReachable: boolean;
  credentialsConfigured: boolean;
  configured: boolean;
  url: string;
  latencyMs: number | null;
  error: string | null;
};

export type ImportAfipCredentialsPayload = {
  cuit: string;
  certificado: string;
  clavePrivada: string;
  puntoVenta?: number;
  production?: boolean;
};

export const PosAPI = {
  getAfipConfig: () => request<AfipConfigStatus>("/integrations/afip/config"),
  getAfipHealth: () => request<AfipHealthStatus>("/integrations/afip/health"),
  importAfipCredentials: (payload: ImportAfipCredentialsPayload) =>
    request<{ message: string; status: AfipConfigStatus }>("/integrations/afip/credentials", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};

export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("Could not read file"));
    reader.readAsText(file);
  });
}
