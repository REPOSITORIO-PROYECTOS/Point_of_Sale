import { toast } from "sonner";
import { isElectronEnvironment } from "./desktop-api";
import { printReceipt as dispatchPrintReceipt, previewReceipt, type PrintReceiptPayload } from "./print-receipt";
import { type ReceiptVoucherType, type ReceiptWidthMm } from "./receipt-template";

declare global {
  interface Window {
    go?: {
      main?: {
        App?: {
          PrintReceipt: (data: string) => Promise<void>;
          OpenCashDrawer: () => Promise<void>;
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
  countedAmount?: number;
  totalSales: number;
  salesByPaymentMethod?: {
    cash: number;
    card: number;
    transfer: number;
    qr: number;
  };
  movementTotals?: {
    incomeTotal: number;
    expenseTotal: number;
    netTotal: number;
    cashIncome: number;
    cashExpense: number;
    cashNet: number;
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
  customLogoUrl?: string;
  receiptWidthMm?: 55 | 80;
}

export type PrintReceiptOptions = {
  businessName?: string;
  logoUrl?: string;
  receiptWidthMm?: ReceiptWidthMm;
  ticketId?: string;
  voucherType?: ReceiptVoucherType;
  payments?: PaymentMethod[];
  adjustments?: Array<{ type: "charge" | "discount"; label: string; amount: number; isPercentage?: boolean }>;
  subtotal?: number;
  afipCae?: string;
  emisor?: Partial<import("./receipt-template").ReceiptEmisor>;
  receptor?: Partial<import("./receipt-template").ReceiptReceptor>;
  afip?: Partial<import("./receipt-template").ReceiptAfip>;
  mostrarDesgloseIva?: boolean;
  observaciones?: string;
  previewOnly?: boolean;
};

const isWailsEnvironment = (): boolean => {
  return typeof window !== "undefined" && !!window.go?.main?.App;
};

function requireWailsApp() {
  if (!isWailsEnvironment()) {
    throw new Error("Función disponible solo en entorno Wails");
  }
  return window.go!.main!.App!;
}

/** Capa de hardware local: impresión y cajón. Datos de negocio → PosAPI. */
export const WailsAPI = {
  async printReceipt(
    cartItems: CartItem[],
    total: number,
    printOptions: PrintReceiptOptions = {},
  ): Promise<void> {
    const payload: PrintReceiptPayload = {
      items: cartItems.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        unit: item.unit,
      })),
      total,
      subtotal: printOptions.subtotal,
      adjustments: printOptions.adjustments,
      payments: printOptions.payments?.map((payment) => ({
        type: payment.type,
        amount: payment.amount,
        label: payment.label,
      })),
      ticketId: printOptions.ticketId,
      voucherType: printOptions.voucherType,
      businessName: printOptions.businessName,
      logoUrl: printOptions.logoUrl,
      receiptWidthMm: printOptions.receiptWidthMm,
      afipCae: printOptions.afipCae,
      emisor: printOptions.emisor,
      receptor: printOptions.receptor,
      afip: printOptions.afip,
      mostrarDesgloseIva: printOptions.mostrarDesgloseIva,
      observaciones: printOptions.observaciones,
      previewOnly: printOptions.previewOnly,
    };

    try {
      await dispatchPrintReceipt(payload);
    } catch (error) {
      toast.error("No se pudo imprimir el ticket");
      console.error("Print receipt failed:", error);
      throw error;
    }
  },

  previewReceipt(
    cartItems: CartItem[],
    total: number,
    printOptions: PrintReceiptOptions = {},
  ): void {
    previewReceipt({
      items: cartItems.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        unit: item.unit,
      })),
      total,
      subtotal: printOptions.subtotal,
      adjustments: printOptions.adjustments,
      payments: printOptions.payments?.map((payment) => ({
        type: payment.type,
        amount: payment.amount,
        label: payment.label,
      })),
      ticketId: printOptions.ticketId,
      voucherType: printOptions.voucherType,
      businessName: printOptions.businessName,
      logoUrl: printOptions.logoUrl,
      receiptWidthMm: printOptions.receiptWidthMm,
      previewOnly: true,
    });
  },

  async printMovementVoucher(
    movement: {
      type: "income" | "expense";
      amount: number;
      description: string;
      paymentMethod: string;
      timestamp: string;
      movementId?: string | number;
      sessionId?: string | number;
    },
    options: { businessName?: string; receiptWidthMm?: ReceiptWidthMm; operatorName?: string } = {},
  ): Promise<void> {
    const widthMm = options.receiptWidthMm ?? 80;
    const methodLabels: Record<string, string> = {
      cash: "Efectivo",
      card: "Tarjeta",
      transfer: "Transferencia",
      qr: "QR",
    };

    await dispatchPrintReceipt({
      items: [],
      total: movement.amount,
      subtotal: movement.amount,
      receiptWidthMm: widthMm,
      businessName: options.businessName,
      voucherType: movement.type === "income" ? "movimiento_ingreso" : "movimiento_egreso",
      timestamp: movement.timestamp,
      movement: {
        concepto: movement.description,
        metodoPagoLabel: methodLabels[movement.paymentMethod] ?? movement.paymentMethod,
        operador: options.operatorName ?? "Operador",
        idMovimiento: movement.movementId ?? Date.now(),
        idSesion: movement.sessionId ?? "—",
      },
    });
  },

  async openCashDrawer(): Promise<void> {
    if (isWailsEnvironment()) {
      await requireWailsApp().OpenCashDrawer();
      return;
    }

    if (isElectronEnvironment()) {
      toast.info("Apertura de cajón no configurada en Electron");
      return;
    }

    toast.info("Cajón de dinero: requiere hardware conectado");
  },

  async getThemeConfig(): Promise<ThemeConfig> {
    return requireWailsApp().GetThemeConfig();
  },

  async saveThemeConfig(config: ThemeConfig): Promise<void> {
    await requireWailsApp().SaveThemeConfig(config);
  },

  async uploadLogo(base64Image: string): Promise<string> {
    return requireWailsApp().UploadLogo(base64Image);
  },
};
