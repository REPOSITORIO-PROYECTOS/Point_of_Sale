import { sanitizePrintableImageUrl } from "./thermal-print";
import {
  buildReceiptFromContext,
  type ReceiptAfip,
  type ReceiptEmisor,
  type ReceiptReceptor,
  type ReceiptTemplateOptions,
} from "./receipt-templates";

export type {
  ReceiptAdjustment,
  ReceiptAfip,
  ReceiptEmisor,
  ReceiptLineItem,
  ReceiptPaymentLine,
  ReceiptReceptor,
  ReceiptTemplateOptions,
  ReceiptVoucherType,
  ReceiptWidthMm,
} from "./receipt-templates/types";

/** @deprecated Usar buildReceiptFromContext; se mantiene para tests legacy. */
export function buildReceiptCss(widthMm: import("./receipt-templates/types").ReceiptWidthMm): string {
  return widthMm === 55 ? "55mm" : "80mm";
}

function resolveEmisor(options: ReceiptTemplateOptions): ReceiptEmisor {
  const name = options.emisor?.razonSocial ?? options.storeName ?? options.businessName ?? "Point of Sale";
  return {
    razonSocial: name,
    logoUrl: sanitizePrintableImageUrl(options.emisor?.logoUrl ?? options.logoUrl),
    cuit: options.emisor?.cuit,
    domicilio: options.emisor?.domicilio,
    ingresosBrutos: options.emisor?.ingresosBrutos,
    inicioActividades: options.emisor?.inicioActividades,
    condicionIva: options.emisor?.condicionIva,
    puntoVenta: options.emisor?.puntoVenta,
  };
}

function resolveAfip(options: ReceiptTemplateOptions): ReceiptAfip | undefined {
  if (!options.afip && !options.afipCae) {
    return options.voucherType === "factura" ? {} : undefined;
  }

  return {
    ...options.afip,
    cae: options.afip?.cae ?? options.afipCae,
  };
}

export function buildReceiptHtml(
  items: import("./receipt-templates/types").ReceiptLineItem[],
  total: number,
  options: ReceiptTemplateOptions = {},
): string {
  return buildReceiptFromContext({
    items,
    total,
    subtotal: options.subtotal,
    widthMm: options.widthMm === 55 ? 55 : 80,
    voucherType: options.voucherType ?? "comprobante",
    adjustments: options.adjustments,
    payments: options.payments,
    ticketId: options.ticketId,
    timestamp: options.timestamp,
    emisor: resolveEmisor(options),
    receptor: options.receptor,
    afip: resolveAfip(options),
    observaciones: options.observaciones ?? options.footerNote,
    mostrarDesgloseIva: options.mostrarDesgloseIva ?? options.voucherType === "factura",
  });
}

/** Abre vista previa del ticket en una ventana del navegador (sin imprimir). */
export function openReceiptPreview(html: string): void {
  const previewWindow = window.open("", "_blank", "width=420,height=720");
  if (!previewWindow) {
    throw new Error("No se pudo abrir la vista previa del ticket");
  }
  previewWindow.document.open();
  previewWindow.document.write(html);
  previewWindow.document.close();
}

/** Vista previa en texto plano (formato ESC/POS) — útil sin impresora o para depuración. */
export function openReceiptTextPreview(text: string, widthMm: 55 | 80 = 80): void {
  const previewWindow = window.open("", "_blank", "width=480,height=720");
  if (!previewWindow) {
    throw new Error("No se pudo abrir la vista previa de texto");
  }

  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  previewWindow.document.open();
  previewWindow.document.write(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Vista previa texto (${widthMm} mm)</title>
  <style>
    body { font-family: "Consolas", "Courier New", monospace; font-size: 12px; margin: 0; padding: 16px; background: #f8f8f8; }
    pre { background: #fff; border: 1px dashed #ccc; padding: 12px; white-space: pre-wrap; word-break: break-word; max-width: ${widthMm === 55 ? "280px" : "380px"}; margin: 0 auto; }
    h1 { font: 600 14px system-ui; text-align: center; color: #444; }
    p { font: 12px system-ui; text-align: center; color: #666; }
  </style>
</head>
<body>
  <h1>Ticket — modo texto ESC/POS</h1>
  <p>Ancho ${widthMm} mm · ${widthMm === 55 ? 32 : 48} columnas</p>
  <pre>${escaped}</pre>
</body>
</html>`);
  previewWindow.document.close();
}

export {
  buildCierreLoteHtml,
  buildEgresoHtml,
  buildFacturaHtml,
  buildIngresoHtml,
  buildPresupuestoHtml,
  buildReciboHtml,
} from "./receipt-templates";
