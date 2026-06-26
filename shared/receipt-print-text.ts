/** Fuente única del renderizado texto/ESC/POS (frontend + desktop). */

export type ReceiptPrintWidthMm = 55 | 80;

export type ReceiptPrintLineItem = {
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type ReceiptPrintDocument = {
  widthMm: ReceiptPrintWidthMm;
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

export function escposColumnsForWidth(widthMm: ReceiptPrintWidthMm): number {
  return widthMm === 55 ? 32 : 48;
}

function formatPrintMoney(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

function formatPrintDate(iso: string | undefined): string {
  const date = iso ? new Date(iso) : new Date();
  return date.toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function padPrintLine(left: string, right: string, width: number): string {
  const maxLeft = Math.max(1, width - right.length - 1);
  const trimmedLeft = left.length > maxLeft ? `${left.slice(0, maxLeft - 1)}…` : left;
  return `${trimmedLeft.padEnd(width - right.length)}${right}`;
}

function dashedPrintLine(width: number): string {
  return '-'.repeat(width);
}

function voucherPrintTitle(voucherType: ReceiptPrintDocument['voucherType']): string {
  switch (voucherType) {
    case 'factura':
      return 'FACTURA';
    case 'presupuesto':
      return 'PRESUPUESTO';
    case 'movimiento_ingreso':
      return 'COMPROBANTE DE INGRESO';
    case 'movimiento_egreso':
      return 'COMPROBANTE DE EGRESO';
    default:
      return 'RECIBO DE PAGO';
  }
}

export function renderReceiptPrintText(document: ReceiptPrintDocument): string {
  const cols = escposColumnsForWidth(document.widthMm);
  const lines: string[] = [];

  const pushCenter = (text: string) => lines.push(text.trim().toUpperCase());
  const push = (text: string) => lines.push(text);
  const pushBold = (text: string) => lines.push(text.toUpperCase());
  const drawLine = () => lines.push(dashedPrintLine(cols));

  pushCenter(document.emisor.razonSocial);
  if (document.emisor.cuit) {
    push(`CUIT: ${document.emisor.cuit}`);
  }
  if (document.emisor.domicilio) {
    push(document.emisor.domicilio);
  }

  drawLine();
  pushBold(voucherPrintTitle(document.voucherType));

  if (document.movement) {
    push(`Fecha: ${formatPrintDate(document.timestamp)}`);
    push(`Operador: ${document.movement.operador}`);
    push(`Metodo: ${document.movement.metodoPagoLabel}`);
    push(`Concepto: ${document.movement.concepto}`);
    drawLine();
    pushBold(padPrintLine('MONTO:', formatPrintMoney(document.total), cols));
    drawLine();
    push(`Mov. #${document.movement.idMovimiento} · Sesion ${document.movement.idSesion}`);
    push('Documento no valido como factura');
    return lines.join('\n');
  }

  if (document.voucherType === 'factura' && document.afip) {
    const letra = document.afip.tipoComprobanteLetra ?? 'B';
    push(`${document.afip.tipoComprobanteNombre ?? 'FACTURA'} ${letra}`);
    if (document.emisor.puntoVenta != null && document.afip.numeroComprobante != null) {
      push(
        `P.Venta: ${String(document.emisor.puntoVenta).padStart(5, '0')} - N: ${String(document.afip.numeroComprobante).padStart(8, '0')}`,
      );
    }
  }

  push(`Fecha: ${formatPrintDate(document.timestamp)}`);
  if (document.ticketId) {
    push(`Venta ID: #${document.ticketId.slice(-8)}`);
  }

  if (document.receptor) {
    drawLine();
    push(`Cliente: ${document.receptor.nombreRazonSocial ?? 'Consumidor Final'}`);
    push(`CUIT/DNI: ${document.receptor.cuitODni ?? 'S/D'}`);
    if (document.receptor.condicionIva) {
      push(`IVA: ${document.receptor.condicionIva}`);
    }
  }

  drawLine();

  if (document.voucherType === 'factura') {
    push(padPrintLine('Cant Desc', 'Subt', cols));
  }

  for (const item of document.items) {
    if (document.voucherType === 'factura') {
      const desc = `${item.quantity} ${item.name}`.slice(0, cols - 12);
      push(padPrintLine(desc, formatPrintMoney(item.lineTotal), cols));
      push(padPrintLine('', `${item.quantity} x ${formatPrintMoney(item.unitPrice)}`, cols));
    } else {
      push(padPrintLine(item.name, formatPrintMoney(item.lineTotal), cols));
      push(`  ${item.quantity} x ${formatPrintMoney(item.unitPrice)}`);
    }
  }

  drawLine();
  push(padPrintLine('SUBTOTAL', formatPrintMoney(document.subtotal), cols));

  for (const adj of document.adjustments ?? []) {
    const label = adj.type === 'discount' ? `Desc. ${adj.label}` : adj.label;
    const amount =
      adj.type === 'discount'
        ? `-${formatPrintMoney(Math.abs(adj.amount))}`
        : formatPrintMoney(adj.amount);
    push(padPrintLine(label, amount, cols));
  }

  if (document.mostrarDesgloseIva && document.afip?.neto != null && document.afip?.iva != null) {
    push(padPrintLine('Neto Gravado', formatPrintMoney(document.afip.neto), cols));
    push(
      padPrintLine(
        `IVA (${document.afip.ivaRateLabel ?? '21%'})`,
        formatPrintMoney(document.afip.iva),
        cols,
      ),
    );
  }

  pushBold(padPrintLine('TOTAL', formatPrintMoney(document.total), cols));

  if (document.payments && document.payments.length > 0) {
    drawLine();
    push('Forma de pago:');
    for (const payment of document.payments) {
      push(padPrintLine(payment.label ?? payment.type, formatPrintMoney(payment.amount), cols));
    }
  }

  if (document.afip?.cae) {
    drawLine();
    push(`CAE N: ${document.afip.cae}`);
    if (document.afip.vencimientoCae) {
      push(`Vto. CAE: ${document.afip.vencimientoCae}`);
    }
    push('Comprobante Autorizado');
  } else if (document.voucherType === 'comprobante') {
    drawLine();
    pushBold('COMPROBANTE NO VALIDO COMO FACTURA');
  } else if (document.voucherType === 'presupuesto') {
    drawLine();
    push('Validez: 15 dias');
    push('Presupuesto sin IVA incluido');
  }

  if (document.observaciones) {
    drawLine();
    push(`Obs: ${document.observaciones}`);
  }

  drawLine();
  pushCenter('Gracias por su compra');

  return lines.join('\n');
}

export function buildMinimalReceiptHtml(text: string, widthMm: ReceiptPrintWidthMm): string {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const maxWidth = widthMm === 55 ? '280px' : '380px';
  const fontSize = widthMm === 55 ? '11px' : '12px';

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <style>
    @page { margin: 0; size: ${widthMm}mm auto; }
    body { margin: 0; padding: 4mm; font-family: "Courier New", monospace; font-size: ${fontSize}; }
    pre { margin: 0; white-space: pre-wrap; word-break: break-word; max-width: ${maxWidth}; }
  </style>
</head>
<body><pre>${escaped}</pre></body>
</html>`;
}
