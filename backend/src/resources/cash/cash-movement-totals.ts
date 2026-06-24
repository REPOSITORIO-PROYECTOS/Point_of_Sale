import type { CashMovementEntity } from './cash-movement.entity';

export type SessionMovementTotals = {
  incomeTotal: number;
  expenseTotal: number;
  netTotal: number;
  cashIncome: number;
  cashExpense: number;
  cashNet: number;
};

export function resolveMovementKind(
  movement: Pick<CashMovementEntity, 'type' | 'amount'>,
): 'income' | 'expense' {
  if (movement.type === 'income' || movement.type === 'expense') {
    return movement.type;
  }

  return movement.amount >= 0 ? 'income' : 'expense';
}

export function computeSessionMovementTotals(
  movements: CashMovementEntity[],
): SessionMovementTotals {
  let incomeTotal = 0;
  let expenseTotal = 0;
  let cashIncome = 0;
  let cashExpense = 0;

  for (const movement of movements) {
    const amount = Math.abs(movement.amount);
    const kind = resolveMovementKind(movement);
    const paymentMethod = movement.paymentMethod ?? 'cash';

    if (kind === 'income') {
      incomeTotal += amount;
      if (paymentMethod === 'cash') {
        cashIncome += amount;
      }
    } else {
      expenseTotal += amount;
      if (paymentMethod === 'cash') {
        cashExpense += amount;
      }
    }
  }

  return {
    incomeTotal,
    expenseTotal,
    netTotal: incomeTotal - expenseTotal,
    cashIncome,
    cashExpense,
    cashNet: cashIncome - cashExpense,
  };
}

export function computeExpectedSessionBalance(
  initialBalance: number,
  totalSales: number,
  movementTotals: SessionMovementTotals,
): number {
  return initialBalance + totalSales + movementTotals.netTotal;
}

export function computeExpectedCashInDrawer(
  initialBalance: number,
  cashSales: number,
  movementTotals: SessionMovementTotals,
): number {
  return initialBalance + cashSales + movementTotals.cashNet;
}
