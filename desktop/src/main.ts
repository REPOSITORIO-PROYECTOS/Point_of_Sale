import { app, BrowserWindow, ipcMain, Menu, nativeImage } from 'electron';
import { registerDevKeyboardShortcuts } from './dev-shortcuts';
import fs from 'node:fs';
import path from 'node:path';
import { bootstrapLocalServices } from './local-services';
import { POS_PORTS } from './pos-ports';
import { resolveFrontendUrl } from './paths';
import {
  printEscposDocument,
  resolvePrintDeviceName,
  resolvePrintMode,
  resolvePrintSilent,
  shouldAllowHtmlFallback,
} from './escpos-print';
import { printRawTextDocument } from './raw-text-print';
import {
  THERMAL_PAGE_WIDTH_MICRONS,
  cssPixelsToMicrons,
  thermalBrowserWindowWidth,
  type ReceiptWidthMm,
} from './thermal-print';
import type { ElectronPrintPayload, PrinterPrintOptions, ReceiptPrintDocument } from './receipt-print-types';
import { buildMinimalReceiptHtml, renderReceiptPrintText } from './receipt-print-text';
import { setupAutoUpdater } from './auto-updater';
import { registerGracefulQuitHandler } from './app-quit';

type SystemPrinter = {
  name: string;
  isDefault?: boolean;
  status?: number;
};

async function getSystemPrinters(): Promise<SystemPrinter[]> {
  const targetWindow = mainWindow ?? BrowserWindow.getAllWindows()[0];
  if (!targetWindow) {
    return [];
  }

  return (await targetWindow.webContents.getPrintersAsync()) as SystemPrinter[];
}

async function resolveDefaultSystemPrinterName(): Promise<string | undefined> {
  const printers = await getSystemPrinters();
  const defaultPrinter = printers.find((printer) => printer.isDefault);
  return defaultPrinter?.name ?? printers[0]?.name;
}

async function resolveEffectivePrinterOptions(
  options?: PrinterPrintOptions,
): Promise<PrinterPrintOptions> {
  const effective: PrinterPrintOptions = { ...options };

  if (!effective.printerName?.trim()) {
    const defaultName = await resolveDefaultSystemPrinterName();
    if (defaultName) {
      effective.printerName = defaultName;
      console.info(`[print] usando impresora predeterminada: ${defaultName}`);
    }
  }

  if (effective.printSilent === undefined) {
    effective.printSilent = true;
  }

  return effective;
}

function resolvePrintBaseUrl(isDev: boolean, isPackaged: boolean): string {
  if (isDev) {
    const rendererUrl = process.env.ELECTRON_RENDERER_URL ?? `http://localhost:${POS_PORTS.frontend}`;
    return rendererUrl.endsWith('/') ? rendererUrl : `${rendererUrl}/`;
  }

  if (isPackaged) {
    const frontendDir = path.join(process.resourcesPath, 'frontend').replace(/\\/g, '/');
    return `file://${frontendDir}/`;
  }

  const devDist = path.resolve(__dirname, '../../frontend/dist').replace(/\\/g, '/');
  return `file://${devDist}/`;
}

type LoadedPrintWindow = {
  printWindow: BrowserWindow;
  contentHeightPx: number;
};

async function loadReceiptInHiddenWindow(
  html: string,
  widthMm: ReceiptWidthMm,
): Promise<LoadedPrintWindow> {
  const printWindow = new BrowserWindow({
    show: false,
    width: thermalBrowserWindowWidth(widthMm),
    height: 720,
    webPreferences: {
      sandbox: true,
    },
  });

  const baseURLForDataURL = resolvePrintBaseUrl(isDev, app.isPackaged);

  await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`, {
    baseURLForDataURL,
  });

  const contentHeightPx = (await printWindow.webContents.executeJavaScript(
    `new Promise((resolve) => {
      requestAnimationFrame(() => resolve(document.documentElement.scrollHeight));
    })`,
  )) as number;

  return { printWindow, contentHeightPx };
}

/**
 * Impresión térmica vía driver del sistema (58/80 mm).
 * POS_PRINT_SILENT=true → sin diálogo (impresora por defecto).
 * POS_PRINTER_NAME=Nombre → impresora específica.
 */
async function printReceiptHtml(payload: {
  html: string;
  widthMm: ReceiptWidthMm;
  printer?: PrinterPrintOptions;
}) {
  const { printWindow, contentHeightPx } = await loadReceiptInHiddenWindow(payload.html, payload.widthMm);

  const silent = resolvePrintSilent(payload.printer);
  const deviceName = resolvePrintDeviceName(payload.printer);
  const pageWidth = THERMAL_PAGE_WIDTH_MICRONS[payload.widthMm];
  const pageHeight = Math.max(50_000, cssPixelsToMicrons(contentHeightPx));

  await new Promise<void>((resolve, reject) => {
    printWindow.webContents.print(
      {
        silent,
        printBackground: true,
        deviceName,
        margins: { marginType: 'none' },
        pageSize: {
          width: pageWidth,
          height: pageHeight,
        },
      },
      (success, failureReason) => {
        printWindow.close();
        if (!success) {
          reject(new Error(failureReason ?? 'No se pudo imprimir el recibo'));
          return;
        }
        resolve();
      },
    );
  });
}

async function generateReceiptPdfBuffer(payload: {
  html: string;
  widthMm: ReceiptWidthMm;
}): Promise<Buffer> {
  const { printWindow, contentHeightPx } = await loadReceiptInHiddenWindow(payload.html, payload.widthMm);

  try {
    const pageWidth = THERMAL_PAGE_WIDTH_MICRONS[payload.widthMm];
    const pageHeight = Math.max(50_000, cssPixelsToMicrons(contentHeightPx));

    const pdf = await printWindow.webContents.printToPDF({
      printBackground: true,
      margins: { marginType: 'none' },
      pageSize: {
        width: pageWidth / 1000,
        height: pageHeight / 1000,
      },
    });

    return Buffer.from(pdf);
  } finally {
    printWindow.close();
  }
}

async function printByMode(
  mode: ReturnType<typeof resolvePrintMode>,
  payload: ElectronPrintPayload,
  printerOptions: PrinterPrintOptions,
): Promise<void> {
  if (mode === 'escpos' && payload.document) {
    await printEscposDocument(payload.document, printerOptions);
    return;
  }

  if (mode === 'text' && payload.document) {
    await printRawTextDocument(payload.document, printerOptions);
    return;
  }

  if (!payload.html) {
    throw new Error('Impresión requiere documento o HTML de respaldo');
  }

  await printReceiptHtml({ html: payload.html, widthMm: payload.widthMm, printer: printerOptions });
}

async function runPrintWithFallback(
  payload: ElectronPrintPayload,
  printerOptions: PrinterPrintOptions,
): Promise<void> {
  const mode = resolvePrintMode(printerOptions);
  const document = payload.document;
  const allowFallback = shouldAllowHtmlFallback(printerOptions);

  try {
    await printByMode(mode, payload, printerOptions);
    return;
  } catch (primaryError) {
    if (!allowFallback) {
      throw primaryError;
    }

    console.warn(`[print] modo ${mode} falló:`, primaryError);

    if (mode === 'escpos' && document) {
      try {
        console.info('[print] reintentando con texto plano');
        await printRawTextDocument(document, printerOptions);
        return;
      } catch (textError) {
        console.warn('[print] texto plano falló:', textError);
      }
    }

    if (document) {
      const minimalHtml = buildMinimalReceiptHtml(renderReceiptPrintText(document), payload.widthMm);
      try {
        console.info('[print] reintentando con HTML mínimo (texto)');
        await printReceiptHtml({ html: minimalHtml, widthMm: payload.widthMm, printer: printerOptions });
        return;
      } catch (minimalError) {
        console.warn('[print] HTML mínimo falló:', minimalError);
      }
    }

    if (payload.html) {
      console.info('[print] reintentando con HTML completo');
      await printReceiptHtml({ html: payload.html, widthMm: payload.widthMm, printer: printerOptions });
      return;
    }

    throw primaryError;
  }
}

const isDev = !app.isPackaged;
const apiPort = Number(process.env.PORT ?? POS_PORTS.api);

let mainWindow: BrowserWindow | null = null;

function resolveAppIcon() {
  const candidates = [
    path.join(__dirname, '../resources/icon.png'),
    path.join(__dirname, '../resources/icon.ico'),
    path.join(process.resourcesPath, 'icon.png'),
    path.join(process.resourcesPath, 'icon.ico'),
  ];

  for (const iconPath of candidates) {
    if (fs.existsSync(iconPath)) {
      const image = nativeImage.createFromPath(iconPath);
      if (!image.isEmpty()) {
        return image;
      }
    }
  }

  return undefined;
}

async function createWindow() {
  const appIcon = resolveAppIcon();

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    autoHideMenuBar: true,
    ...(appIcon ? { icon: appIcon } : {}),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  registerDevKeyboardShortcuts(mainWindow);

  const frontendUrl = resolveFrontendUrl(isDev, app.isPackaged);
  await mainWindow.loadURL(frontendUrl);
}

async function bootstrap() {
  await app.whenReady();
  Menu.setApplicationMenu(null);
  registerGracefulQuitHandler();

  ipcMain.handle('print-receipt', async (_event, payload: ElectronPrintPayload) => {
    const startedAt = Date.now();
    const printerOptions = await resolveEffectivePrinterOptions(payload.printer);
    const mode = resolvePrintMode(printerOptions);
    const printerName = printerOptions.printerName ?? '(predeterminada)';

    console.info(
      `[print] inicio mode=${mode} width=${payload.widthMm}mm printer=${printerName} type=${printerOptions.printerType ?? 'epson'} silent=${printerOptions.printSilent ?? true}`,
    );

    try {
      await runPrintWithFallback(payload, printerOptions);
      console.info(`[print] fin OK ${Date.now() - startedAt}ms`);
    } catch (error) {
      console.error(`[print] fin ERROR ${Date.now() - startedAt}ms`, error);
      throw error;
    }
  });

  ipcMain.handle(
    'generate-receipt-pdf',
    async (_event, payload: { html: string; widthMm: ReceiptWidthMm }) => {
      const buffer = await generateReceiptPdfBuffer(payload);
      return Uint8Array.from(buffer);
    },
  );

  ipcMain.handle('list-printers', async () => {
    const printers = await getSystemPrinters();
    return printers.map((printer) => ({
      name: printer.name,
      isDefault: Boolean(printer.isDefault),
      status: printer.status,
    }));
  });

  await bootstrapLocalServices({
    isDev,
    isPackaged: app.isPackaged,
    apiPort,
  });

  setupAutoUpdater(() => mainWindow);

  await createWindow();
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', async () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    await createWindow();
  }
});

bootstrap().catch((error) => {
  console.error(error);
  app.quit();
});
