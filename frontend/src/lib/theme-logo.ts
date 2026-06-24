import { getApiBaseUrl, getApiOrigin } from './api-base-url';

const viteEnv = import.meta.env ?? {};

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
  const apiBase = getApiBaseUrl();

  if (apiBase.startsWith('http://') || apiBase.startsWith('https://')) {
    return `${apiBase}${normalizedPath}`;
  }

  if (typeof window !== 'undefined' && window.location.origin.startsWith('http')) {
    return `${window.location.origin}${apiBase}${normalizedPath}`;
  }

  return `${getApiOrigin()}${apiBase}${normalizedPath}`;
}

export function resolveReceiptLogoUrl(logoUrl?: string): string | undefined {
  if (!logoUrl) {
    return resolveAbsoluteAssetUrl(getDefaultLogoUrl());
  }

  if (logoUrl.startsWith("data:") || logoUrl.startsWith("http://") || logoUrl.startsWith("https://")) {
    return logoUrl;
  }

  if (isFrontendStaticLogoPath(logoUrl)) {
    return resolveAbsoluteAssetUrl(getDefaultLogoUrl());
  }

  const normalizedPath = logoUrl.startsWith("/") ? logoUrl : `/${logoUrl}`;
  const apiBase = getApiBaseUrl();
  const origin =
    typeof window !== "undefined" && window.location.origin.startsWith("http")
      ? window.location.origin
      : getApiOrigin();

  return resolveAbsoluteAssetUrl(`${origin}${apiBase.startsWith("/") ? apiBase : `/${apiBase}`}${normalizedPath}`);
}

function resolveAbsoluteAssetUrl(url: string): string | undefined {
  if (url.startsWith("data:") || url.startsWith("http://") || url.startsWith("https://") || url.startsWith("file://")) {
    return url;
  }

  const origin =
    typeof window !== "undefined" && window.location.origin.startsWith("http")
      ? window.location.origin
      : getApiOrigin();

  try {
    return new URL(url, `${origin}/`).href;
  } catch {
    return undefined;
  }
}
