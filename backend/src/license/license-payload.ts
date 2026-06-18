export const LICENSE_PREFIX = 'POS-LIC-v1';
export const LICENSE_PAYLOAD_VERSION = 1;

export const LICENSE_FEATURES = ['pos', 'afip', 'remote'] as const;
export type LicenseFeature = (typeof LICENSE_FEATURES)[number];

export type LicensePayload = {
  v: typeof LICENSE_PAYLOAD_VERSION;
  licenseId: string;
  clientNumber: string;
  machineId: string;
  issuedAt: string;
  expiresAt: string | null;
  features: LicenseFeature[];
};

export function canonicalizeLicensePayload(payload: LicensePayload): string {
  const ordered: LicensePayload = {
    v: payload.v,
    licenseId: payload.licenseId,
    clientNumber: payload.clientNumber,
    machineId: payload.machineId,
    issuedAt: payload.issuedAt,
    expiresAt: payload.expiresAt,
    features: [...payload.features].sort(),
  };

  return JSON.stringify(ordered);
}

export function parseLicensePayload(json: string): LicensePayload | null {
  try {
    const parsed = JSON.parse(json) as Partial<LicensePayload>;
    if (
      parsed.v !== LICENSE_PAYLOAD_VERSION ||
      typeof parsed.licenseId !== 'string' ||
      typeof parsed.clientNumber !== 'string' ||
      typeof parsed.machineId !== 'string' ||
      typeof parsed.issuedAt !== 'string' ||
      (parsed.expiresAt !== null && typeof parsed.expiresAt !== 'string') ||
      !Array.isArray(parsed.features)
    ) {
      return null;
    }

    return {
      v: LICENSE_PAYLOAD_VERSION,
      licenseId: parsed.licenseId,
      clientNumber: parsed.clientNumber,
      machineId: parsed.machineId,
      issuedAt: parsed.issuedAt,
      expiresAt: parsed.expiresAt ?? null,
      features: parsed.features.filter((feature): feature is LicenseFeature =>
        LICENSE_FEATURES.includes(feature as LicenseFeature),
      ),
    };
  } catch {
    return null;
  }
}
