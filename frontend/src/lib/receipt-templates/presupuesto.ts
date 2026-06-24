import { escapeHtml, formatMoney, formatReceiptDate, ticketWidthCss } from "./shared";
import type { ReceiptBuildContext } from "./types";

function presupuestoCss(widthMm: 55 | 80): string {
  return `${ticketWidthCss(widthMm)}
    .header, .footer { text-align: center; }
    .header h1 { margin: 0; font-size: 13px; word-wrap: break-word; }
    .header h2 { margin: 4px 0; font-size: 12px; }
    p { margin: 2px 0; }
    hr { border: none; border-top: 1px dashed black; margin: 5px 0; }
    .cliente-info { margin-top: 5px; }
    .cliente-info p { margin-bottom: 3px; }
    .item-list { margin-top: 8px; }
    .item { display: flex; justify-content: space-between; margin: 3px 0; }
    .item .cantidad { width: 15%; text-align: left; }
    .item .descripcion { flex-grow: 1; text-align: left; word-wrap: break-word; padding: 0 4px; }
    .item .unitario, .item .subtotal { width: 25%; text-align: right; }
    .item-header { font-weight: bold; border-bottom: 1px solid black; padding-bottom: 2px; }
    .item-discount { font-size: 9px; color: #d9534f; padding-left: 8px; margin-top: -2px; }
    .totals-section { margin-top: 8px; border-top: 1px dashed black; padding-top: 5px; }
    .totals-section .item { font-weight: bold; }
    .totals-section .discount { color: #d9534f; }
    .total-final { font-weight: bold; font-size: 13px; }
    .footer { font-size: 9px; margin-top: 10px; text-align: left; }
  `;
}

/** presupuesto.html */
export function buildPresupuestoHtml(context: ReceiptBuildContext): string {
  const widthMm = context.widthMm === 55 ? 55 : 80;
  const emisor = context.emisor ?? { razonSocial: "Point of Sale" };
  const receptor = context.receptor ?? {};
  const subtotal =
    context.subtotal ?? context.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const generalDiscount = (context.adjustments ?? [])
    .filter((adj) => adj.type === "discount")
    .reduce((sum, adj) => sum + Math.abs(adj.amount), 0);
  const fecha = formatReceiptDate(context.timestamp ?? new Date());

  const itemsHtml = context.items
    .map(
      (item) => `<div class="item">
        <span class="cantidad">${item.quantity}</span>
        <span class="descripcion">${escapeHtml(item.name)}</span>
        <span class="unitario">${formatMoney(item.price)}</span>
        <span class="subtotal">${formatMoney(item.price * item.quantity)}</span>
      </div>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Presupuesto</title>
  <style>${presupuestoCss(widthMm)}</style>
</head>
<body>
  <div class="ticket">
    <div class="header">
      <h1>${escapeHtml(emisor.razonSocial)}</h1>
      ${emisor.domicilio ? `<p>${escapeHtml(emisor.domicilio)}</p>` : ""}
      <hr>
      <h2>PRESUPUESTO</h2>
      <p>Fecha: ${fecha}</p>
      <p>Validez: 15 días</p>
      <hr>
    </div>
    <div class="cliente-info">
      <p><strong>Cliente:</strong> ${escapeHtml(receptor.nombreRazonSocial ?? "A definir")}</p>
      <p><strong>CUIT/DNI:</strong> ${escapeHtml(receptor.cuitODni ?? "S/D")}</p>
    </div>
    <div class="item-list">
      <div class="item item-header">
        <span class="cantidad">Cant</span>
        <span class="descripcion">Descripción</span>
        <span class="unitario">P/U</span>
        <span class="subtotal">Subtotal</span>
      </div>
      ${itemsHtml}
    </div>
    <div class="totals-section">
      <div class="item"><span>SUBTOTAL</span><span>${formatMoney(subtotal)}</span></div>
      ${
        generalDiscount > 0
          ? `<div class="item discount"><span>DESCUENTO GRAL.</span><span>-${formatMoney(generalDiscount)}</span></div>`
          : ""
      }
      <div class="item total-final"><span>TOTAL</span><span>${formatMoney(context.total)}</span></div>
    </div>
    <div class="footer">
      <strong>Términos:</strong><br />
      Los precios están expresados en Pesos Argentinos. Este presupuesto no incluye IVA.
    </div>
  </div>
</body>
</html>`;
}
