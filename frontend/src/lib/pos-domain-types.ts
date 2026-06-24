/** Tipos de dominio compartidos (sin datos mock). */

export interface SaleHistoryItem {
  id: string;
  items: Array<{ id: string; name: string; price: number; quantity: number }>;
  total: number;
  timestamp: string;
  payments?: Array<{ type: string; amount: number; label?: string }>;
}

export interface CashMovementRecord {
  id: number;
  description: string;
  amount: number;
  createdAt: string;
  type?: "income" | "expense";
  paymentMethod?: "cash" | "card" | "transfer" | "qr";
  cashSessionId?: string;
}

export interface CreditNote {
  id: string;
  customerName: string;
  amount: number;
  status: "active" | "used" | "expired";
  createdAt: string;
  expiresAt?: string;
}

export interface CashClosing {
  id: string;
  date: string;
  user: string;
  userRole: string;
  expectedAmount: number;
  countedAmount: number;
  difference: number;
  status: "perfect" | "surplus" | "shortage";
  totalSales: number;
  transactionsCount: number;
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  details: string;
  severity: "info" | "warning" | "critical";
}
