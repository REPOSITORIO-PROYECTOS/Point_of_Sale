const DEFAULT_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';
const DEFAULT_API_ORIGIN =
  import.meta.env.VITE_API_ORIGIN ??
  (typeof window !== 'undefined' ? window.location.origin : 'http://127.0.0.1:3001');

/** Resolves theme logo path from API to a browser-loadable URL. */
export function resolveThemeLogoUrl(logoUrl?: string): string | undefined {
  if (!logoUrl) {
    return undefined;
  }

  if (logoUrl.startsWith('data:') || logoUrl.startsWith('http://') || logoUrl.startsWith('https://')) {
    return logoUrl;
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
    return undefined;
  }

  if (logoUrl.startsWith('data:') || logoUrl.startsWith('http://') || logoUrl.startsWith('https://')) {
    return logoUrl;
  }

  const normalizedPath = logoUrl.startsWith('/') ? logoUrl : `/${logoUrl}`;
  const apiBase = DEFAULT_BASE_URL.endsWith('/') ? DEFAULT_BASE_URL.slice(0, -1) : DEFAULT_BASE_URL;
  const origin =
    typeof window !== 'undefined' && window.location.origin.startsWith('http')
      ? window.location.origin
      : DEFAULT_API_ORIGIN;

  return `${origin}${apiBase.startsWith('/') ? apiBase : `/${apiBase}`}${normalizedPath}`;
}
