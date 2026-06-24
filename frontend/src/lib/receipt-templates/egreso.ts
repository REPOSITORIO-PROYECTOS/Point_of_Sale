import { escapeHtml, formatMoney, formatReceiptDate, ticketWidthCss } from "./shared";
import type { EgresoReceiptData } from "./types";

/** egreso.html */
export function buildEgresoHtml(data: EgresoReceiptData, widthMm: 55 | 80 = 80): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Comprobante de Egreso</title>
  <style>
    ${ticketWidthCss(widthMm)}
    .header { text-align: center; }
    .header h1 { margin: 4px 0; font-size: 13px; }
    .row { display: flex; justify-content: space-between; margin: 2px 0; }
    .total { font-weight: bold; font-size: 12px; margin-top: 6px; }
    hr { border: none; border-top: 1px dashed #000; margin: 6px 0; }
    .footer { text-align: center; font-size: 9px; margin-top: 8px; }
  </style>
</head>
<body>
  <div class="ticket">
    <div class="header">
      <h1>${escapeHtml(data.nombreNegocio)}</h1>
      <p><strong>COMPROBANTE DE EGRESO</strong></p>
    </div>
    <hr>
    <div class="row"><span>Fecha:</span><span>${formatReceiptDate(data.fechaHora)}</span></div>
    <div class="row"><span>Operador:</span><span>${escapeHtml(data.nombreUsuario)}</span></div>
    <div class="row"><span>Método:</span><span>${escapeHtml(data.metodoPagoLabel)}</span></div>
    <div class="row"><span>Concepto:</span><span>${escapeHtml(data.concepto)}</span></div>
    <hr>
    <div class="row total"><span>MONTO EGRESO:</span><span>${formatMoney(data.monto)}</span></div>
    <hr>
    <p class="footer">Mov. #${escapeHtml(String(data.idMovimiento))} · Sesión ${escapeHtml(String(data.idSesion))}</p>
    <p class="footer">Documento no válido como factura</p>
  </div>
</body>
</html>`;
}

/** ingreso: mismo layout que egreso */
export function buildIngresoHtml(data: EgresoReceiptData, widthMm: 55 | 80 = 80): string {
  const html = buildEgresoHtml(
    { ...data, concepto: data.concepto },
    widthMm,
  );
  return html
    .replace("COMPROBANTE DE EGRESO", "COMPROBANTE DE INGRESO")
    .replace("MONTO EGRESO:", "MONTO INGRESO:");
}
