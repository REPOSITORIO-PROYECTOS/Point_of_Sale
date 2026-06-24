import type { CashSession } from "./wails-bridge";

export const CASH_SESSION_CLOSED_EVENT = "pos:cash-session-closed";
export const CASH_DATA_UPDATED_EVENT = "pos:cash-data-updated";

export function notifyCashDataUpdated() {
  window.dispatchEvent(new CustomEvent(CASH_DATA_UPDATED_EVENT));
}

export function notifyCashSessionClosed() {
  notifyCashDataUpdated();
  window.dispatchEvent(new CustomEvent(CASH_SESSION_CLOSED_EVENT));
}

/** Sesión abierta = existe registro y sin fecha de cierre. */
export function isCashSessionOpen(session: CashSession | null | undefined): session is CashSession {
  return Boolean(session && !session.endTime);
}

export function getSalesByPaymentMethod(session: CashSession) {
  return session.salesByPaymentMethod ?? { cash: 0, card: 0, transfer: 0, qr: 0 };
}
