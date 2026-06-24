import assert from 'node:assert/strict';
import test from 'node:test';
import {
  computeExpectedCashInDrawer,
  computeExpectedSessionBalance,
  computeSessionMovementTotals,
} from './cash-movement-totals';
import type { CashMovementEntity } from './cash-movement.entity';

function movement(
  partial: Partial<CashMovementEntity> & Pick<CashMovementEntity, 'amount' | 'description'>,
): CashMovementEntity {
  return {
    id: 1,
    createdAt: new Date(),
    cashSessionId: 'session-1',
    ...partial,
  } as CashMovementEntity;
}

test('computeSessionMovementTotals sums income and expense by payment method', () => {
  const totals = computeSessionMovementTotals([
    movement({ description: 'Cambio', amount: 500, type: 'income', paymentMethod: 'cash' }),
    movement({ description: 'Proveedor', amount: -200, type: 'expense', paymentMethod: 'cash' }),
    movement({ description: 'POS', amount: -100, type: 'expense', paymentMethod: 'card' }),
  ]);

  assert.equal(totals.incomeTotal, 500);
  assert.equal(totals.expenseTotal, 300);
  assert.equal(totals.netTotal, 200);
  assert.equal(totals.cashNet, 300);
});

test('computeExpectedSessionBalance includes movement net', () => {
  const totals = computeSessionMovementTotals([
    movement({ description: 'Retiro', amount: -150, type: 'expense', paymentMethod: 'cash' }),
  ]);

  assert.equal(computeExpectedSessionBalance(1000, 2500, totals), 3350);
});

test('computeExpectedCashInDrawer only applies cash movements', () => {
  const totals = computeSessionMovementTotals([
    movement({ description: 'Cambio', amount: 100, type: 'income', paymentMethod: 'cash' }),
    movement({ description: 'Tarjeta', amount: -50, type: 'expense', paymentMethod: 'card' }),
  ]);

  assert.equal(computeExpectedCashInDrawer(1000, 800, totals), 1900);
});
