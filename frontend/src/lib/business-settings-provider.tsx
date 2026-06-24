import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "./auth-context";
import { PosAPI, type BusinessSettings } from "./pos-api";
import { BusinessSettingsContext } from "./business-settings-context";

const DEFAULT_SETTINGS: BusinessSettings = {
  parcelsEnabled: false,
};

export function BusinessSettingsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [settings, setSettings] = useState<BusinessSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setSettings(DEFAULT_SETTINGS);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const loaded = await PosAPI.getBusinessSettings();
      setSettings(loaded);
    } catch {
      setSettings(DEFAULT_SETTINGS);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const updateSettings = useCallback(async (payload: Partial<BusinessSettings>) => {
    const saved = await PosAPI.updateBusinessSettings(payload);
    setSettings(saved);
    return saved;
  }, []);

  const value = useMemo(
    () => ({
      settings,
      isLoading,
      refresh,
      updateSettings,
    }),
    [settings, isLoading, refresh, updateSettings],
  );

  return (
    <BusinessSettingsContext.Provider value={value}>{children}</BusinessSettingsContext.Provider>
  );
}
