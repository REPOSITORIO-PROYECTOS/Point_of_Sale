export type AfipCredentials = {
  cuit: string;
  certificado: string;
  clave_privada: string;
};

export type AfipInvoiceData = {
  tipo_afip: number;
  punto_venta?: number;
  tipo_documento: number;
  documento: string;
  total: number;
  id_condicion_iva: number;
  neto?: number;
  iva?: number;
  neto105?: number;
  iva105?: number;
  asociado_tipo_afip?: number;
  asociado_punto_venta?: number;
  asociado_numero_comprobante?: number;
  asociado_fecha_comprobante?: string;
};

/** Payload de negocio que arma pos-api antes de enviar al microservicio AFIP. */
export type AfipIssueInvoicePayload = AfipInvoiceData;

/** Contrato HTTP del microservicio AFIP (multi-tenant). */
export type AfipMicroserviceInvoiceRequest = {
  credenciales: AfipCredentials;
  datos_factura: AfipInvoiceData;
};

export type AfipQueryVoucherParams = {
  tipo_cbte: number;
  punto_vta: number;
  cbte_nro: number;
};

export type AfipHealthResponse = {
  afipReachable: boolean;
  url: string;
  latencyMs: number | null;
  statusCode: number | null;
  error: string | null;
  checkedAt: string;
  matchedPath?: string | null;
};

export type AfipIssueInvoiceResponse = Record<string, unknown>;

export type AfipQueryVoucherResponse = {
  mensaje: string;
  factura: Record<string, unknown> | null;
};

export const AFIP_TEST_PATHS = ['/api/afipws/test', '/afipws/test'] as const;

export const AFIP_FACTURADOR_PATHS = ['/api/afipws/facturador', '/afipws/facturador'] as const;
export const AFIP_FACTURADOR_PATH = AFIP_FACTURADOR_PATHS[0];
export const AFIP_CONSULTA_PATH = '/api/afipws/consulta_comprobante';
