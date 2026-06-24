const viteEnv = import.meta.env ?? {};

const DEFAULT_LOCAL_API_ORIGIN = 'http://127.0.0.1:3001';

function trimTrailingSlash(value: string): string {
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

function resolveLocalApiBaseUrl(): string {
  const origin = trimTrailingSlash(
    (viteEnv.VITE_API_ORIGIN as string | undefined) ?? DEFAULT_LOCAL_API_ORIGIN,
  );
  return `${origin}/api`;
}

/**
 * Base URL for NestJS REST calls.
 * - Dev (http://localhost:5173): `/api` via Vite proxy.
 * - Electron packaged (file://): absolute `http://127.0.0.1:3001/api`.
 */
export function getApiBaseUrl(): string {
  const configured = (viteEnv.VITE_API_BASE_URL as string | undefined)?.trim();

  if (configured?.startsWith('http://') || configured?.startsWith('https://')) {
    return trimTrailingSlash(configured);
  }

  if (typeof window !== 'undefined' && window.location.protocol === 'file:') {
    return resolveLocalApiBaseUrl();
  }

  return configured || '/api';
}

export function getApiOrigin(): string {
  const base = getApiBaseUrl();
  if (base.startsWith('http://') || base.startsWith('https://')) {
    try {
      return new URL(base).origin;
    } catch {
      // fall through
    }
  }

  if (typeof window !== 'undefined' && window.location.origin.startsWith('http')) {
    return window.location.origin;
  }

  return (viteEnv.VITE_API_ORIGIN as string | undefined) ?? DEFAULT_LOCAL_API_ORIGIN;
}
