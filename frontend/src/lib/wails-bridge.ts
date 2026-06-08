import { toast } from "sonner";

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
  category: string;
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
}

const isWailsEnvironment = (): boolean => {
  return typeof window !== "undefined" && !!window.go?.main?.App;
};

// Mock cash session storage for demo mode
let mockCashSession: CashSession | null = null;

const mockProducts: Product[] = [
  { id: "1", name: "Café Espresso", price: 2.5, cost: 1.2, category: "Cafetería", stock: 50, minStock: 10, unit: "unidad" },
  { id: "2", name: "Capuchino", price: 3.5, cost: 1.8, category: "Cafetería", stock: 45, minStock: 10, unit: "unidad" },
  { id: "3", name: "Café con Leche", price: 4.0, cost: 2.0, category: "Cafetería", stock: 40, minStock: 10, unit: "unidad" },
  { id: "4", name: "Café Americano", price: 2.8, cost: 1.5, category: "Cafetería", stock: 55, minStock: 10, unit: "unidad" },
  { id: "5", name: "Croissant", price: 3.0, cost: 1.5, category: "Panadería", stock: 25, minStock: 5, unit: "unidad" },
  { id: "6", name: "Muffin", price: 2.5, cost: 1.2, category: "Panadería", stock: 30, minStock: 5, unit: "unidad" },
  { id: "7", name: "Galleta", price: 1.5, cost: 0.7, category: "Panadería", stock: 8, minStock: 10, unit: "unidad" },
  { id: "8", name: "Jugo de Naranja", price: 3.5, cost: 1.5, category: "Bebidas", stock: 35, minStock: 10, unit: "unidad" },
  { id: "9", name: "Agua Mineral", price: 1.0, cost: 0.5, category: "Bebidas", stock: 60, minStock: 15, unit: "unidad" },
  { id: "10", name: "Sándwich", price: 6.5, cost: 3.0, category: "Comida", stock: 20, minStock: 5, unit: "unidad" },
  { id: "11", name: "Jamón", price: 12.5, cost: 8.0, category: "Fiambrería", stock: 15, minStock: 3, unit: "kilogramos", barcodes: ["7891234567890"] },
  { id: "12", name: "Queso", price: 15.0, cost: 10.0, category: "Fiambrería", stock: 10, minStock: 2, unit: "kilogramos", barcodes: ["7891234567891"] },
  { id: "13", name: "Salame", price: 18.0, cost: 12.0, category: "Fiambrería", stock: 8, minStock: 2, unit: "kilogramos", barcodes: ["7891234567892"] },
];

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
  async printReceipt(cartItems: CartItem[], total: number): Promise<void> {
    if (isWailsEnvironment()) {
      const data = JSON.stringify({ items: cartItems, total });
      await window.go!.main!.App!.PrintReceipt(data);
    } else {
      toast.success("Recibo impreso (modo demostración)");
      console.log("Mock print:", { items: cartItems, total });
    }
  },

  async getProducts(): Promise<Product[]> {
    if (isWailsEnvironment()) {
      return await window.go!.main!.App!.GetProducts();
    } else {
      return new Promise((resolve) => {
        setTimeout(() => resolve(mockProducts), 100);
      });
    }
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
