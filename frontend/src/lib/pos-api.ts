import type { CashSession, PaymentMethod, Parcel, Product, ThemeConfig, Transaction } from "./wails-bridge";
import { normalizeProduct } from "./product-categories";
import { mapThemeConfigFromApi } from "./theme-logo";

const DEFAULT_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";
const AUTH_TOKEN_KEY = "pos.auth.token";

export type UserRole = "admin" | "manager" | "cashier" | "auditor";

export type AuthUser = {
  id: string;
  username: string;
  role: UserRole;
};

export type LoginResponse = {
  accessToken: string;
  user: AuthUser;
};

export type LicenseStatus = "active" | "expired" | "blocked" | "missing";

export type LicenseStatusResponse = {
  status: LicenseStatus;
  allowed: boolean;
  clientNumber: string | null;
  clientNumberMasked: string | null;
  licenseId: string | null;
  activatedAt: string | null;
  expiresAt: string | null;
  firstBootAt: string;
  graceEndsAt: string;
  inGracePeriod: boolean;
  daysUntilExpiry: number | null;
  showExpiryWarning: boolean;
  cautionFlag: boolean;
  machineId: string;
  message: string | null;
};

export type LicenseActivationResponse = {
  status: "active";
  clientNumber: string;
  licenseId: string;
  expiresAt: string | null;
};

export type MachineIdResponse = {
  machineId: string;
};

export type SupportRecoveryUnlockResponse = {
  recoveryToken: string;
  expiresAt: string;
};

export type SupportRecoveryDiagnostics = {
  dbPath: string;
  schemaVersion: string;
  licenseStatus: string;
  licenseAllowed: boolean;
  userCount: number;
  nodeEnv: string;
  appDataDir: string;
  lastSync: string | null;
};

export type SetupStatusResponse = {
  needsSetup: boolean;
};

export type SetupAdminPayload = {
  username: string;
  password: string;
  confirmPassword: string;
};

export type UpdateProfilePayload = {
  username?: string;
  currentPassword?: string;
  password?: string;
  confirmPassword?: string;
};

export type CashClosingStatus = "perfect" | "surplus" | "shortage";

export type CashClosingSummary = {
  id: string;
  date: string;
  user: string;
  userId?: string;
  userRole: string;
  expectedAmount: number;
  countedAmount: number;
  difference: number;
  status: CashClosingStatus;
  totalSales: number;
  transactionsCount: number;
  salesByMethod: {
    cash: number;
    card: number;
    transfer: number;
    qr: number;
  };
};

export type CashClosingDetail = CashClosingSummary & {
  sales: Array<{
    id: string;
    time: string;
    items: Array<{ id: string; name: string; quantity: number; price: number }>;
    paymentMethod: string;
    paymentDetails?: Array<{ method: string; amount: number }>;
    subtotal: number;
    amount: number;
    cashier: string;
    cashierRole: string;
  }>;
  businessData: {
    name: string;
    rut: string;
    phone: string;
    email: string;
    address: string;
  };
};

export type CashClosingsPage = {
  items: CashClosingSummary[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  cashiers: Array<{ id: string; username: string; role: UserRole }>;
};

export type CashClosingsQuery = {
  page?: number;
  pageSize?: number;
  search?: string;
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
};

function buildCashClosingsQuery(params: CashClosingsQuery): string {
  const search = new URLSearchParams();
  if (params.page) search.set("page", String(params.page));
  if (params.pageSize) search.set("pageSize", String(params.pageSize));
  if (params.search?.trim()) search.set("search", params.search.trim());
  if (params.userId && params.userId !== "all") search.set("userId", params.userId);
  if (params.dateFrom) search.set("dateFrom", params.dateFrom);
  if (params.dateTo) search.set("dateTo", params.dateTo);
  const query = search.toString();
  return query ? `?${query}` : "";
}

function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

function toCashAmount(value: unknown): number {
  const amount = typeof value === "number" ? value : Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

function normalizeCashSession(session: CashSession | null): CashSession | null {
  if (!session) return null;

  return {
    ...session,
    initialBalance: toCashAmount(session.initialBalance),
    totalSales: toCashAmount(session.totalSales),
    finalBalance: session.finalBalance != null ? toCashAmount(session.finalBalance) : undefined,
    countedAmount: session.countedAmount != null ? toCashAmount(session.countedAmount) : undefined,
    salesByPaymentMethod: session.salesByPaymentMethod ?? {
      cash: 0,
      card: 0,
      transfer: 0,
      qr: 0,
    },
  };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getAuthToken();
  const response = await fetch(`${DEFAULT_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  const data = (await response.json().catch(() => ({}))) as T & { message?: string | string[] };

  if (!response.ok) {
    const message = Array.isArray(data.message) ? data.message.join(", ") : data.message;
    throw new Error(message ?? `Request failed (${response.status})`);
  }

  return data;
}

function toProductPayload(product: Product) {
  return {
    id: product.id,
    name: product.name,
    price: product.price,
    cost: product.cost,
    categories: product.categories,
    stock: product.stock,
    minStock: product.minStock,
    image: product.image,
    barcodes: product.barcodes,
    unit: product.unit,
    quantity: product.quantity,
  };
}

export type AfipConfigStatus = {
  configured: boolean;
  pendingCertificate: boolean;
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

export type SaveAfipPrivateKeyPayload = {
  cuit: string;
  clavePrivada: string;
  puntoVenta?: number;
  production?: boolean;
};

export type ImportAfipCertificatePayload = {
  certificado: string;
};

export type GenerateAfipCsrPayload = {
  cuit: string;
  organization?: string;
  commonName?: string;
  puntoVenta?: number;
  production?: boolean;
};

export type AfipFacturaPayload = {
  tipo_afip: number;
  punto_venta?: number;
  tipo_documento: number;
  documento: string;
  total: number;
  id_condicion_iva: number;
  neto?: number;
  iva?: number;
  neto105?: number;
  iva105?: number;
};

export const PosAPI = {
  getSetupStatus: () => request<SetupStatusResponse>("/auth/setup-status"),

  setupAdmin: (payload: SetupAdminPayload) =>
    request<LoginResponse>("/auth/setup", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  login: (username: string, password: string) =>
    request<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),

  getMe: () => request<AuthUser>("/auth/me"),

  updateProfile: (payload: UpdateProfilePayload) =>
    request<LoginResponse>("/auth/me", {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  getUsers: () =>
    request<Array<AuthUser & { isActive: boolean; createdAt: string }>>("/users"),

  createUser: (payload: { username: string; password: string; role: UserRole }) =>
    request<AuthUser & { isActive: boolean; createdAt: string }>("/users", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  updateUser: (
    userId: string,
    payload: { isActive?: boolean; password?: string; role?: UserRole },
  ) =>
    request<AuthUser & { isActive: boolean; createdAt: string }>(`/users/${encodeURIComponent(userId)}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  updateUserActive: (userId: string, isActive: boolean) =>
    request<AuthUser & { isActive: boolean; createdAt: string }>(`/users/${encodeURIComponent(userId)}`, {
      method: "PATCH",
      body: JSON.stringify({ isActive }),
    }),

  getProductByBarcode: (code: string) =>
    request<Product>(`/products/by-barcode/${encodeURIComponent(code)}`).then((product) =>
      normalizeProduct(product),
    ),

  getProducts: async () => {
    const products = await request<Product[]>("/products");
    return products.map((product) => normalizeProduct(product));
  },

  createProduct: (product: Product) =>
    request<Product>("/products", {
      method: "POST",
      body: JSON.stringify(toProductPayload(product)),
    }).then((saved) => normalizeProduct(saved)),

  updateProduct: (product: Product) => {
    const { id, ...payload } = toProductPayload(product);
    return request<Product>(`/products/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }).then((saved) => normalizeProduct(saved));
  },

  deleteProduct: (productId: string) =>
    request<{ deleted: boolean; id: string }>(`/products/${encodeURIComponent(productId)}`, {
      method: "DELETE",
    }),

  replaceProducts: (products: Product[]) =>
    request<Product[]>("/products/bulk", {
      method: "PUT",
      body: JSON.stringify({ products: products.map(toProductPayload) }),
    }).then((saved) => saved.map((product) => normalizeProduct(product))),

  getCashSession: async () => {
    const session = await request<CashSession | null>("/cash/session");
    return normalizeCashSession(session);
  },

  startCashSession: async (initialBalance: number) => {
    const session = await request<CashSession>("/cash/session/start", {
      method: "POST",
      body: JSON.stringify({ initialBalance }),
    });
    return normalizeCashSession(session)!;
  },

  closeCashSession: async (expectedBalance: number, countedAmount: number) => {
    const session = await request<CashSession>("/cash/session/close", {
      method: "POST",
      body: JSON.stringify({ expectedBalance, countedAmount }),
    });
    return normalizeCashSession(session)!;
  },

  getCashClosings: (params: CashClosingsQuery = {}) =>
    request<CashClosingsPage>(`/cash/closings${buildCashClosingsQuery(params)}`),

  getCashClosingDetail: (closingId: string) =>
    request<CashClosingDetail>(`/cash/closings/${encodeURIComponent(closingId)}`),

  createSale: (transaction: Transaction, payments?: PaymentMethod[], voucherType?: string) =>
    request<Transaction>("/sales", {
      method: "POST",
      body: JSON.stringify({
        id: transaction.id,
        items: transaction.items.map((item) => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          unit: item.unit,
        })),
        total: transaction.total,
        timestamp: transaction.timestamp,
        payments,
        voucherType,
      }),
    }),

  getAfipConfig: () => request<AfipConfigStatus>("/integrations/afip/config"),
  getAfipHealth: () => request<AfipHealthStatus>("/integrations/afip/health"),
  importAfipCredentials: (payload: ImportAfipCredentialsPayload) =>
    request<{ message: string; status: AfipConfigStatus }>("/integrations/afip/credentials", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  saveAfipPrivateKey: (payload: SaveAfipPrivateKeyPayload) =>
    request<{ message: string; status: AfipConfigStatus }>("/integrations/afip/private-key", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  generateAfipCsr: (payload: GenerateAfipCsrPayload) =>
    request<{ message: string; csr: string; status: AfipConfigStatus }>("/integrations/afip/generate-csr", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  importAfipCertificate: (payload: ImportAfipCertificatePayload) =>
    request<{ message: string; status: AfipConfigStatus }>("/integrations/afip/certificate", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  facturarAfip: (payload: AfipFacturaPayload) =>
    request<{ message: string; result: Record<string, unknown> }>("/integrations/afip/facturar", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getThemeConfig: async () => {
    const theme = await request<ThemeConfig>("/settings/theme");
    return mapThemeConfigFromApi(theme);
  },

  saveThemeConfig: (config: ThemeConfig) =>
    request<ThemeConfig>("/settings/theme", {
      method: "PUT",
      body: JSON.stringify({
        primaryColor: config.primaryColor,
        receiptWidthMm: config.receiptWidthMm ?? 80,
      }),
    }).then((theme) => mapThemeConfigFromApi(theme)),

  uploadThemeLogo: async (file: File) => {
    if (file.size > 2 * 1024 * 1024) {
      throw new Error("El logo no puede superar 2 MB");
    }

    const allowed = ["image/png", "image/jpeg", "image/webp"];
    if (!allowed.includes(file.type)) {
      throw new Error("Formato no permitido. Use PNG, JPEG o WebP.");
    }

    const formData = new FormData();
    formData.append("file", file);

    const token = getAuthToken();
    const response = await fetch(`${DEFAULT_BASE_URL}/settings/theme/logo`, {
      method: "POST",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });

    const data = (await response.json().catch(() => ({}))) as ThemeConfig & { message?: string | string[] };
    if (!response.ok) {
      const message = Array.isArray(data.message) ? data.message.join(", ") : data.message;
      throw new Error(message ?? `Request failed (${response.status})`);
    }

    return mapThemeConfigFromApi(data);
  },

  deleteThemeLogo: () =>
    request<ThemeConfig>("/settings/theme/logo", {
      method: "DELETE",
    }).then((theme) => mapThemeConfigFromApi(theme)),

  getLicenseStatus: () => request<LicenseStatusResponse>("/license/status"),

  getMachineId: () => request<MachineIdResponse>("/license/machine-id"),

  activateLicense: (licenseKey: string) =>
    request<LicenseActivationResponse>("/license/activate", {
      method: "POST",
      body: JSON.stringify({ licenseKey }),
    }),

  supportRecoveryUnlock: (recoveryKey: string) =>
    request<SupportRecoveryUnlockResponse>("/support/recovery/unlock", {
      method: "POST",
      headers: { "X-Support-Recovery-Key": recoveryKey },
    }),

  supportRecoveryDiagnostics: (recoveryToken: string) =>
    request<SupportRecoveryDiagnostics>("/support/recovery/diagnostics", {
      headers: { "X-Support-Recovery-Token": recoveryToken },
    }),

  supportRecoveryExportJson: (recoveryToken: string) =>
    request<Record<string, unknown>>("/support/recovery/export", {
      headers: { "X-Support-Recovery-Token": recoveryToken },
    }),

  getParcels: () => request<Parcel[]>("/parcels"),

  createParcel: (parcel: Parcel) =>
    request<Parcel>("/parcels", {
      method: "POST",
      body: JSON.stringify(parcel),
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
