import type { AfipBillingDefaults } from './afip-billing-defaults';

export type AfipStoredConfig = {
  cuit: string;
  puntoVenta: number;
  production: boolean;
  updatedAt: string;
  billingDefaults?: AfipBillingDefaults;
};

export type AfipConfigStatus = {
  configured: boolean;
  pendingCertificate: boolean;
  cuit: string | null;
  puntoVenta: number;
  production: boolean;
  billingDefaults: AfipBillingDefaults;
  hasCertificate: boolean;
  hasPrivateKey: boolean;
  hasPendingCsr: boolean;
  pendingCsr: string | null;
  certPath: string;
  keyPath: string;
  configPath: string;
  updatedAt: string | null;
};
