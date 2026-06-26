import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { PrinterPrintOptions, ReceiptPrintDocument } from './receipt-print-types';
import { renderReceiptPrintText } from './receipt-print-text';

const execFileAsync = promisify(execFile);

function resolvePrinterName(options?: PrinterPrintOptions): string | undefined {
  const name = options?.printerName?.trim() || process.env.POS_PRINTER_NAME?.trim();
  return name || undefined;
}

function shouldCutPaper(): boolean {
  return process.env.POS_PRINTER_CUT !== 'false';
}

function buildRawPayload(document: ReceiptPrintDocument): Buffer {
  const text = renderReceiptPrintText(document);
  const feed = '\r\n\r\n\r\n';
  const cut = shouldCutPaper() ? '\x1D\x56\x00' : '';
  return Buffer.from(`${text}${feed}${cut}`, 'latin1');
}

async function printViaWindowsSpooler(buffer: Buffer, printerName?: string): Promise<void> {
  if (process.platform !== 'win32') {
    throw new Error('Impresión RAW por spooler solo disponible en Windows');
  }

  const fs = await import('node:fs');
  const os = await import('node:os');
  const path = await import('node:path');

  const tempFile = path.join(os.tmpdir(), `pos-ticket-${Date.now()}.txt`);
  await fs.promises.writeFile(tempFile, buffer);

  try {
    if (printerName) {
      await execFileAsync('print', [`/D:${printerName}`, tempFile], { windowsHide: true });
    } else {
      await execFileAsync('print', [tempFile], { windowsHide: true });
    }
    console.info(`[print][text] spooler OK (${printerName ?? 'predeterminada'})`);
  } finally {
    await fs.promises.unlink(tempFile).catch(() => undefined);
  }
}

async function printViaThermalRaw(buffer: Buffer, options?: PrinterPrintOptions): Promise<void> {
  const thermalPrinterModule = await import('node-thermal-printer');
  const { PrinterTypes, ThermalPrinter } = thermalPrinterModule;

  const name = resolvePrinterName(options);
  const interfaceId = name ? (name.startsWith('printer:') ? name : `printer:${name}`) : 'printer:';

  const printer = new ThermalPrinter({
    type: PrinterTypes.EPSON,
    interface: interfaceId,
    removeSpecialCharacters: false,
    options: {
      timeout: Number(process.env.POS_PRINTER_TIMEOUT_MS ?? 10_000),
    },
  });

  printer.raw(buffer);
  await printer.execute();
  console.info(`[print][text] RAW OK (${interfaceId})`);
}

export async function printRawTextDocument(
  document: ReceiptPrintDocument,
  options?: PrinterPrintOptions,
): Promise<void> {
  const buffer = buildRawPayload(document);
  const printerName = resolvePrinterName(options);

  console.info(
    `[print][text] enviando ticket ${document.voucherType} (${document.widthMm}mm, ${buffer.length} bytes)\n${renderReceiptPrintText(document)}`,
  );

  try {
    await printViaThermalRaw(buffer, options);
  } catch (thermalError) {
    console.warn('[print][text] node-thermal-printer falló, reintentando spooler Windows:', thermalError);
    await printViaWindowsSpooler(buffer, printerName);
  }
}
