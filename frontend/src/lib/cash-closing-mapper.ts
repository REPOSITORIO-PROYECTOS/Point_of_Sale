import type { CashSession } from "./wails-bridge";
import type { CashClosing } from "./pos-domain-types";
import { getExpectedCashInDrawer } from "./cash-expected";

type CashSessionHistoryRow = CashSession & {
  expectedBalance?: number;
  countedAmount?: number;
  endTime?: string;
  closedByUsername?: string;
  closedByRole?: string;
  transactionsCount?: number;
};

function roleLabel(role?: string): string {
  if (role === "admin") {
    return "Administrador";
  }

  if (role === "manager") {
    return "Gerente";
  }

  if (role === "cashier") {
    return "Cajero";
  }

  if (role === "auditor") {
    return "Auditor";
  }

  return role ?? "Cajero";
}

export function mapCashSessionToClosing(session: CashSessionHistoryRow): CashClosing {
  const expectedAmount =
    session.expectedBalance ??
    (session.finalBalance != null
      ? session.finalBalance
      : getExpectedCashInDrawer(session));
  const countedAmount = session.countedAmount ?? session.finalBalance ?? expectedAmount;
  const difference = countedAmount - expectedAmount;

  let status: CashClosing["status"] = "perfect";
  if (difference > 0.009) {
    status = "surplus";
  } else if (difference < -0.009) {
    status = "shortage";
  }

  return {
    id: session.id,
    date: session.endTime ?? session.startTime,
    user: session.closedByUsername ?? "Sin registrar",
    userRole: roleLabel(session.closedByRole),
    expectedAmount,
    countedAmount,
    difference,
    status,
    totalSales: session.totalSales,
    transactionsCount: session.transactionsCount ?? 0,
  };
}
