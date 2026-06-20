export function getPortalPublicUrl(): string {
  const configured = import.meta.env.VITE_PORTAL_PUBLIC_URL as string | undefined;
  if (configured?.trim()) {
    return configured.trim().replace(/\/$/, '');
  }

  if (typeof window !== 'undefined') {
    return window.location.origin;
  }

  return 'http://localhost:5174';
}

export type ClientWelcomeParams = {
  businessName: string;
  clientNumber: string;
  email: string;
  password: string;
  portalUrl?: string;
};

export function buildClientWelcomeMessage(params: ClientWelcomeParams): string {
  const portalUrl = params.portalUrl ?? getPortalPublicUrl();

  return [
    `¡Hola ${params.businessName}!`,
    '',
    'Tu acceso al portal POS Remoto ya está activo.',
    '',
    `🔗 Portal: ${portalUrl}`,
    `📧 Email: ${params.email}`,
    `🔑 Contraseña: ${params.password}`,
    `🆔 ID para emparejar el POS: ${params.clientNumber}`,
    '',
    'Ingresá con tu email y contraseña. Después podés cambiarla en Mi cuenta.',
    '',
    'Saludos,',
    'Equipo POS Remoto',
  ].join('\n');
}
