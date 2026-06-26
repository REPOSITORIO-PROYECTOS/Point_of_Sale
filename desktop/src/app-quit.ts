import { app } from 'electron';
import { stopLocalServicesGracefully } from './local-services';

let isQuitting = false;
let gracefulQuitRegistered = false;

export function markAppQuitting(): void {
  isQuitting = true;
}

export function isAppQuitting(): boolean {
  return isQuitting;
}

/**
 * Evita que procesos hijos bloqueen el cierre de ventana o quitAndInstall.
 * Primera pasada: preventDefault + shutdown async; segunda pasada: deja salir.
 */
export function registerGracefulQuitHandler(): void {
  if (gracefulQuitRegistered) {
    return;
  }

  gracefulQuitRegistered = true;

  app.on('before-quit', (event) => {
    if (isQuitting) {
      return;
    }

    event.preventDefault();
    isQuitting = true;

    void stopLocalServicesGracefully().finally(() => {
      app.quit();
    });
  });
}
