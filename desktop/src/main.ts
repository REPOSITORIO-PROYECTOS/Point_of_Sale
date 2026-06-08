import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import { bootstrapLocalServices, stopLocalServices } from './local-services';
import { resolveFrontendUrl } from './paths';

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
