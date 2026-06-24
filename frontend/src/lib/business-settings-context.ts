import { createContext, useContext } from "react";
import type { BusinessSettings } from "./pos-api";

export type BusinessSettingsContextValue = {
  settings: BusinessSettings;
  isLoading: boolean;
  refresh: () => Promise<void>;
  updateSettings: (payload: Partial<BusinessSettings>) => Promise<BusinessSettings>;
};

export const BusinessSettingsContext = createContext<BusinessSettingsContextValue | null>(null);

export function useBusinessSettings(): BusinessSettingsContextValue {
  const context = useContext(BusinessSettingsContext);
  if (!context) {
    throw new Error("useBusinessSettings debe usarse dentro de BusinessSettingsProvider");
  }

  return context;
}
