/** AFIP fiscal helpers shared between UI and backend tests. */

export type AfipBillingDefaults = {
  tipoAfip: number;
  tipoDocumento: number;
  documento: string;
  idCondicionIva: number;
  ivaRatePercent: number;
};

export const DEFAULT_AFIP_BILLING_DEFAULTS: AfipBillingDefaults = {
  tipoAfip: 6,
  tipoDocumento: 99,
  documento: "0",
  idCondicionIva: 5,
  ivaRatePercent: 21,
};

export type AfipCheckoutBuyer = {
  mode: "consumidor_final" | "custom";
  tipoDocumento: number;
  documento: string;
  idCondicionIva: number;
  tipoAfip: number;
};

export type AfipFacturaFields = {
  tipo_afip: number;
  tipo_documento: number;
  documento: string;
  id_condicion_iva: number;
  total: number;
  neto?: number;
  iva?: number;
};

export const AFIP_TIPO_DOCUMENTO_OPTIONS = [
  { value: 99, label: "Consumidor final / Sin identificar" },
  { value: 96, label: "DNI" },
  { value: 80, label: "CUIT" },
  { value: 86, label: "CUIL" },
] as const;

export const AFIP_CONDICION_IVA_OPTIONS = [
  { value: 5, label: "Consumidor final" },
  { value: 1, label: "IVA Responsable inscripto" },
  { value: 6, label: "Responsable monotributo" },
  { value: 4, label: "IVA sujeto exento" },
] as const;

export const AFIP_TIPO_COMPROBANTE_OPTIONS = [
  { value: 1, label: "Factura A" },
  { value: 6, label: "Factura B" },
  { value: 11, label: "Factura C" },
] as const;

/** RI comprador → Factura A; resto usa el default del negocio. */
export function resolveTipoAfipForBuyer(idCondicionIva: number, defaultTipoAfip: number): number {
  if (idCondicionIva === 1) {
    return 1;
  }

  return defaultTipoAfip;
}

export function normalizeAfipBillingDefaults(
  raw?: Partial<AfipBillingDefaults> | null,
): AfipBillingDefaults {
  return {
    tipoAfip: raw?.tipoAfip ?? DEFAULT_AFIP_BILLING_DEFAULTS.tipoAfip,
    tipoDocumento: raw?.tipoDocumento ?? DEFAULT_AFIP_BILLING_DEFAULTS.tipoDocumento,
    documento: raw?.documento ?? DEFAULT_AFIP_BILLING_DEFAULTS.documento,
    idCondicionIva: raw?.idCondicionIva ?? DEFAULT_AFIP_BILLING_DEFAULTS.idCondicionIva,
    ivaRatePercent: raw?.ivaRatePercent ?? DEFAULT_AFIP_BILLING_DEFAULTS.ivaRatePercent,
  };
}

export function resolveCheckoutBuyer(
  mode: AfipCheckoutBuyer["mode"],
  defaults: AfipBillingDefaults,
  custom?: {
    tipoDocumento: number;
    documento: string;
    idCondicionIva: number;
    tipoAfip?: number;
  },
): AfipCheckoutBuyer {
  if (mode === "consumidor_final") {
    return {
      mode,
      tipoDocumento: defaults.tipoDocumento,
      documento: defaults.documento,
      idCondicionIva: defaults.idCondicionIva,
      tipoAfip: defaults.tipoAfip,
    };
  }

  const idCondicionIva = custom?.idCondicionIva ?? defaults.idCondicionIva;
  const tipoAfip = custom?.tipoAfip ?? resolveTipoAfipForBuyer(idCondicionIva, defaults.tipoAfip);

  return {
    mode,
    tipoDocumento: custom?.tipoDocumento ?? defaults.tipoDocumento,
    documento: (custom?.documento ?? "").trim(),
    idCondicionIva,
    tipoAfip,
  };
}

export function validateCustomBuyer(buyer: Pick<AfipCheckoutBuyer, "tipoDocumento" | "documento" | "idCondicionIva">): string | null {
  if (buyer.tipoDocumento === 99) {
    return null;
  }

  const digits = buyer.documento.replace(/\D/g, "");

  if (!digits) {
    return "Ingresá el número de documento del comprador";
  }

  if (buyer.tipoDocumento === 80 && digits.length !== 11) {
    return "El CUIT debe tener 11 dígitos";
  }

  if (buyer.tipoDocumento === 96 && (digits.length < 7 || digits.length > 8)) {
    return "El DNI debe tener 7 u 8 dígitos";
  }

  if (buyer.tipoDocumento === 86 && digits.length !== 11) {
    return "El CUIL debe tener 11 dígitos";
  }

  return null;
}

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Total con IVA incluido → neto + IVA a la alícuota indicada. */
export function computeIvaBreakdown(
  total: number,
  ivaRatePercent: number,
): { neto: number; iva: number } {
  if (total <= 0 || ivaRatePercent <= 0) {
    return { neto: roundMoney(total), iva: 0 };
  }

  const factor = 1 + ivaRatePercent / 100;
  const neto = roundMoney(total / factor);
  const iva = roundMoney(total - neto);

  return { neto, iva };
}

export function buildAfipFacturaPayload(
  total: number,
  buyer: AfipCheckoutBuyer,
  defaults: AfipBillingDefaults,
): AfipFacturaFields {
  const { neto, iva } = computeIvaBreakdown(total, defaults.ivaRatePercent);

  return {
    tipo_afip: buyer.tipoAfip,
    tipo_documento: buyer.tipoDocumento,
    documento: buyer.tipoDocumento === 99 ? "0" : buyer.documento.replace(/\D/g, ""),
    id_condicion_iva: buyer.idCondicionIva,
    total: roundMoney(total),
    neto,
    iva,
  };
}

export function formatAfipBuyerSummary(buyer: AfipCheckoutBuyer): string {
  if (buyer.mode === "consumidor_final") {
    return "Consumidor final";
  }

  const docLabel =
    AFIP_TIPO_DOCUMENTO_OPTIONS.find((option) => option.value === buyer.tipoDocumento)?.label ??
    `Doc ${buyer.tipoDocumento}`;
  const ivaLabel =
    AFIP_CONDICION_IVA_OPTIONS.find((option) => option.value === buyer.idCondicionIva)?.label ??
    `IVA ${buyer.idCondicionIva}`;

  return `${docLabel} ${buyer.documento} · ${ivaLabel}`;
}
