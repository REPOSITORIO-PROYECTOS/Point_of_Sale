import { createContext, useContext, type ReactNode } from "react";
import { useAppUpdate as useAppUpdateState } from "./use-app-update";

type AppUpdateContextValue = ReturnType<typeof useAppUpdateState>;

const AppUpdateContext = createContext<AppUpdateContextValue | null>(null);

export function AppUpdateProvider({ children }: { children: ReactNode }) {
  const value = useAppUpdateState();
  return <AppUpdateContext.Provider value={value}>{children}</AppUpdateContext.Provider>;
}

export function useAppUpdate(): AppUpdateContextValue {
  const context = useContext(AppUpdateContext);
  if (!context) {
    throw new Error("useAppUpdate debe usarse dentro de AppUpdateProvider");
  }
  return context;
}
