export type AccessLevel = "admin" | "manager" | "cashier" | "auditor";

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
