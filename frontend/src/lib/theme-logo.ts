const viteEnv = import.meta.env ?? {};
const DEFAULT_BASE_URL = viteEnv.VITE_API_BASE_URL ?? '/api';
const DEFAULT_API_ORIGIN =
  viteEnv.VITE_API_ORIGIN ??
  (typeof window !== 'undefined' ? window.location.origin : 'http://127.0.0.1:3001');

/** Vite static asset — works in dev and production (base `./`). */
export const DEFAULT_SYSTEM_LOGO_PATH = `${viteEnv.BASE_URL ?? '/'}branding/default-logo.png`;

export function getDefaultLogoUrl(): string {
  if (typeof window !== 'undefined') {
    try {
      return new URL(DEFAULT_SYSTEM_LOGO_PATH, window.location.href).href;
    } catch {
      // fall through
    }
  }

  return DEFAULT_SYSTEM_LOGO_PATH;
}

export function hasCustomLogo(customLogoUrl?: string | null): boolean {
  return Boolean(customLogoUrl?.trim());
}

/** Display URL: custom theme logo when set, otherwise the bundled system default. */
export function getEffectiveLogoUrl(customLogoUrl?: string | null): string {
  if (hasCustomLogo(customLogoUrl)) {
    return resolveThemeLogoUrl(customLogoUrl!)!;
  }

  return getDefaultLogoUrl();
}

function isFrontendStaticLogoPath(path: string): boolean {
  return path.includes('/branding/default-logo') || path.includes('branding/default-logo');
}

/** Maps raw API theme payload to UI theme with effective default logo. */
export function mapThemeConfigFromApi(theme: {
  primaryColor: string;
  receiptWidthMm?: 55 | 80;
  logoUrl?: string;
  customLogoUrl?: string;
}): {
  primaryColor: string;
  receiptWidthMm: 55 | 80;
  logoUrl: string;
  customLogoUrl?: string;
} {
  const rawCustom = theme.customLogoUrl ?? theme.logoUrl;
  const customLogoUrl =
    rawCustom && !isFrontendStaticLogoPath(rawCustom)
      ? resolveThemeLogoUrl(rawCustom)
      : undefined;

  return {
    primaryColor: theme.primaryColor,
    receiptWidthMm: theme.receiptWidthMm ?? 80,
    customLogoUrl,
    logoUrl: getEffectiveLogoUrl(customLogoUrl),
  };
}

/** Resolves theme logo path from API to a browser-loadable URL. */
export function resolveThemeLogoUrl(logoUrl?: string): string | undefined {
  if (!logoUrl) {
    return undefined;
  }

  if (logoUrl.startsWith('data:') || logoUrl.startsWith('http://') || logoUrl.startsWith('https://')) {
    return logoUrl;
  }

  if (isFrontendStaticLogoPath(logoUrl)) {
    return getDefaultLogoUrl();
  }

  const normalizedPath = logoUrl.startsWith('/') ? logoUrl : `/${logoUrl}`;
  const apiBase = DEFAULT_BASE_URL.endsWith('/') ? DEFAULT_BASE_URL.slice(0, -1) : DEFAULT_BASE_URL;

  if (apiBase.startsWith('http://') || apiBase.startsWith('https://')) {
    return `${apiBase}${normalizedPath}`;
  }

  if (typeof window !== 'undefined') {
    return `${window.location.origin}${apiBase}${normalizedPath}`;
  }

  return `${DEFAULT_API_ORIGIN}${apiBase}${normalizedPath}`;
}

/** Absolute URL for printing (Electron hidden window / data: HTML). */
export function resolveReceiptLogoUrl(logoUrl?: string): string | undefined {
  if (!logoUrl) {
    return getDefaultLogoUrl();
  }

  if (logoUrl.startsWith('data:') || logoUrl.startsWith('http://') || logoUrl.startsWith('https://')) {
    return logoUrl;
  }

  if (isFrontendStaticLogoPath(logoUrl)) {
    return getDefaultLogoUrl();
  }

  const normalizedPath = logoUrl.startsWith('/') ? logoUrl : `/${logoUrl}`;
  const apiBase = DEFAULT_BASE_URL.endsWith('/') ? DEFAULT_BASE_URL.slice(0, -1) : DEFAULT_BASE_URL;
  const origin =
    typeof window !== 'undefined' && window.location.origin.startsWith('http')
      ? window.location.origin
      : DEFAULT_API_ORIGIN;

  return `${origin}${apiBase.startsWith('/') ? apiBase : `/${apiBase}`}${normalizedPath}`;
}
