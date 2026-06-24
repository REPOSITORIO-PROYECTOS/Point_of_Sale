import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import { bootstrapLocalServices, stopLocalServices } from './local-services';
import { resolveFrontendUrl } from './paths';
import {
  printEscposDocument,
  resolvePrintDeviceName,
  resolvePrintSilent,
  shouldAllowHtmlFallback,
  shouldUseEscposPrint,
} from './escpos-print';
import {
  THERMAL_PAGE_HEIGHT_MICRONS,
  THERMAL_PAGE_WIDTH_MICRONS,
  thermalBrowserWindowWidth,
  type ReceiptWidthMm,
} from './thermal-print';
import type { ElectronPrintPayload, PrinterPrintOptions } from './receipt-print-types';

function resolvePrintBaseUrl(isDev: boolean, isPackaged: boolean): string {
  if (isDev) {
    const rendererUrl = process.env.ELECTRON_RENDERER_URL ?? 'http://localhost:5173';
    return rendererUrl.endsWith('/') ? rendererUrl : `${rendererUrl}/`;
  }

  if (isPackaged) {
    const frontendDir = path.join(process.resourcesPath, 'frontend').replace(/\\/g, '/');
    return `file://${frontendDir}/`;
  }

  const devDist = path.resolve(__dirname, '../../frontend/dist').replace(/\\/g, '/');
  return `file://${devDist}/`;
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
  const printWindow = new BrowserWindow({
    show: false,
    width: thermalBrowserWindowWidth(payload.widthMm),
    height: 720,
    webPreferences: {
      sandbox: true,
    },
  });

  const baseURLForDataURL = resolvePrintBaseUrl(isDev, app.isPackaged);

  await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(payload.html)}`, {
    baseURLForDataURL,
  });

  const silent = resolvePrintSilent(payload.printer);
  const deviceName = resolvePrintDeviceName(payload.printer);
  const pageWidth = THERMAL_PAGE_WIDTH_MICRONS[payload.widthMm];

  await new Promise<void>((resolve, reject) => {
    printWindow.webContents.print(
      {
        silent,
        printBackground: true,
        deviceName,
        margins: { marginType: 'none' },
        pageSize: {
          width: pageWidth,
          height: THERMAL_PAGE_HEIGHT_MICRONS,
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

const isDev = !app.isPackaged;
const apiPort = Number(process.env.PORT ?? 3001);

let mainWindow: BrowserWindow | null = null;

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    show: false,
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

  const frontendUrl = resolveFrontendUrl(isDev, app.isPackaged);
  await mainWindow.loadURL(frontendUrl);
}

async function bootstrap() {
  await app.whenReady();

  ipcMain.handle('print-receipt', async (_event, payload: ElectronPrintPayload) => {
    const printerOptions = payload.printer;
    const preferEscpos = shouldUseEscposPrint(printerOptions) && payload.document;

    if (preferEscpos) {
      try {
        await printEscposDocument(payload.document!, printerOptions);
        return;
      } catch (error) {
        const allowHtmlFallback = shouldAllowHtmlFallback(printerOptions);
        if (allowHtmlFallback && payload.html) {
          console.warn('[print] ESC/POS falló, usando HTML:', error);
          await printReceiptHtml({ html: payload.html, widthMm: payload.widthMm, printer: printerOptions });
          return;
        }
        throw error;
      }
    }

    if (!payload.html) {
      throw new Error('Impresión requiere documento ESC/POS o HTML de respaldo');
    }

    await printReceiptHtml({ html: payload.html, widthMm: payload.widthMm, printer: printerOptions });
  });

  ipcMain.handle('list-printers', async () => {
    const targetWindow = mainWindow ?? BrowserWindow.getAllWindows()[0];
    if (!targetWindow) {
      return [];
    }

    const printers = (await targetWindow.webContents.getPrintersAsync()) as Array<{
      name: string;
      isDefault?: boolean;
      status?: number;
    }>;
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

  await createWindow();
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  stopLocalServices();
});

app.on('activate', async () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    await createWindow();
  }
});

bootstrap().catch((error) => {
  console.error(error);
  stopLocalServices();
  app.quit();
});
