import { toast } from "sonner";
import { isElectronEnvironment, printReceiptElectron, printReceiptInBrowser } from "./desktop-api";
import { normalizeProduct } from "./product-categories";
import { buildReceiptHtml } from "./receipt-template";
import { resolveReceiptLogoUrl } from "./theme-logo";
declare global {
  interface Window {
    go?: {
      main?: {
        App?: {
          PrintReceipt: (data: string) => Promise<void>;
          GetProducts: () => Promise<Product[]>;
          SaveTransaction: (transaction: Transaction) => Promise<void>;
          GetParcels: () => Promise<Parcel[]>;
          SaveParcel: (parcel: Parcel) => Promise<void>;
          OpenCashDrawer: () => Promise<void>;
          GetCashSession: () => Promise<CashSession | null>;
          StartCashSession: (initialBalance: number) => Promise<void>;
          CloseCashSession: (finalBalance: number, countedAmount: number) => Promise<void>;
          GetThemeConfig: () => Promise<ThemeConfig>;
          SaveThemeConfig: (config: ThemeConfig) => Promise<void>;
          UploadLogo: (base64Image: string) => Promise<string>;
        };
      };
    };
  }
}

export interface Product {
  id: string;
  name: string;
  price: number;
  cost?: number;
  categories: string[];
  stock?: number;
  minStock?: number;
  image?: string;
  barcodes?: string[];
  unit?: "unidad" | "gramos" | "kilogramos" | "litros" | "mililitros";
  quantity?: number;
}

export interface CartItem extends Product {
  quantity: number;
}

export interface Transaction {
  id: string;
  items: CartItem[];
  total: number;
  timestamp: string;
}

export interface Parcel {
  id: string;
  customerName: string;
  description: string;
  amount: number;
  status: "pending" | "picked-up" | "returned";
  date: string;
}

export interface CashSession {
  id: string;
  startTime: string;
  endTime?: string;
  initialBalance: number;
  finalBalance?: number;
  totalSales: number;
  salesByPaymentMethod?: {
    cash: number;
    card: number;
    transfer: number;
    qr: number;
  };
}

export interface PaymentMethod {
  type: "cash" | "card" | "transfer" | "qr";
  amount: number;
  label: string;
}

export interface ThemeConfig {
  primaryColor: string;
  logoUrl?: string;
  receiptWidthMm?: 55 | 80;
}

export type PrintReceiptOptions = {
  businessName?: string;
  logoUrl?: string;
  receiptWidthMm?: 55 | 80;
};

const isWailsEnvironment = (): boolean => {
  return typeof window !== "undefined" && !!window.go?.main?.App;
};

// Mock cash session storage for demo mode
let mockCashSession: CashSession | null = null;

const mockProducts: Product[] = [
  { id: "1", name: "Café Espresso", price: 2.5, cost: 1.2, categories: ["Cafetería", "Bebidas"], stock: 50, minStock: 10, unit: "unidad" },
  { id: "2", name: "Capuchino", price: 3.5, cost: 1.8, categories: ["Cafetería", "Bebidas"], stock: 45, minStock: 10, unit: "unidad" },
  { id: "3", name: "Café con Leche", price: 4.0, cost: 2.0, categories: ["Cafetería"], stock: 40, minStock: 10, unit: "unidad" },
  { id: "4", name: "Café Americano", price: 2.8, cost: 1.5, categories: ["Cafetería", "Bebidas"], stock: 55, minStock: 10, unit: "unidad" },
  { id: "5", name: "Croissant", price: 3.0, cost: 1.5, categories: ["Panadería", "Comida"], stock: 25, minStock: 5, unit: "unidad" },
  { id: "6", name: "Muffin", price: 2.5, cost: 1.2, categories: ["Panadería", "Snacks"], stock: 30, minStock: 5, unit: "unidad" },
  { id: "7", name: "Galleta", price: 1.5, cost: 0.7, categories: ["Panadería", "Snacks"], stock: 8, minStock: 10, unit: "unidad" },
  { id: "8", name: "Jugo de Naranja", price: 3.5, cost: 1.5, categories: ["Bebidas"], stock: 35, minStock: 10, unit: "unidad" },
  { id: "9", name: "Agua Mineral", price: 1.0, cost: 0.5, categories: ["Bebidas"], stock: 60, minStock: 15, unit: "unidad" },
  { id: "10", name: "Sándwich", price: 6.5, cost: 3.0, categories: ["Comida"], stock: 20, minStock: 5, unit: "unidad" },
  { id: "11", name: "Jamón", price: 12.5, cost: 8.0, categories: ["Fiambrería", "Comida"], stock: 15, minStock: 3, unit: "kilogramos", barcodes: ["7891234567890"] },
  { id: "12", name: "Queso", price: 15.0, cost: 10.0, categories: ["Fiambrería"], stock: 10, minStock: 2, unit: "kilogramos", barcodes: ["7891234567891"] },
  { id: "13", name: "Salame", price: 18.0, cost: 12.0, categories: ["Fiambrería"], stock: 8, minStock: 2, unit: "kilogramos", barcodes: ["7891234567892"] },
];

let mockProductsStore: Product[] = mockProducts.map((product) => normalizeProduct(product));

const mockParcels: Parcel[] = [
  {
    id: "1",
    customerName: "Juan Pérez",
    description: "Entrega de paquete",
    amount: 25.0,
    status: "pending",
    date: "2026-05-23",
  },
  {
    id: "2",
    customerName: "María García",
    description: "Pedido especial",
    amount: 50.0,
    status: "picked-up",
    date: "2026-05-22",
  },
];

export const WailsAPI = {
  async printReceipt(
    cartItems: CartItem[],
    total: number,
    printOptions: PrintReceiptOptions = {},
  ): Promise<void> {
    const widthMm = printOptions.receiptWidthMm ?? 80;
    const html = buildReceiptHtml(
      cartItems.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price,
      })),
      total,
      {
        widthMm,
        businessName: printOptions.businessName ?? "Sistema Punto de Venta",
        logoUrl: resolveReceiptLogoUrl(printOptions.logoUrl),
      },
    );

    if (isWailsEnvironment()) {
      const data = JSON.stringify({ html, widthMm });
      await window.go!.main!.App!.PrintReceipt(data);
      return;
    }

    if (isElectronEnvironment()) {
      await printReceiptElectron(html, widthMm);
      return;
    }

    try {
      printReceiptInBrowser(html);
    } catch (error) {
      toast.error("No se pudo abrir el diálogo de impresión");
      console.error("Browser print fallback:", error, { items: cartItems, total });
    }
  },

  async getProducts(): Promise<Product[]> {
    if (isWailsEnvironment()) {
      const products = await window.go!.main!.App!.GetProducts();
      return products.map((product) => normalizeProduct(product));
    }
    return new Promise((resolve) => {
      setTimeout(() => resolve([...mockProductsStore]), 100);
    });
  },

  async saveProduct(product: Product): Promise<Product> {
    const normalized = normalizeProduct(product);
    if (isWailsEnvironment()) {
      // Desktop persistence is handled by the Electron shell (not yet exposed).
      const index = mockProductsStore.findIndex((item) => item.id === normalized.id);
      if (index >= 0) {
        mockProductsStore[index] = normalized;
      } else {
        mockProductsStore.push(normalized);
      }
      return normalized;
    }
    const index = mockProductsStore.findIndex((item) => item.id === normalized.id);
    if (index >= 0) {
      mockProductsStore[index] = normalized;
    } else {
      mockProductsStore.push(normalized);
    }
    return normalized;
  },

  async deleteProduct(productId: string): Promise<void> {
    if (isWailsEnvironment()) {
      mockProductsStore = mockProductsStore.filter((item) => item.id !== productId);
      return;
    }
    mockProductsStore = mockProductsStore.filter((item) => item.id !== productId);
  },

  async replaceProducts(products: Product[]): Promise<Product[]> {
    const normalized = products.map((product) => normalizeProduct(product));
    mockProductsStore = normalized;
    return [...mockProductsStore];
  },

  async saveTransaction(transaction: Transaction): Promise<void> {
    if (isWailsEnvironment()) {
      await window.go!.main!.App!.SaveTransaction(transaction);
    } else {
      // Update mock cash session total sales
      if (mockCashSession && !mockCashSession.endTime) {
        mockCashSession = {
          ...mockCashSession,
          totalSales: mockCashSession.totalSales + transaction.total,
        };
      }
      toast.success("Transacción guardada (modo demostración)");
      console.log("Mock transaction:", transaction);
    }
  },

  async getParcels(): Promise<Parcel[]> {
    if (isWailsEnvironment()) {
      return await window.go!.main!.App!.GetParcels();
    } else {
      return new Promise((resolve) => {
        setTimeout(() => resolve(mockParcels), 100);
      });
    }
  },

  async saveParcel(parcel: Parcel): Promise<void> {
    if (isWailsEnvironment()) {
      await window.go!.main!.App!.SaveParcel(parcel);
    } else {
      toast.success("Encomienda guardada (modo demostración)");
      console.log("Mock parcel:", parcel);
    }
  },

  async openCashDrawer(): Promise<void> {
    if (isWailsEnvironment()) {
      await window.go!.main!.App!.OpenCashDrawer();
    } else {
      toast.success("Cajón abierto (modo demostración)");
    }
  },

  async getCashSession(): Promise<CashSession | null> {
    if (isWailsEnvironment()) {
      return await window.go!.main!.App!.GetCashSession();
    } else {
      return mockCashSession;
    }
  },

  async startCashSession(initialBalance: number): Promise<void> {
    if (isWailsEnvironment()) {
      await window.go!.main!.App!.StartCashSession(initialBalance);
    } else {
      mockCashSession = {
        id: Date.now().toString(),
        startTime: new Date().toISOString(),
        initialBalance,
        totalSales: 0,
      };
      toast.success(`Sesión iniciada con $${initialBalance.toFixed(2)} (modo demostración)`);
    }
  },

  async closeCashSession(finalBalance: number, countedAmount: number): Promise<void> {
    if (isWailsEnvironment()) {
      await window.go!.main!.App!.CloseCashSession(finalBalance, countedAmount);
    } else {
      if (mockCashSession) {
        mockCashSession = {
          ...mockCashSession,
          endTime: new Date().toISOString(),
          finalBalance: countedAmount,
        };
      }
      toast.success(`Sesión cerrada con $${countedAmount.toFixed(2)} (modo demostración)`);
    }
  },

  async getThemeConfig(): Promise<ThemeConfig> {
    if (isWailsEnvironment()) {
      return await window.go!.main!.App!.GetThemeConfig();
    } else {
      return {
        primaryColor: "#030213",
        receiptWidthMm: 80,
      };
    }
  },

  async saveThemeConfig(config: ThemeConfig): Promise<void> {
    if (isWailsEnvironment()) {
      await window.go!.main!.App!.SaveThemeConfig(config);
    } else {
      toast.success("Configuración de tema guardada (modo demostración)");
    }
  },

  async uploadLogo(base64Image: string): Promise<string> {
    if (isWailsEnvironment()) {
      return await window.go!.main!.App!.UploadLogo(base64Image);
    } else {
      toast.success("Logo cargado (modo demostración)");
      return base64Image;
    }
  },
};
