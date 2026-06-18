import type { CashSession, PaymentMethod, Product, ThemeConfig, Transaction } from "./wails-bridge";
import { normalizeProduct } from "./product-categories";
import { resolveThemeLogoUrl } from "./theme-logo";

const DEFAULT_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";
const AUTH_TOKEN_KEY = "pos.auth.token";

export type UserRole = "admin" | "cashier";

export type AuthUser = {
  id: string;
  username: string;
  role: UserRole;
};

export type LoginResponse = {
  accessToken: string;
  user: AuthUser;
};

function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(AUTH_TOKEN_KEY);
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
  login: (username: string, password: string) =>
    request<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),

  getMe: () => request<AuthUser>("/auth/me"),

  getUsers: () =>
    request<Array<AuthUser & { isActive: boolean; createdAt: string }>>("/users"),

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

  getCashSession: () => request<CashSession | null>("/cash/session"),

  startCashSession: (initialBalance: number) =>
    request<CashSession>("/cash/session/start", {
      method: "POST",
      body: JSON.stringify({ initialBalance }),
    }),

  closeCashSession: (expectedBalance: number, countedAmount: number) =>
    request<CashSession>("/cash/session/close", {
      method: "POST",
      body: JSON.stringify({ expectedBalance, countedAmount }),
    }),

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
    return {
      ...theme,
      ...(theme.logoUrl ? { logoUrl: resolveThemeLogoUrl(theme.logoUrl) } : {}),
    };
  },

  saveThemeConfig: (config: ThemeConfig) =>
    request<ThemeConfig>("/settings/theme", {
      method: "PUT",
      body: JSON.stringify({
        primaryColor: config.primaryColor,
        receiptWidthMm: config.receiptWidthMm ?? 80,
      }),
    }).then((theme) => ({
      ...theme,
      ...(theme.logoUrl ? { logoUrl: resolveThemeLogoUrl(theme.logoUrl) } : {}),
    })),

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

    const response = await fetch(`${DEFAULT_BASE_URL}/settings/theme/logo`, {
      method: "POST",
      body: formData,
    });

    const data = (await response.json().catch(() => ({}))) as ThemeConfig & { message?: string | string[] };
    if (!response.ok) {
      const message = Array.isArray(data.message) ? data.message.join(", ") : data.message;
      throw new Error(message ?? `Request failed (${response.status})`);
    }

    return {
      ...data,
      ...(data.logoUrl ? { logoUrl: resolveThemeLogoUrl(data.logoUrl) } : {}),
    };
  },

  deleteThemeLogo: () =>
    request<ThemeConfig>("/settings/theme/logo", {
      method: "DELETE",
    }).then((theme) => ({
      ...theme,
      ...(theme.logoUrl ? { logoUrl: resolveThemeLogoUrl(theme.logoUrl) } : {}),
    })),
};

export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("Could not read file"));
    reader.readAsText(file);
  });
}
