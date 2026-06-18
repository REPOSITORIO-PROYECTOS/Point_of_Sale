import { useCallback, useEffect, useState, type ReactNode } from "react";
import { PosAPI, type LicenseStatusResponse } from "./pos-api";

type LicenseProviderProps = {
  children: (value: {
    license: LicenseStatusResponse | null;
    isLoading: boolean;
    refresh: () => Promise<void>;
  }) => ReactNode;
};

export function LicenseGate({ children }: LicenseProviderProps) {
  const [license, setLicense] = useState<LicenseStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    const status = await PosAPI.getLicenseStatus();
    setLicense(status);
  }, []);

  useEffect(() => {
    let cancelled = false;
    PosAPI.getLicenseStatus()
      .then((status) => {
        if (!cancelled) setLicense(status);
      })
      .catch(() => {
        if (!cancelled) setLicense(null);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return <>{children({ license, isLoading, refresh })}</>;
}

function daysUntil(dateIso: string): number | null {
  const target = new Date(dateIso);
  if (Number.isNaN(target.getTime())) return null;
  const diffMs = target.getTime() - Date.now();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

export function LicenseExpiryBanner({ license }: { license: LicenseStatusResponse }) {
  if (!license.expiresAt) return null;

  const days = daysUntil(license.expiresAt);
  if (days === null || days > 30) return null;

  return (
    <div className="bg-amber-500 text-amber-950 text-sm text-center py-2 px-4">
      La licencia vence en {days} día(s). Contacte a soporte para renovar.
    </div>
  );
}
