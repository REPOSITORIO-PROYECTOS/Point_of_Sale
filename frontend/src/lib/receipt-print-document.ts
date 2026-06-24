import type { ReceiptAfip, ReceiptEmisor, ReceiptReceptor } from "./receipt-templates/types";
import type {
  ReceiptAdjustment,
  ReceiptLineItem,
  ReceiptPaymentLine,
  ReceiptVoucherType,
  ReceiptWidthMm,
} from "./receipt-template";

export type ReceiptPrintLineItem = {
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type ReceiptPrintDocument = {
  widthMm: ReceiptWidthMm;
  voucherType: ReceiptVoucherType | "movimiento_ingreso" | "movimiento_egreso";
  emisor: ReceiptEmisor;
  receptor?: ReceiptReceptor;
  items: ReceiptPrintLineItem[];
  subtotal: number;
  total: number;
  adjustments?: ReceiptAdjustment[];
  payments?: ReceiptPaymentLine[];
  ticketId?: string;
  timestamp?: string;
  afip?: ReceiptAfip;
  mostrarDesgloseIva?: boolean;
  observaciones?: string;
  /** ingreso / egreso de caja */
  movement?: {
    concepto: string;
    metodoPagoLabel: string;
    operador: string;
    idMovimiento: string | number;
    idSesion: string | number;
  };
};

export function buildReceiptPrintDocument(input: {
  widthMm?: ReceiptWidthMm;
  voucherType?: ReceiptPrintDocument["voucherType"];
  businessName?: string;
  emisor?: Partial<ReceiptEmisor>;
  receptor?: Partial<ReceiptReceptor>;
  items: ReceiptLineItem[];
  total: number;
  subtotal?: number;
  adjustments?: ReceiptAdjustment[];
  payments?: ReceiptPaymentLine[];
  ticketId?: string;
  timestamp?: Date | string;
  afip?: Partial<ReceiptAfip>;
  mostrarDesgloseIva?: boolean;
  observaciones?: string;
  movement?: ReceiptPrintDocument["movement"];
}): ReceiptPrintDocument {
  const widthMm = input.widthMm === 55 ? 55 : 80;
  const items = input.items.map((item) => ({
    name: item.name,
    quantity: item.quantity,
    unitPrice: item.price,
    lineTotal: item.price * item.quantity,
  }));
  const subtotal = input.subtotal ?? items.reduce((sum, item) => sum + item.lineTotal, 0);

  return {
    widthMm,
    voucherType: input.voucherType ?? "comprobante",
    emisor: {
      razonSocial: input.emisor?.razonSocial ?? input.businessName ?? "Point of Sale",
      cuit: input.emisor?.cuit,
      domicilio: input.emisor?.domicilio,
      condicionIva: input.emisor?.condicionIva,
      ingresosBrutos: input.emisor?.ingresosBrutos,
      inicioActividades: input.emisor?.inicioActividades,
      puntoVenta: input.emisor?.puntoVenta,
    },
    receptor: input.receptor,
    items,
    subtotal,
    total: input.total,
    adjustments: input.adjustments,
    payments: input.payments,
    ticketId: input.ticketId,
    timestamp:
      typeof input.timestamp === "string"
        ? input.timestamp
        : (input.timestamp ?? new Date()).toISOString(),
    afip: input.afip,
    mostrarDesgloseIva: input.mostrarDesgloseIva,
    observaciones: input.observaciones,
    movement: input.movement,
  };
}

/** Columnas útiles en modo texto ESC/POS (Epson). */
export function escposColumnsForWidth(widthMm: ReceiptWidthMm): number {
  return widthMm === 55 ? 32 : 48;
}
