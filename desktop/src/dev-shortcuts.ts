import type { BrowserWindow } from 'electron';

/**
 * Atajos de depuración cuando no hay menú de aplicación visible.
 * F12 queda libre para el POS (abrir cajón).
 */
export function registerDevKeyboardShortcuts(window: BrowserWindow) {
  window.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') {
      return;
    }

    const key = input.key.toLowerCase();

    if (input.control && input.shift && key === 'i') {
      window.webContents.toggleDevTools();
      event.preventDefault();
      return;
    }

    if (input.control && input.shift && key === 'r') {
      window.webContents.reloadIgnoringCache();
      event.preventDefault();
      return;
    }

    if (input.control && !input.shift && !input.alt && key === 'r') {
      window.webContents.reload();
      event.preventDefault();
    }
  });
}
