import type { CashSession } from "./wails-bridge";

export type CashSessionMovementTotals = {
  incomeTotal: number;
  expenseTotal: number;
  netTotal: number;
  cashIncome: number;
  cashExpense: number;
  cashNet: number;
};

const EMPTY_TOTALS: CashSessionMovementTotals = {
  incomeTotal: 0,
  expenseTotal: 0,
  netTotal: 0,
  cashIncome: 0,
  cashExpense: 0,
  cashNet: 0,
};

function toAmount(value: number | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export function getSessionMovementTotals(session: CashSession | null | undefined): CashSessionMovementTotals {
  return session?.movementTotals ?? EMPTY_TOTALS;
}

export function getExpectedSessionBalance(session: CashSession): number {
  const movementTotals = getSessionMovementTotals(session);
  return toAmount(session.initialBalance) + toAmount(session.totalSales) + movementTotals.netTotal;
}

export function getExpectedCashInDrawer(session: CashSession): number {
  const movementTotals = getSessionMovementTotals(session);
  const cashSales = toAmount(session.salesByPaymentMethod?.cash);
  return toAmount(session.initialBalance) + cashSales + movementTotals.cashNet;
}
