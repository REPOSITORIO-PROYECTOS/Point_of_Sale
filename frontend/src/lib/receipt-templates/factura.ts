import {
  afipCodigoLabel,
  escapeHtml,
  formatMoney,
  formatReceiptDate,
  leyendasObligatoriasHtml,
  padNumeroComprobante,
  padPuntoVenta,
  ticketWidthCss,
} from "./shared";
import type { ReceiptBuildContext } from "./types";

function facturaCss(widthMm: 55 | 80): string {
  return `${ticketWidthCss(widthMm)}
    .header, .afip-footer { text-align: center; }
    .header h1 { margin: 0; font-size: 14px; font-weight: bold; word-wrap: break-word; }
    .header p { margin: 2px 0; }
    .factura-info { display: flex; justify-content: space-between; font-size: 11px; font-weight: bold; }
    .codigo-comprobante { text-align: center; font-size: 10px; margin: 3px 0; font-weight: bold; }
    hr { border: none; border-top: 1px dashed black; margin: 5px 0; }
    .cliente-info p, .pago-info p { margin-bottom: 3px; }
    .item-table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    .item-table th, .item-table td { padding: 2px 0; }
    .col-cant { width: 15%; text-align: left; }
    .col-desc { width: 45%; text-align: left; }
    .col-pu { width: 20%; text-align: right; }
    .col-subt { width: 20%; text-align: right; }
    .totals-section { margin-top: 8px; border-top: 1px dashed black; padding-top: 5px; }
    .totals-section .item { display: flex; justify-content: space-between; }
    .totals-section .discount { color: #555; }
    .total-final { font-size: 13px; font-weight: bold; }
    .observaciones-finales-section { margin-top: 8px; font-size: 9px; word-wrap: break-word; }
    .afip-footer { margin-top: 10px; }
    .afip-footer p { margin: 1px 0; font-weight: bold; }
    .afip-footer img { max-width: 100px; height: auto; margin-top: 5px; }
    .leyendas-obligatorias {
      margin-top: 8px; font-size: 8px; text-align: center;
      border-top: 1px dashed black; padding-top: 5px;
    }
    .leyendas-obligatorias p { margin: 1px 0; }
  `;
}

/** factura.html */
export function buildFacturaHtml(context: ReceiptBuildContext): string {
  const widthMm = context.widthMm === 55 ? 55 : 80;
  const emisor = context.emisor ?? { razonSocial: "Point of Sale" };
  const receptor = context.receptor ?? {};
  const afip = context.afip ?? {};
  const subtotal =
    context.subtotal ?? context.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const generalDiscount = (context.adjustments ?? [])
    .filter((adj) => adj.type === "discount")
    .reduce((sum, adj) => sum + Math.abs(adj.amount), 0);
  const fecha = formatReceiptDate(context.timestamp ?? new Date());
  const ventaId = context.ticketId ? `#${context.ticketId.slice(-8)}` : "S/D";
  const tipoNombre = afip.tipoComprobanteNombre ?? "FACTURA";
  const tipoLetra = afip.tipoComprobanteLetra ?? (afip.tipoAfip === 1 ? "A" : afip.tipoAfip === 11 ? "C" : "B");

  const rows = context.items
    .map(
      (item) => `<tr>
        <td class="col-cant">${item.quantity}</td>
        <td class="col-desc">${escapeHtml(item.name)}</td>
        <td class="col-pu">${formatMoney(item.price)}</td>
        <td class="col-subt">${formatMoney(item.price * item.quantity)}</td>
      </tr>`,
    )
    .join("");

  const ivaBlock =
    context.mostrarDesgloseIva && afip.neto != null && afip.iva != null
      ? `<div class="item"><span>Neto Gravado</span><span>${formatMoney(afip.neto)}</span></div>
         <div class="item"><span>IVA (${escapeHtml(afip.ivaRateLabel ?? "21%")})</span><span>${formatMoney(afip.iva)}</span></div>`
      : "";

  const paymentsBlock =
    context.payments && context.payments.length > 0
      ? `<hr><div class="pago-info"><p><strong>Forma de Pago:</strong></p>${context.payments
          .map((p) => `<p>${escapeHtml(p.label ?? p.type)}: ${formatMoney(p.amount)}</p>`)
          .join("")}</div>`
      : "";

  const afipFooter = afip.cae
    ? `<p>CAE N°: ${escapeHtml(afip.cae)}</p>
       <p>Vto. CAE: ${escapeHtml(afip.vencimientoCae ?? "S/D")}</p>
       ${afip.qrBase64 ? `<img src="data:image/png;base64,${escapeHtml(afip.qrBase64)}" alt="QR AFIP" />` : ""}
       <p>Comprobante Autorizado</p>`
    : `<p>Documento no válido como factura</p>`;

  const logoBlock = emisor.logoUrl
    ? `<img src="${escapeHtml(emisor.logoUrl)}" alt="Logo" style="max-width:60%;height:auto;margin-bottom:5px;" />`
    : "";

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Factura</title>
  <style>${facturaCss(widthMm)}</style>
</head>
<body>
  <div class="ticket">
    <div class="header">
      ${logoBlock}
      <h1>${escapeHtml(emisor.razonSocial)}</h1>
      ${emisor.domicilio ? `<p>${escapeHtml(emisor.domicilio)}</p>` : ""}
      ${emisor.cuit ? `<p>CUIT: ${escapeHtml(emisor.cuit)}</p>` : ""}
      ${emisor.ingresosBrutos ? `<p>IIBB: ${escapeHtml(emisor.ingresosBrutos)}</p>` : ""}
      ${emisor.inicioActividades ? `<p>Inicio Act.: ${escapeHtml(emisor.inicioActividades)}</p>` : ""}
      ${emisor.condicionIva ? `<p>IVA: ${escapeHtml(emisor.condicionIva)}</p>` : ""}
      <hr>
      <div class="factura-info">
        <span>${escapeHtml(tipoNombre)}</span>
        <span>${escapeHtml(tipoLetra)}</span>
      </div>
      <div class="codigo-comprobante">${afipCodigoLabel(afip.tipoAfip)}</div>
      <p>P.Venta: ${padPuntoVenta(emisor.puntoVenta)} - N°: ${padNumeroComprobante(afip.numeroComprobante)}</p>
      <p>Fecha: ${fecha}</p>
      <p>Venta ID: ${escapeHtml(ventaId)}</p>
      <hr>
    </div>
    <div class="cliente-info">
      <p><strong>Cliente:</strong> ${escapeHtml(receptor.nombreRazonSocial ?? "Consumidor Final")}</p>
      <p><strong>CUIT/DNI:</strong> ${escapeHtml(receptor.cuitODni ?? "S/D")}</p>
      <p><strong>IVA:</strong> ${escapeHtml(receptor.condicionIva ?? "Consumidor Final")}</p>
      <p><strong>Domicilio:</strong> ${escapeHtml(receptor.domicilio ?? "S/D")}</p>
    </div>
    <hr>
    <table class="item-table">
      <thead><tr>
        <th class="col-cant">Cant</th><th class="col-desc">Desc</th>
        <th class="col-pu">P/U</th><th class="col-subt">Subt</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="totals-section">
      <div class="item"><span>Subtotal</span><span>${formatMoney(subtotal)}</span></div>
      ${
        generalDiscount > 0
          ? `<div class="item discount"><span>Desc. Gral.</span><span>-${formatMoney(generalDiscount)}</span></div>`
          : ""
      }
      <hr>
      ${ivaBlock}
      <div class="item total-final"><span>TOTAL</span><span>${formatMoney(context.total)}</span></div>
    </div>
    ${paymentsBlock}
    ${
      context.observaciones
        ? `<div class="observaciones-finales-section"><pre style="font-family:'Courier New',monospace;margin:0;white-space:pre-wrap;">${escapeHtml(context.observaciones)}</pre></div>`
        : ""
    }
    <hr>
    <div class="afip-footer">${afipFooter}</div>
    ${leyendasObligatoriasHtml()}
  </div>
</body>
</html>`;
}
