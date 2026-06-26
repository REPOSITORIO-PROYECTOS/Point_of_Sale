import type { CashClosingDetail } from "./pos-api";
import { buildCierreLoteHtml } from "./receipt-template";
import type { CierreLoteReceiptData, ReceiptWidthMm } from "./receipt-templates/types";
import { format } from "date-fns";
import { es } from "date-fns/locale";

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

function formatSaleTime(iso: string): string {
  return format(new Date(iso), "dd/MM HH:mm", { locale: es });
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

  const ingresos = movementTotals?.incomeTotal ?? 0;
  const egresos = movementTotals?.expenseTotal ?? 0;
  const cashIncome = movementTotals?.cashIncome ?? 0;
  const cashExpense = movementTotals?.cashExpense ?? 0;
  const cashNet = movementTotals?.cashNet ?? cashIncome - cashExpense;

  const egresosBuzon = closing.movements
    .filter((movement) => movement.type === "expense" && movement.paymentMethod === "buzon")
    .reduce((sum, movement) => sum + movement.amount, 0);

  const egresosEfectivo = Math.max(0, cashExpense - egresosBuzon);
  const referenciaEnCajon =
    closing.initialBalance + salesByMethod.cash + cashNet;

  return {
    empresa: {
      nombreFantasia: closing.businessData?.name?.trim() || "Mi Negocio",
      cuit: closing.businessData?.rut?.trim() || "—",
    },
    sesion: {
      id: closing.id,
      fechaApertura: new Date(closing.startTime),
      fechaCierre: new Date(closing.endTime),
      saldoInicial: closing.initialBalance,
      saldoFinalCalculado: closing.expectedAmount,
      saldoFinalDeclarado: closing.countedAmount,
      diferencia: closing.difference,
    },
    usuarioApertura: closing.openedByUsername ?? closing.user ?? "—",
    usuarioCierre: closing.closedByUsername ?? closing.user ?? "—",
    totales: {
      ventas: closing.totalSales,
      propinas: 0,
      ingresos,
      egresos,
      egresosEfectivo,
      egresosBuzon,
    },
    desgloseMetodosPago: {
      efectivo: salesByMethod.cash,
      transferencia: salesByMethod.transfer,
      bancario: salesByMethod.card + salesByMethod.qr,
    },
    desgloseIngresos: closing.movements
      .filter((movement) => movement.type === "income")
      .map((movement) => ({
        concepto: movement.description,
        monto: movement.amount,
      })),
    desgloseEgresos: closing.movements
      .filter((movement) => movement.type === "expense")
      .map((movement) => ({
        concepto: movement.description,
        monto: movement.amount,
        metodoPagoLabel: paymentLabel(movement.paymentMethod),
      })),
    arqueoEfectivo: {
      saldoInicial: closing.initialBalance,
      ventasEfectivo: salesByMethod.cash,
      ingresosEfectivo: cashIncome,
      egresosEfectivo,
      egresosBuzon,
      referenciaEnCajon,
    },
    detalleVentas: closing.sales.map((sale) => ({
      hora: formatSaleTime(sale.time),
      resumen: summarizeSaleItems(sale.items),
      metodoPago: paymentLabel(sale.paymentMethod),
      monto: sale.amount,
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
