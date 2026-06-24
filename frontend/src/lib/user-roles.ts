export type AccessLevel = "admin" | "manager" | "cashier" | "auditor";

export type RolePermissions = {
  canViewAudit: boolean;
  canEditProducts: boolean;
  canManageCash: boolean;
  canCancelSales: boolean;
  canApplyDiscounts: boolean;
  canAccessReports: boolean;
};

export type RoleDefinition = {
  id: string;
  name: string;
  accessLevel: AccessLevel;
  permissions: RolePermissions;
};

export const ROLE_DEFINITIONS: RoleDefinition[] = [
  {
    id: "admin",
    name: "Administrador",
    accessLevel: "admin",
    permissions: {
      canViewAudit: true,
      canEditProducts: true,
      canManageCash: true,
      canCancelSales: true,
      canApplyDiscounts: true,
      canAccessReports: true,
    },
  },
  {
    id: "manager",
    name: "Gerente",
    accessLevel: "manager",
    permissions: {
      canViewAudit: true,
      canEditProducts: true,
      canManageCash: true,
      canCancelSales: true,
      canApplyDiscounts: true,
      canAccessReports: true,
    },
  },
  {
    id: "cashier",
    name: "Cajero",
    accessLevel: "cashier",
    permissions: {
      canViewAudit: false,
      canEditProducts: false,
      canManageCash: true,
      canCancelSales: false,
      canApplyDiscounts: false,
      canAccessReports: false,
    },
  },
  {
    id: "auditor",
    name: "Auditor",
    accessLevel: "auditor",
    permissions: {
      canViewAudit: true,
      canEditProducts: false,
      canManageCash: false,
      canCancelSales: false,
      canApplyDiscounts: false,
      canAccessReports: true,
    },
  },
];

export const ACCESS_LEVEL_LABELS: Record<AccessLevel, string> = {
  admin: "Administrador",
  manager: "Gerente",
  cashier: "Cajero",
  auditor: "Auditor",
};

export const ACCESS_LEVEL_SUMMARIES: Record<AccessLevel, string> = {
  admin: "Acceso total al sistema",
  manager: "Gestión completa con supervisión",
  cashier: "Operaciones de venta y caja",
  auditor: "Solo lectura y reportes",
};

export function getRoleLabel(accessLevel: string): string {
  return ACCESS_LEVEL_LABELS[accessLevel as AccessLevel] ?? accessLevel;
}
