import type { CashClosingDetail } from "./pos-api";
import type { ReceiptPreviewState } from "./receipt-preview-types";
import { canPrintDirectly, previewHtmlDocument, printHtmlDocument } from "./print-receipt";
import { buildCierreLoteHtml } from "./receipt-template";
import type { CierreLoteReceiptData, ReceiptWidthMm } from "./receipt-templates/types";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export type CashClosingReceiptBusinessContext = {
  businessName?: string | null;
  taxId?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
};

export function enrichCashClosingForReceipt(
  closing: CashClosingDetail,
  business?: CashClosingReceiptBusinessContext,
): CashClosingDetail {
  if (!business) {
    return closing;
  }

  return {
    ...closing,
    businessData: {
      name: business.businessName ?? closing.businessData?.name ?? "",
      rut: business.taxId ?? closing.businessData?.rut ?? "",
      phone: business.phone ?? closing.businessData?.phone ?? "",
      email: business.email ?? closing.businessData?.email ?? "",
      address: business.address ?? closing.businessData?.address ?? "",
    },
  };
}

const PAYMENT_LABELS: Record<string, string> = {
  cash: "Efectivo",
  card: "Tarjeta",
  transfer: "Transferencia",
  qr: "QR",
  mixed: "Mixto",
  buzon: "Buzón",
};

function paymentLabel(method: string): string {
  return PAYMENT_LABELS[method] ?? method;
}

function toAmount(value: unknown): number {
  const amount = typeof value === "number" ? value : Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

function formatSaleTimeForReceipt(time: string, sessionStart?: string): string {
  if (!time.trim()) {
    return "—";
  }

  const parsed = new Date(time);
  if (!Number.isNaN(parsed.getTime())) {
    return format(parsed, "dd/MM HH:mm", { locale: es });
  }

  if (sessionStart) {
    const sessionDate = format(new Date(sessionStart), "dd/MM", { locale: es });
    return `${sessionDate} ${time}`;
  }

  return time;
}

function summarizeSaleItems(
  items: CashClosingDetail["sales"][number]["items"],
): string {
  return items
    .map((item) => `${item.quantity}x ${item.name}`)
    .join(", ")
    .slice(0, 40);
}

export function mapCashClosingDetailToCierreLote(
  closing: CashClosingDetail,
): CierreLoteReceiptData {
  const movementTotals = closing.movementTotals;
  const salesByMethod = closing.salesByMethod ?? { cash: 0, card: 0, transfer: 0, qr: 0 };
  const movements = closing.movements ?? [];
  const sales = closing.sales ?? [];

  const ingresos = toAmount(movementTotals?.incomeTotal);
  const egresos = toAmount(movementTotals?.expenseTotal);
  const cashIncome = toAmount(movementTotals?.cashIncome);
  const cashExpense = toAmount(movementTotals?.cashExpense);
  const cashNet = toAmount(movementTotals?.cashNet ?? cashIncome - cashExpense);

  const egresosBuzon = movements
    .filter((movement) => movement.type === "expense" && movement.paymentMethod === "buzon")
    .reduce((sum, movement) => sum + toAmount(movement.amount), 0);

  const egresosEfectivo = Math.max(0, cashExpense - egresosBuzon);
  const referenciaEnCajon =
    toAmount(closing.initialBalance) + toAmount(salesByMethod.cash) + cashNet;

  return {
    empresa: {
      nombreFantasia: closing.businessData?.name?.trim() || "Mi Negocio",
      cuit: closing.businessData?.rut?.trim() || "—",
    },
    sesion: {
      id: closing.id,
      fechaApertura: new Date(closing.startTime),
      fechaCierre: new Date(closing.endTime),
      saldoInicial: toAmount(closing.initialBalance),
      saldoFinalCalculado: toAmount(closing.expectedAmount),
      saldoFinalDeclarado: toAmount(closing.countedAmount),
      diferencia: toAmount(closing.difference),
    },
    usuarioApertura: closing.openedByUsername ?? closing.user ?? "—",
    usuarioCierre: closing.closedByUsername ?? closing.user ?? "—",
    totales: {
      ventas: toAmount(closing.totalSales),
      propinas: 0,
      ingresos,
      egresos,
      egresosEfectivo,
      egresosBuzon,
    },
    desgloseMetodosPago: {
      efectivo: toAmount(salesByMethod.cash),
      transferencia: toAmount(salesByMethod.transfer),
      bancario: toAmount(salesByMethod.card) + toAmount(salesByMethod.qr),
    },
    desgloseIngresos: movements
      .filter((movement) => movement.type === "income")
      .map((movement) => ({
        concepto: movement.description,
        monto: toAmount(movement.amount),
      })),
    desgloseEgresos: movements
      .filter((movement) => movement.type === "expense")
      .map((movement) => ({
        concepto: movement.description,
        monto: toAmount(movement.amount),
        metodoPagoLabel: paymentLabel(movement.paymentMethod),
      })),
    arqueoEfectivo: {
      saldoInicial: toAmount(closing.initialBalance),
      ventasEfectivo: toAmount(salesByMethod.cash),
      ingresosEfectivo: cashIncome,
      egresosEfectivo,
      egresosBuzon,
      referenciaEnCajon,
    },
    detalleVentas: sales.map((sale) => ({
      hora: formatSaleTimeForReceipt(sale.time, closing.startTime),
      resumen: summarizeSaleItems(sale.items ?? []),
      metodoPago: paymentLabel(sale.paymentMethod),
      monto: toAmount(sale.amount),
    })),
    fechaEmision: new Date(),
  };
}

export function buildCashClosingReceiptHtml(
  closing: CashClosingDetail,
  widthMm: ReceiptWidthMm = 80,
): string {
  return buildCierreLoteHtml(mapCashClosingDetailToCierreLote(closing), widthMm);
}

export function buildCashClosingReceiptText(closing: CashClosingDetail): string {
  const data = mapCashClosingDetailToCierreLote(closing);
  const lines: string[] = [
    data.empresa.nombreFantasia.toUpperCase(),
    `CUIT: ${data.empresa.cuit}`,
    "CIERRE DE CAJA",
    `Sesion: ${data.sesion.id}`,
    `Ventas: $${data.totales.ventas.toFixed(2)}`,
    `Esperado: $${data.sesion.saldoFinalCalculado.toFixed(2)}`,
    `Contado: $${data.sesion.saldoFinalDeclarado.toFixed(2)}`,
    `Diferencia: $${data.sesion.diferencia.toFixed(2)}`,
  ];

  if (data.detalleVentas && data.detalleVentas.length > 0) {
    lines.push("--- Ventas ---");
    for (const venta of data.detalleVentas) {
      lines.push(`${venta.hora} ${venta.resumen} [${venta.metodoPago}] $${venta.monto.toFixed(2)}`);
    }
  }

  return lines.join("\n");
}

export function buildCashClosingPreviewState(
  closing: CashClosingDetail,
  options: {
    widthMm?: ReceiptWidthMm;
    business?: CashClosingReceiptBusinessContext;
  } = {},
): ReceiptPreviewState {
  const widthMm = options.widthMm ?? 80;
  const enriched = enrichCashClosingForReceipt(closing, options.business);
  return {
    html: buildCashClosingReceiptHtml(enriched, widthMm),
    text: buildCashClosingReceiptText(enriched),
    widthMm,
    title: `Cierre de caja #${closing.id.slice(-8)}`,
  };
}

export async function emitCashClosingReceipt(
  closing: CashClosingDetail,
  options: {
    widthMm?: ReceiptWidthMm;
    business?: CashClosingReceiptBusinessContext;
    previewOnly?: boolean;
  } = {},
): Promise<void> {
  const preview = buildCashClosingPreviewState(closing, options);

  if (options.previewOnly || !canPrintDirectly()) {
    previewHtmlDocument(preview);
    return;
  }

  await printHtmlDocument(preview.html, preview.widthMm);
}
