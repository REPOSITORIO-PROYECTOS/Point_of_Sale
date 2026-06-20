import type { CashSession } from "./wails-bridge";
import type { CashClosing } from "./pos-domain-types";

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

  if (role === "cashier") {
    return "Cajero";
  }

  return role ?? "Cajero";
}

export function mapCashSessionToClosing(session: CashSessionHistoryRow): CashClosing {
  const expectedAmount =
    session.expectedBalance ?? session.initialBalance + session.totalSales;
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
