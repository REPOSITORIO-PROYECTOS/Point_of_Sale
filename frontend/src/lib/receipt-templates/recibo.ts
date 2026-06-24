import {
  escapeHtml,
  formatMoney,
  formatReceiptDate,
  leyendasObligatoriasHtml,
  ticketWidthCss,
} from "./shared";
import type { ReceiptBuildContext } from "./types";

function reciboCss(widthMm: 55 | 80): string {
  return `${ticketWidthCss(widthMm)}
    .header { text-align: center; }
    .header h1 { margin: 0; font-size: 14px; word-wrap: break-word; }
    .header p, .header h2 { margin: 3px 0; font-size: 11px; }
    p { margin: 3px 0; }
    hr { border: none; border-top: 1px dashed black; margin: 5px 0; }
    .item-list { margin: 8px 0; }
    .item { display: flex; justify-content: space-between; }
    .item .description { flex-grow: 1; text-align: left; word-wrap: break-word; }
    .item .price { text-align: right; white-space: nowrap; padding-left: 5px; }
    .item-detail, .item-discount {
      font-size: 9px; color: #555; padding-left: 8px; margin-top: -2px;
    }
    .item-discount { color: #d9534f; }
    .totals-section { margin-top: 8px; }
    .totals-section .item { font-weight: bold; }
    .totals-section .discount { color: #d9534f; }
    .total-final {
      font-weight: bold; font-size: 14px; text-align: right;
      margin-top: 8px; padding-top: 4px; border-top: 1px solid black;
    }
    .footer { text-align: center; margin-top: 12px; }
    .disclaimer { font-weight: bold; text-align: center; margin-top: 15px; }
  `;
}

/** comprobante.html / recibo.html — comprobante no fiscal */
export function buildReciboHtml(context: ReceiptBuildContext): string {
  const widthMm = context.widthMm === 55 ? 55 : 80;
  const emisor = context.emisor ?? { razonSocial: "Point of Sale" };
  const receptor = context.receptor ?? {};
  const subtotal =
    context.subtotal ?? context.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const generalDiscount = (context.adjustments ?? [])
    .filter((adj) => adj.type === "discount")
    .reduce((sum, adj) => sum + Math.abs(adj.amount), 0);
  const fecha = formatReceiptDate(context.timestamp ?? new Date());
  const ventaId = context.ticketId ? `#${context.ticketId.slice(-8)}` : "S/D";

  const itemsHtml = context.items
    .map((item) => {
      const lineTotal = item.price * item.quantity;
      return `<div class="item">
        <span class="description">${escapeHtml(item.name)}</span>
        <span class="price">${formatMoney(lineTotal)}</span>
      </div>
      <div class="item item-detail">
        <span>${item.quantity} x ${formatMoney(item.price)}</span>
      </div>`;
    })
    .join("");

  const discountHtml =
    generalDiscount > 0
      ? `<div class="item discount">
          <p>DESCUENTO GRAL.</p>
          <p>-${formatMoney(generalDiscount)}</p>
        </div>`
      : "";

  const observacionesHtml = context.observaciones
    ? `<hr><p><strong>Observaciones:</strong> ${escapeHtml(context.observaciones)}</p>`
    : "";

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Recibo de Pago</title>
  <style>${reciboCss(widthMm)}</style>
</head>
<body>
  <div class="ticket">
    <div class="header">
      <h1>${escapeHtml(emisor.razonSocial)}</h1>
      ${emisor.cuit ? `<p>CUIT: ${escapeHtml(emisor.cuit)}</p>` : ""}
      ${emisor.domicilio ? `<p>${escapeHtml(emisor.domicilio)}</p>` : ""}
      <hr>
      <h2>RECIBO DE PAGO</h2>
      <hr>
    </div>
    <p>Fecha: ${fecha}</p>
    <p>Venta ID: ${escapeHtml(ventaId)}</p>
    <p>Cliente: ${escapeHtml(receptor.nombreRazonSocial ?? "Consumidor Final")}</p>
    <p>CUIT/DNI: ${escapeHtml(receptor.cuitODni ?? "S/D")}</p>
    <hr>
    <div class="item-list">${itemsHtml}</div>
    <div class="totals-section">
      <hr>
      <div class="item"><p>SUBTOTAL:</p><p>${formatMoney(subtotal)}</p></div>
      ${discountHtml}
      <p class="total-final">TOTAL A PAGAR: ${formatMoney(context.total)}</p>
    </div>
    ${observacionesHtml}
    <p class="disclaimer">COMPROBANTE NO VÁLIDO COMO FACTURA</p>
    <p class="footer">....................</p>
    <p class="footer">Firma y Aclaración</p>
  </div>
</body>
</html>`;
}

/** comprobante.html con bloque AFIP opcional (no fiscal) */
export function buildComprobanteHtml(context: ReceiptBuildContext): string {
  return buildReciboHtml(context);
}

export { leyendasObligatoriasHtml };
