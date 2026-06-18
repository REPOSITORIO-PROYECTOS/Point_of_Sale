export const LICENSE_STATUSES = ['active', 'expired', 'blocked', 'missing'] as const;
export type LicenseStatus = (typeof LICENSE_STATUSES)[number];

export type LicenseActivationResponse = {
  status: 'active';
  clientNumber: string;
  licenseId: string;
  expiresAt: string | null;
};

export type LicenseStatusResponse = {
  status: LicenseStatus;
  allowed: boolean;
  clientNumber: string | null;
  clientNumberMasked: string | null;
  licenseId: string | null;
  activatedAt: string | null;
  expiresAt: string | null;
  firstBootAt: string;
  graceEndsAt: string;
  inGracePeriod: boolean;
  daysUntilExpiry: number | null;
  showExpiryWarning: boolean;
  cautionFlag: boolean;
  machineId: string;
  message: string | null;
};
