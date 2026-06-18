import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import { bootstrapLocalServices, stopLocalServices } from './local-services';
import { resolveFrontendUrl } from './paths';

type ReceiptWidthMm = 55 | 80;

type ElectronPrintPayload = {
  html: string;
  widthMm: ReceiptWidthMm;
};

/**
 * Prints pre-rendered thermal HTML via the OS print driver.
 * Direct ESC/POS integration is planned for a future sprint.
 */
async function printReceiptHtml(payload: ElectronPrintPayload) {
  const printWindow = new BrowserWindow({
    show: false,
    width: payload.widthMm === 55 ? 260 : 360,
    height: 720,
    webPreferences: {
      sandbox: true,
    },
  });

  await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(payload.html)}`);

  await new Promise<void>((resolve, reject) => {
    printWindow.webContents.print({ silent: false }, (success, failureReason) => {
      printWindow.close();
      if (!success) {
        reject(new Error(failureReason ?? 'No se pudo imprimir el recibo'));
        return;
      }
      resolve();
    });
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
    await printReceiptHtml(payload);
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
