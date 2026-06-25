import {
  escposColumnsForWidth,
  type PrinterPrintOptions,
  type ReceiptPrintDocument,
} from './receipt-print-types';
import { renderReceiptPrintText } from './receipt-print-text';

type ThermalPrinterModule = typeof import('node-thermal-printer');

let thermalPrinterModule: ThermalPrinterModule | null = null;

async function loadThermalPrinter(): Promise<ThermalPrinterModule> {
  if (!thermalPrinterModule) {
    thermalPrinterModule = await import('node-thermal-printer');
  }
  return thermalPrinterModule;
}

function resolvePrinterInterface(options?: PrinterPrintOptions): string {
  const configured = process.env.POS_PRINTER_INTERFACE?.trim();
  if (configured) {
    return configured;
  }

  const name = options?.printerName?.trim() || process.env.POS_PRINTER_NAME?.trim();
  if (name) {
    return name.startsWith('printer:') ? name : `printer:${name}`;
  }

  return 'printer:';
}

function resolvePrinterType(
  options: PrinterPrintOptions | undefined,
  PrinterTypes: ThermalPrinterModule['PrinterTypes'],
): ThermalPrinterModule['PrinterTypes'][keyof ThermalPrinterModule['PrinterTypes']] {
  const raw = (options?.printerType ?? process.env.POS_PRINTER_TYPE ?? 'epson').toLowerCase();
  if (raw === 'star') return PrinterTypes.STAR;
  if (raw === 'tanca') return PrinterTypes.TANCA;
  if (raw === 'daruma') return PrinterTypes.DARUMA;
  if (raw === 'brother') return PrinterTypes.BROTHER;
  if (raw === 'custom') return PrinterTypes.CUSTOM;
  return PrinterTypes.EPSON;
}

function formatMoney(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

function formatDate(iso: string | undefined): string {
  const date = iso ? new Date(iso) : new Date();
  return date.toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function padLine(left: string, right: string, width: number): string {
  const maxLeft = Math.max(1, width - right.length - 1);
  const trimmedLeft = left.length > maxLeft ? `${left.slice(0, maxLeft - 1)}…` : left;
  return `${trimmedLeft.padEnd(width - right.length)}${right}`;
}

function dashedLine(width: number): string {
  return '-'.repeat(width);
}

function voucherTitle(voucherType: ReceiptPrintDocument['voucherType']): string {
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

async function createPrinter(
  widthMm: 55 | 80,
  options?: PrinterPrintOptions,
): Promise<{
  printer: InstanceType<ThermalPrinterModule['ThermalPrinter']>;
  interfaceId: string;
  printerType: string;
}> {
  const { CharacterSet, PrinterTypes, ThermalPrinter, BreakLine } = await loadThermalPrinter();
  const interfaceId = resolvePrinterInterface(options);
  const printerType = resolvePrinterType(options, PrinterTypes);

  const printer = new ThermalPrinter({
    type: printerType,
    interface: interfaceId,
    characterSet: CharacterSet.PC858_EURO,
    removeSpecialCharacters: false,
    lineCharacter: '-',
    breakLine: BreakLine.WORD,
    width: escposColumnsForWidth(widthMm),
    options: {
      timeout: Number(process.env.POS_PRINTER_TIMEOUT_MS ?? 10_000),
    },
  });

  let isConnected = false;
  try {
    isConnected = await printer.isPrinterConnected();
  } catch (error) {
    console.warn('[print][escpos] isPrinterConnected falló:', error);
  }

  if (!isConnected) {
    console.warn(
      `[print][escpos] sin confirmación de conexión (${interfaceId}, ${printerType}) — se intentará imprimir igualmente`,
    );
  } else {
    console.info(`[print][escpos] conexión OK (${interfaceId}, ${printerType})`);
  }

  return { printer, interfaceId, printerType };
}

async function executePrintJob(
  printer: InstanceType<ThermalPrinterModule['ThermalPrinter']>,
  interfaceId: string,
  printerType: string,
): Promise<void> {
  try {
    await printer.execute();
    console.info(`[print][escpos] impresión OK (${interfaceId}, ${printerType})`);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(
      `ESC/POS falló (${interfaceId}, ${printerType}): ${detail}. Revise nombre de impresora, cable/USB y driver.`,
    );
  }
}

export async function printEscposDocument(
  document: ReceiptPrintDocument,
  options?: PrinterPrintOptions,
): Promise<void> {
  const cols = escposColumnsForWidth(document.widthMm);
  const { printer, interfaceId, printerType } = await createPrinter(document.widthMm, options);

  console.info(
    `[print][escpos] enviando ticket ${document.voucherType} (${document.widthMm}mm, ${cols} cols)\n${renderReceiptPrintText(document)}`,
  );

  printer.clear();

  printer.alignCenter();
  printer.bold(true);
  printer.println(document.emisor.razonSocial);
  printer.bold(false);

  if (document.emisor.cuit) {
    printer.println(`CUIT: ${document.emisor.cuit}`);
  }
  if (document.emisor.domicilio) {
    printer.println(document.emisor.domicilio);
  }

  printer.drawLine();

  printer.bold(true);
  printer.println(voucherTitle(document.voucherType));
  printer.bold(false);

  if (document.movement) {
    printer.alignLeft();
    printer.println(`Fecha: ${formatDate(document.timestamp)}`);
    printer.println(`Operador: ${document.movement.operador}`);
    printer.println(`Metodo: ${document.movement.metodoPagoLabel}`);
    printer.println(`Concepto: ${document.movement.concepto}`);
    printer.drawLine();
    printer.bold(true);
    printer.println(
      padLine('MONTO:', formatMoney(document.total), cols),
    );
    printer.bold(false);
    printer.drawLine();
    printer.println(`Mov. #${document.movement.idMovimiento} · Sesion ${document.movement.idSesion}`);
    printer.println('Documento no valido como factura');
    printer.cut();
    await executePrintJob(printer, interfaceId, printerType);
    return;
  }

  if (document.voucherType === 'factura' && document.afip) {
    const letra = document.afip.tipoComprobanteLetra ?? 'B';
    printer.println(`${document.afip.tipoComprobanteNombre ?? 'FACTURA'} ${letra}`);
    if (document.emisor.puntoVenta != null && document.afip.numeroComprobante != null) {
      printer.println(
        `P.Venta: ${String(document.emisor.puntoVenta).padStart(5, '0')} - N: ${String(document.afip.numeroComprobante).padStart(8, '0')}`,
      );
    }
  }

  printer.alignLeft();
  printer.println(`Fecha: ${formatDate(document.timestamp)}`);
  if (document.ticketId) {
    printer.println(`Venta ID: #${document.ticketId.slice(-8)}`);
  }

  if (document.receptor) {
    printer.drawLine();
    printer.println(`Cliente: ${document.receptor.nombreRazonSocial ?? 'Consumidor Final'}`);
    printer.println(`CUIT/DNI: ${document.receptor.cuitODni ?? 'S/D'}`);
    if (document.receptor.condicionIva) {
      printer.println(`IVA: ${document.receptor.condicionIva}`);
    }
  }

  printer.drawLine();

  if (document.voucherType === 'factura') {
    printer.println(padLine('Cant Desc', 'Subt', cols));
  }

  for (const item of document.items) {
    if (document.voucherType === 'factura') {
      const desc = `${item.quantity} ${item.name}`.slice(0, cols - 12);
      printer.println(padLine(desc, formatMoney(item.lineTotal), cols));
      printer.println(padLine('', `${item.quantity} x ${formatMoney(item.unitPrice)}`, cols));
    } else {
      printer.println(padLine(item.name, formatMoney(item.lineTotal), cols));
      printer.println(`  ${item.quantity} x ${formatMoney(item.unitPrice)}`);
    }
  }

  printer.drawLine();
  printer.println(padLine('SUBTOTAL', formatMoney(document.subtotal), cols));

  for (const adj of document.adjustments ?? []) {
    const label = adj.type === 'discount' ? `Desc. ${adj.label}` : adj.label;
    const amount = adj.type === 'discount' ? `-${formatMoney(Math.abs(adj.amount))}` : formatMoney(adj.amount);
    printer.println(padLine(label, amount, cols));
  }

  if (document.mostrarDesgloseIva && document.afip?.neto != null && document.afip.iva != null) {
    printer.println(padLine('Neto Gravado', formatMoney(document.afip.neto), cols));
    printer.println(
      padLine(`IVA (${document.afip.ivaRateLabel ?? '21%'})`, formatMoney(document.afip.iva), cols),
    );
  }

  printer.bold(true);
  printer.println(padLine('TOTAL', formatMoney(document.total), cols));
  printer.bold(false);

  if (document.payments && document.payments.length > 0) {
    printer.drawLine();
    printer.println('Forma de pago:');
    for (const payment of document.payments) {
      printer.println(padLine(payment.label ?? payment.type, formatMoney(payment.amount), cols));
    }
  }

  if (document.afip?.cae) {
    printer.drawLine();
    printer.println(`CAE N: ${document.afip.cae}`);
    if (document.afip.vencimientoCae) {
      printer.println(`Vto. CAE: ${document.afip.vencimientoCae}`);
    }
    printer.println('Comprobante Autorizado');
  } else if (document.voucherType === 'comprobante') {
    printer.drawLine();
    printer.bold(true);
    printer.println('COMPROBANTE NO VALIDO COMO FACTURA');
    printer.bold(false);
  } else if (document.voucherType === 'presupuesto') {
    printer.drawLine();
    printer.println('Validez: 15 dias');
    printer.println('Presupuesto sin IVA incluido');
  }

  if (document.observaciones) {
    printer.drawLine();
    printer.println(`Obs: ${document.observaciones}`);
  }

  printer.drawLine();
  printer.alignCenter();
  printer.println('Gracias por su compra');
  printer.newLine();
  printer.cut();

  await executePrintJob(printer, interfaceId, printerType);
}

export function shouldUseEscposPrint(options?: PrinterPrintOptions): boolean {
  const mode = options?.printMode ?? process.env.POS_PRINT_MODE ?? 'escpos';
  return mode.toLowerCase() !== 'html';
}

export function shouldAllowHtmlFallback(options?: PrinterPrintOptions): boolean {
  if (options?.fallbackHtml !== undefined) {
    return options.fallbackHtml;
  }
  return process.env.POS_PRINT_FALLBACK_HTML !== 'false';
}

export function resolvePrintSilent(options?: PrinterPrintOptions): boolean {
  if (options?.printSilent !== undefined) {
    return options.printSilent;
  }
  if (process.env.POS_PRINT_SILENT === 'true') {
    return true;
  }
  if (process.env.POS_PRINT_SILENT === 'false') {
    return false;
  }
  return true;
}

export function resolvePrintDeviceName(options?: PrinterPrintOptions): string | undefined {
  const name = options?.printerName?.trim() || process.env.POS_PRINTER_NAME?.trim();
  return name || undefined;
}
