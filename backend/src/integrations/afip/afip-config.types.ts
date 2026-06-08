export type AfipStoredConfig = {
  cuit: string;
  puntoVenta: number;
  production: boolean;
  updatedAt: string;
};

export type AfipConfigStatus = {
  configured: boolean;
  cuit: string | null;
  puntoVenta: number;
  production: boolean;
  hasCertificate: boolean;
  hasPrivateKey: boolean;
  certPath: string;
  keyPath: string;
  configPath: string;
  updatedAt: string | null;
};
