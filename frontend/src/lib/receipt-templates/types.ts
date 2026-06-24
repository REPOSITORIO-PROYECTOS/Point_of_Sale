export type ReceiptWidthMm = 55 | 80;

export type ReceiptVoucherType = "factura" | "comprobante" | "presupuesto";

export type ReceiptLineItem = {
  name: string;
  quantity: number;
  price: number;
  unit?: string;
};

export type ReceiptAdjustment = {
  type: "charge" | "discount";
  label: string;
  amount: number;
  isPercentage?: boolean;
};

export type ReceiptPaymentLine = {
  type: string;
  amount: number;
  label?: string;
};

export type ReceiptEmisor = {
  razonSocial: string;
  cuit?: string;
  domicilio?: string;
  ingresosBrutos?: string;
  inicioActividades?: string;
  condicionIva?: string;
  puntoVenta?: number;
  logoUrl?: string;
};

export type ReceiptReceptor = {
  nombreRazonSocial?: string;
  cuitODni?: string;
  condicionIva?: string;
  domicilio?: string;
};

export type ReceiptAfip = {
  tipoAfip?: number;
  tipoComprobanteNombre?: string;
  tipoComprobanteLetra?: string;
  numeroComprobante?: number;
  cae?: string;
  vencimientoCae?: string;
  neto?: number;
  iva?: number;
  ivaRateLabel?: string;
  qrBase64?: string;
};

export type ReceiptBuildContext = {
  items: ReceiptLineItem[];
  total: number;
  subtotal?: number;
  widthMm?: ReceiptWidthMm;
  voucherType?: ReceiptVoucherType;
  adjustments?: ReceiptAdjustment[];
  payments?: ReceiptPaymentLine[];
  ticketId?: string;
  timestamp?: Date;
  emisor?: ReceiptEmisor;
  receptor?: ReceiptReceptor;
  afip?: ReceiptAfip;
  observaciones?: string;
  mostrarDesgloseIva?: boolean;
};

export type ReceiptTemplateOptions = {
  widthMm?: ReceiptWidthMm;
  storeName?: string;
  businessName?: string;
  logoUrl?: string;
  timestamp?: Date;
  ticketId?: string;
  voucherType?: ReceiptVoucherType;
  payments?: ReceiptPaymentLine[];
  adjustments?: ReceiptAdjustment[];
  subtotal?: number;
  afipCae?: string;
  footerNote?: string;
  emisor?: Partial<ReceiptEmisor>;
  receptor?: Partial<ReceiptReceptor>;
  afip?: Partial<ReceiptAfip>;
  observaciones?: string;
  mostrarDesgloseIva?: boolean;
};

export type EgresoReceiptData = {
  nombreNegocio: string;
  fechaHora: Date;
  nombreUsuario: string;
  metodoPagoLabel: string;
  concepto: string;
  monto: number;
  idMovimiento: string | number;
  idSesion: string | number;
};

export type CierreLoteReceiptData = {
  empresa: { nombreFantasia: string; cuit: string };
  sesion: {
    id: string | number;
    fechaApertura: Date;
    fechaCierre: Date;
    saldoInicial: number;
    saldoFinalCalculado: number;
    saldoFinalDeclarado: number;
    diferencia: number;
  };
  usuarioApertura: string;
  usuarioCierre: string;
  totales: {
    ventas: number;
    propinas?: number;
    ingresos: number;
    egresos: number;
    egresosEfectivo?: number;
    egresosBuzon?: number;
    egresosTransferencia?: number;
  };
  desgloseMetodosPago: {
    efectivo: number;
    transferencia: number;
    bancario: number;
  };
  desgloseIngresos?: Array<{ concepto: string; monto: number }>;
  desgloseEgresos?: Array<{ concepto: string; monto: number; metodoPagoLabel?: string }>;
  arqueoEfectivo?: {
    saldoInicial: number;
    ventasEfectivo: number;
    ingresosEfectivo: number;
    egresosEfectivo: number;
    egresosBuzon: number;
    referenciaEnCajon: number;
  };
  fechaEmision?: Date;
};
