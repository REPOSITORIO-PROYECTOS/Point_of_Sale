// Mock data para el sistema POS
// Este archivo contiene todos los datos de ejemplo
// En producción, estos datos vendrán del backend vía WailsAPI

export interface UserRole {
  id: string;
  name: string;
  accessLevel: "admin" | "manager" | "cashier" | "auditor";
  permissions: {
    canViewAudit: boolean;
    canEditProducts: boolean;
    canManageCash: boolean;
    canCancelSales: boolean;
    canApplyDiscounts: boolean;
    canAccessReports: boolean;
  };
}

export interface BusinessData {
  name: string;
  rut: string;
  phone: string;
  email: string;
  address: string;
}

export interface Adjustment {
  type: "surcharge" | "discount";
  amount: number;
  isPercentage: boolean;
  description: string;
}

export interface PaymentDetail {
  method: "cash" | "card" | "transfer" | "qr";
  amount: number;
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
  salesByMethod: {
    cash: number;
    card: number;
    transfer: number;
    qr: number;
  };
  businessData: BusinessData;
}

export interface Transaction {
  id: string;
  time: string;
  items: { name: string; quantity: number; price: number }[];
  paymentMethod: "cash" | "card" | "transfer" | "qr" | "mixed";
  paymentDetails?: PaymentDetail[];
  subtotal: number;
  adjustments?: Adjustment[];
  amount: number;
  cashier: string;
  cashierRole: string;
}

export interface AuditEvent {
  id: string;
  time: string;
  type: "sale_cancelled" | "drawer_opened" | "discount_100" | "price_override" | "surcharge_applied";
  description: string;
  user: string;
  userRole: string;
  severity: "low" | "medium" | "high";
}

export interface CashMovement {
  id: string;
  date: string;
  time: string;
  type: "sale" | "manual_income" | "manual_expense" | "return_cash";
  description: string;
  amount: number;
  paymentMethod: "cash" | "card" | "transfer" | "qr";
  user: string;
  transactionId?: string;
}

export interface CreditNote {
  id: string;
  issueDate: string;
  originalTransactionId: string;
  customerName?: string;
  amount: number;
  balance: number;
  status: "active" | "used" | "expired";
  items: { name: string; quantity: number; price: number }[];
}

export interface Return {
  id: string;
  date: string;
  time: string;
  originalTransactionId: string;
  items: { name: string; quantity: number; price: number; restockItem: boolean }[];
  refundType: "cash" | "credit_note";
  amount: number;
  creditNoteId?: string;
  user: string;
}

export const mockBusinessData: BusinessData = {
  name: "Cafetería El Buen Sabor",
  rut: "20-12345678-9",
  phone: "+54 11 4567-8900",
  email: "contacto@buensabor.com.ar",
  address: "Av. Corrientes 1234, CABA, Buenos Aires",
};

export const mockUserRoles: UserRole[] = [
  {
    id: "1",
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
    id: "2",
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
    id: "3",
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
    id: "4",
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

export const mockCashClosings: CashClosing[] = [
  {
    id: "1",
    date: "2026-05-23T20:30:00",
    user: "María González",
    userRole: "Gerente",
    expectedAmount: 125000,
    countedAmount: 125000,
    difference: 0,
    status: "perfect",
    totalSales: 115000,
    transactionsCount: 47,
    salesByMethod: { cash: 65000, card: 30000, transfer: 15000, qr: 5000 },
    businessData: mockBusinessData,
  },
  {
    id: "2",
    date: "2026-05-22T19:45:00",
    user: "Carlos Rodríguez",
    userRole: "Cajero",
    expectedAmount: 98500,
    countedAmount: 99000,
    difference: 500,
    status: "surplus",
    totalSales: 88500,
    transactionsCount: 35,
    salesByMethod: { cash: 50000, card: 25000, transfer: 10000, qr: 3500 },
    businessData: mockBusinessData,
  },
  {
    id: "3",
    date: "2026-05-21T21:00:00",
    user: "Ana Martínez",
    userRole: "Cajero",
    expectedAmount: 142000,
    countedAmount: 141200,
    difference: -800,
    status: "shortage",
    totalSales: 132000,
    transactionsCount: 58,
    salesByMethod: { cash: 75000, card: 40000, transfer: 12000, qr: 5000 },
    businessData: mockBusinessData,
  },
  {
    id: "4",
    date: "2026-05-20T20:15:00",
    user: "María González",
    userRole: "Gerente",
    expectedAmount: 156000,
    countedAmount: 156000,
    difference: 0,
    status: "perfect",
    totalSales: 146000,
    transactionsCount: 62,
    salesByMethod: { cash: 85000, card: 45000, transfer: 12000, qr: 4000 },
    businessData: mockBusinessData,
  },
  {
    id: "5",
    date: "2026-05-19T20:00:00",
    user: "Carlos Rodríguez",
    userRole: "Cajero",
    expectedAmount: 134500,
    countedAmount: 133900,
    difference: -600,
    status: "shortage",
    totalSales: 124500,
    transactionsCount: 52,
    salesByMethod: { cash: 70000, card: 35000, transfer: 14500, qr: 5000 },
    businessData: mockBusinessData,
  },
];

export const mockTransactions: Transaction[] = [
  {
    id: "T001",
    time: "18:25",
    items: [
      { name: "Café Espresso", quantity: 2, price: 2.5 },
      { name: "Croissant", quantity: 1, price: 3.0 },
    ],
    paymentMethod: "cash",
    subtotal: 8.0,
    amount: 8.0,
    cashier: "María González",
    cashierRole: "Gerente",
  },
  {
    id: "T002",
    time: "18:42",
    items: [{ name: "Sándwich Mixto", quantity: 1, price: 6.5 }],
    paymentMethod: "card",
    subtotal: 6.5,
    adjustments: [
      {
        type: "surcharge",
        amount: 10,
        isPercentage: true,
        description: "Recargo por tarjeta de crédito",
      },
    ],
    amount: 7.15,
    cashier: "María González",
    cashierRole: "Gerente",
  },
  {
    id: "T003",
    time: "19:05",
    items: [
      { name: "Capuchino", quantity: 3, price: 3.5 },
      { name: "Muffin", quantity: 2, price: 2.5 },
    ],
    paymentMethod: "mixed",
    paymentDetails: [
      { method: "cash", amount: 10.0 },
      { method: "card", amount: 5.5 },
    ],
    subtotal: 15.5,
    amount: 15.5,
    cashier: "María González",
    cashierRole: "Gerente",
  },
  {
    id: "T004",
    time: "19:30",
    items: [{ name: "Jugo de Naranja", quantity: 1, price: 3.5 }],
    paymentMethod: "qr",
    subtotal: 3.5,
    adjustments: [
      {
        type: "discount",
        amount: 0.5,
        isPercentage: false,
        description: "Descuento promocional",
      },
    ],
    amount: 3.0,
    cashier: "María González",
    cashierRole: "Gerente",
  },
  {
    id: "T005",
    time: "19:45",
    items: [
      { name: "Café Americano", quantity: 1, price: 2.8 },
      { name: "Galleta", quantity: 3, price: 1.5 },
    ],
    paymentMethod: "cash",
    subtotal: 7.3,
    amount: 7.3,
    cashier: "María González",
    cashierRole: "Gerente",
  },
  {
    id: "T006",
    time: "20:10",
    items: [
      { name: "Café con Leche", quantity: 2, price: 4.0 },
      { name: "Croissant", quantity: 2, price: 3.0 },
    ],
    paymentMethod: "transfer",
    subtotal: 14.0,
    adjustments: [
      {
        type: "discount",
        amount: 15,
        isPercentage: true,
        description: "Descuento cliente frecuente",
      },
    ],
    amount: 11.9,
    cashier: "Carlos Rodríguez",
    cashierRole: "Cajero",
  },
];

export const mockAuditEvents: AuditEvent[] = [
  {
    id: "E001",
    time: "19:30",
    type: "drawer_opened",
    description: "Cajón abierto sin venta registrada",
    user: "María González",
    userRole: "Gerente",
    severity: "medium",
  },
  {
    id: "E002",
    time: "17:15",
    type: "sale_cancelled",
    description: "Venta cancelada - Ticket #1245",
    user: "María González",
    userRole: "Gerente",
    severity: "low",
  },
  {
    id: "E003",
    time: "16:45",
    type: "discount_100",
    description: "Descuento del 100% aplicado en producto 'Café Espresso'",
    user: "María González",
    userRole: "Gerente",
    severity: "high",
  },
  {
    id: "E004",
    time: "18:42",
    type: "surcharge_applied",
    description: "Recargo del 10% aplicado por pago con tarjeta",
    user: "María González",
    userRole: "Gerente",
    severity: "low",
  },
  {
    id: "E005",
    time: "20:10",
    type: "price_override",
    description: "Descuento del 15% aplicado manualmente - Cliente frecuente",
    user: "Carlos Rodríguez",
    userRole: "Cajero",
    severity: "medium",
  },
];

export const mockCashMovements: CashMovement[] = [
  {
    id: "M001",
    date: "2026-05-23",
    time: "08:00",
    type: "manual_income",
    description: "Apertura de caja - Fondo inicial",
    amount: 10000,
    paymentMethod: "cash",
    user: "María González",
  },
  {
    id: "M002",
    date: "2026-05-23",
    time: "09:15",
    type: "manual_income",
    description: "Ingreso de cambio chico adicional",
    amount: 5000,
    paymentMethod: "cash",
    user: "María González",
  },
  {
    id: "M003",
    date: "2026-05-23",
    time: "10:30",
    type: "sale",
    description: "Venta - Ticket #T001",
    amount: 8.0,
    paymentMethod: "cash",
    user: "María González",
    transactionId: "T001",
  },
  {
    id: "M004",
    date: "2026-05-23",
    time: "11:45",
    type: "sale",
    description: "Venta - Ticket #T002",
    amount: 7.15,
    paymentMethod: "card",
    user: "María González",
    transactionId: "T002",
  },
  {
    id: "M005",
    date: "2026-05-23",
    time: "13:00",
    type: "manual_expense",
    description: "Pago a proveedor - Insumos de cafetería",
    amount: 15000,
    paymentMethod: "cash",
    user: "María González",
  },
  {
    id: "M006",
    date: "2026-05-23",
    time: "14:20",
    type: "return_cash",
    description: "Devolución - Ticket #T002",
    amount: 7.15,
    paymentMethod: "cash",
    user: "María González",
    transactionId: "R001",
  },
  {
    id: "M007",
    date: "2026-05-23",
    time: "15:30",
    type: "sale",
    description: "Venta - Ticket #T003",
    amount: 15.5,
    paymentMethod: "card",
    user: "María González",
    transactionId: "T003",
  },
  {
    id: "M008",
    date: "2026-05-23",
    time: "16:00",
    type: "manual_expense",
    description: "Retiro de efectivo - Propietario",
    amount: 20000,
    paymentMethod: "cash",
    user: "María González",
  },
];

export const mockCreditNotes: CreditNote[] = [
  {
    id: "CN001",
    issueDate: "2026-05-22T14:30:00",
    originalTransactionId: "T125",
    customerName: "Juan Pérez",
    amount: 12.5,
    balance: 12.5,
    status: "active",
    items: [
      { name: "Café Espresso", quantity: 2, price: 2.5 },
      { name: "Croissant", quantity: 2, price: 3.0 },
      { name: "Muffin", quantity: 1, price: 2.5 },
    ],
  },
  {
    id: "CN002",
    issueDate: "2026-05-21T16:45:00",
    originalTransactionId: "T098",
    customerName: "Ana Martínez",
    amount: 6.5,
    balance: 3.0,
    status: "active",
    items: [{ name: "Sándwich Mixto", quantity: 1, price: 6.5 }],
  },
  {
    id: "CN003",
    issueDate: "2026-05-20T11:20:00",
    originalTransactionId: "T067",
    amount: 5.0,
    balance: 0,
    status: "used",
    items: [{ name: "Capuchino", quantity: 1, price: 3.5 }],
  },
];

export const mockReturns: Return[] = [
  {
    id: "R001",
    date: "2026-05-23",
    time: "14:20",
    originalTransactionId: "T002",
    items: [{ name: "Sándwich Mixto", quantity: 1, price: 6.5, restockItem: false }],
    refundType: "cash",
    amount: 7.15,
    user: "María González",
  },
  {
    id: "R002",
    date: "2026-05-22",
    time: "14:30",
    originalTransactionId: "T125",
    items: [
      { name: "Café Espresso", quantity: 2, price: 2.5, restockItem: true },
      { name: "Croissant", quantity: 2, price: 3.0, restockItem: true },
      { name: "Muffin", quantity: 1, price: 2.5, restockItem: true },
    ],
    refundType: "credit_note",
    amount: 12.5,
    creditNoteId: "CN001",
    user: "María González",
  },
];
