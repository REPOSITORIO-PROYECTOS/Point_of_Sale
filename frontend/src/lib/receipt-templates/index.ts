import { buildFacturaHtml } from "./factura";
import { buildPresupuestoHtml } from "./presupuesto";
import { buildReciboHtml } from "./recibo";
import type { ReceiptBuildContext } from "./types";

export { buildCierreLoteHtml } from "./cierre-lote";
export { buildEgresoHtml, buildIngresoHtml } from "./egreso";
export { buildFacturaHtml } from "./factura";
export { buildPresupuestoHtml } from "./presupuesto";
export { buildReciboHtml, buildComprobanteHtml } from "./recibo";
export type {
  CierreLoteReceiptData,
  EgresoReceiptData,
  ReceiptAfip,
  ReceiptBuildContext,
  ReceiptEmisor,
  ReceiptReceptor,
  ReceiptTemplateOptions,
} from "./types";

export function buildReceiptFromContext(context: ReceiptBuildContext): string {
  switch (context.voucherType ?? "comprobante") {
    case "factura":
      return buildFacturaHtml(context);
    case "presupuesto":
      return buildPresupuestoHtml(context);
    default:
      return buildReciboHtml(context);
  }
}
