import fs from 'node:fs';
import path from 'node:path';
import { getDesktopAppDataDir } from './paths';

const UPDATER_ENV_FILE = 'updater.env';
const SUPPORTED_KEYS = new Set([
  'GH_UPDATER_TOKEN',
  'GH_TOKEN',
  'POS_DISABLE_AUTO_UPDATE',
  'POS_UPDATER_PUBLIC_REPO',
  'POS_UPDATER_REQUIRES_TOKEN',
]);

export function parseUpdaterEnvContent(content: string): Record<string, string> {
  const vars: Record<string, string> = {};

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const eq = line.indexOf('=');
    if (eq < 1) {
      continue;
    }

    const key = line.slice(0, eq).trim();
    const value = line.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (key && value && SUPPORTED_KEYS.has(key)) {
      vars[key] = value;
    }
  }

  return vars;
}

export function getUpdaterEnvPath(): string {
  return path.join(getDesktopAppDataDir(), UPDATER_ENV_FILE);
}

/**
 * Carga %APPDATA%\PointOfSale\updater.env sin sobrescribir variables ya definidas en el proceso.
 */
export function loadUpdaterConfigFromAppData(): { loaded: boolean; path: string } {
  const envPath = getUpdaterEnvPath();

  if (!fs.existsSync(envPath)) {
    return { loaded: false, path: envPath };
  }

  const content = fs.readFileSync(envPath, 'utf8');
  const vars = parseUpdaterEnvContent(content);

  for (const [key, value] of Object.entries(vars)) {
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }

  if (vars.GH_UPDATER_TOKEN && !process.env.GH_TOKEN) {
    process.env.GH_TOKEN = vars.GH_UPDATER_TOKEN;
  } else if (vars.GH_TOKEN && !process.env.GH_UPDATER_TOKEN) {
    process.env.GH_UPDATER_TOKEN = vars.GH_TOKEN;
  }

  return { loaded: true, path: envPath };
}

export function isAutoUpdateDisabled(): boolean {
  return process.env.POS_DISABLE_AUTO_UPDATE === 'true';
}

export function hasUpdaterCredentials(): boolean {
  return Boolean(process.env.GH_UPDATER_TOKEN ?? process.env.GH_TOKEN);
}

/** Repo público en GitHub: electron-updater no necesita PAT en la caja. */
export function isPublicGitHubFeed(): boolean {
  if (process.env.POS_UPDATER_REQUIRES_TOKEN === 'true') {
    return false;
  }

  return process.env.POS_UPDATER_PUBLIC_REPO === 'true';
}

export function canRunAutoUpdater(): boolean {
  return hasUpdaterCredentials() || isPublicGitHubFeed();
}
