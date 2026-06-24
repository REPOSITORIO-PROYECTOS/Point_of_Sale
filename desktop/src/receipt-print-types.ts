/** Payload JSON para impresión ESC/POS (texto/binario). Espejo de frontend/src/lib/receipt-print-document.ts */

export type ReceiptWidthMm = 55 | 80;

export type ReceiptPrintLineItem = {
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type ReceiptPrintDocument = {
  widthMm: ReceiptWidthMm;
  voucherType:
    | 'factura'
    | 'comprobante'
    | 'presupuesto'
    | 'movimiento_ingreso'
    | 'movimiento_egreso';
  emisor: {
    razonSocial: string;
    cuit?: string;
    domicilio?: string;
    condicionIva?: string;
    ingresosBrutos?: string;
    inicioActividades?: string;
    puntoVenta?: number;
  };
  receptor?: {
    nombreRazonSocial?: string;
    cuitODni?: string;
    condicionIva?: string;
    domicilio?: string;
  };
  items: ReceiptPrintLineItem[];
  subtotal: number;
  total: number;
  adjustments?: Array<{
    type: 'charge' | 'discount';
    label: string;
    amount: number;
    isPercentage?: boolean;
  }>;
  payments?: Array<{
    type: string;
    amount: number;
    label?: string;
  }>;
  ticketId?: string;
  timestamp?: string;
  afip?: {
    tipoAfip?: number;
    tipoComprobanteNombre?: string;
    tipoComprobanteLetra?: string;
    numeroComprobante?: number;
    cae?: string;
    vencimientoCae?: string;
    neto?: number;
    iva?: number;
    ivaRateLabel?: string;
  };
  mostrarDesgloseIva?: boolean;
  observaciones?: string;
  movement?: {
    concepto: string;
    metodoPagoLabel: string;
    operador: string;
    idMovimiento: string | number;
    idSesion: string | number;
  };
};

export type PrinterType = 'epson' | 'star' | 'tanca' | 'daruma' | 'brother' | 'custom';

export type PrinterPrintOptions = {
  printerName?: string | null;
  printMode?: 'escpos' | 'html';
  printSilent?: boolean;
  printerType?: PrinterType;
  fallbackHtml?: boolean;
};

export type ElectronPrintPayload = {
  widthMm: ReceiptWidthMm;
  document?: ReceiptPrintDocument;
  html?: string;
  printer?: PrinterPrintOptions;
};

export function escposColumnsForWidth(widthMm: ReceiptWidthMm): number {
  return widthMm === 55 ? 32 : 48;
}
