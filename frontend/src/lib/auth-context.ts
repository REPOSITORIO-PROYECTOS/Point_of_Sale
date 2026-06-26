import { createContext, useContext } from "react";
import type { AuthUser, UpdateProfilePayload } from "./pos-api";
import type { RolePermissions } from "./user-roles";

export type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  needsSetup: boolean;
  apiUnavailable: boolean;
  login: (username: string, password: string) => Promise<void>;
  setupAdmin: (username: string, password: string, confirmPassword: string) => Promise<void>;
  updateProfile: (payload: UpdateProfilePayload) => Promise<void>;
  logout: () => void;
  isAdmin: boolean;
  permissions: RolePermissions;
  canViewAudit: boolean;
  canEditProducts: boolean;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe usarse dentro de AuthProvider");
  }
  return context;
}
