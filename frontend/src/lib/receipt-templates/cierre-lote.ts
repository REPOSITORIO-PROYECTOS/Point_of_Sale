import { escapeHtml, formatMoney, formatReceiptDate, ticketWidthCss } from "./shared";
import type { CierreLoteReceiptData } from "./types";

/** cierre_lote_detallado.html */
export function buildCierreLoteHtml(data: CierreLoteReceiptData, widthMm: 55 | 80 = 80): string {
  const fechaEmision = formatReceiptDate(data.fechaEmision ?? new Date());

  const ingresosDetalle = (data.desgloseIngresos ?? [])
    .map(
      (ingreso) => `<div class="item">
        <p class="concepto">${escapeHtml(ingreso.concepto.slice(0, 20))}:</p>
        <p class="monto">${formatMoney(ingreso.monto)}</p>
      </div>`,
    )
    .join("");

  const egresosDetalle = (data.desgloseEgresos ?? [])
    .map(
      (egreso) => `<div class="item">
        <p class="concepto">[${escapeHtml(egreso.metodoPagoLabel ?? "Efectivo")}] ${escapeHtml(egreso.concepto.slice(0, 14))}:</p>
        <p class="monto">${formatMoney(egreso.monto)}</p>
      </div>`,
    )
    .join("");

  const ventasDetalle = (data.detalleVentas ?? [])
    .map(
      (venta) => `<div class="item">
        <p class="concepto">${escapeHtml(venta.hora)} ${escapeHtml(venta.resumen.slice(0, 28))} [${escapeHtml(venta.metodoPago)}]</p>
        <p class="monto">${formatMoney(venta.monto)}</p>
      </div>`,
    )
    .join("");

  const arqueoBlock = data.arqueoEfectivo
    ? `<p class="section-title">Referencia Efectivo en Cajón</p>
       <hr>
       <p style="font-size:9px;text-align:center;margin:2px 0;">Contá solo el efectivo físico. Lo retirado a Buzón ya no está en el cajón.</p>
       <div class="item"><p>Saldo inicial:</p><p>${formatMoney(data.arqueoEfectivo.saldoInicial)}</p></div>
       <div class="item"><p>(+) Ventas efectivo:</p><p>${formatMoney(data.arqueoEfectivo.ventasEfectivo)}</p></div>
       <div class="item"><p>(+) Ingresos efectivo:</p><p>${formatMoney(data.arqueoEfectivo.ingresosEfectivo)}</p></div>
       <div class="item"><p>(-) Egresos efectivo:</p><p>${formatMoney(data.arqueoEfectivo.egresosEfectivo)}</p></div>
       <div class="item"><p>(-) Egresos a Buzón:</p><p>${formatMoney(data.arqueoEfectivo.egresosBuzon)}</p></div>
       <hr>
       <div class="item total-line"><p>EFECTIVO REFERENCIA:</p><p>${formatMoney(data.arqueoEfectivo.referenciaEnCajon)}</p></div>
       <hr>`
    : "";

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Cierre de Lote Detallado</title>
  <style>
    ${ticketWidthCss(widthMm)}
    .header, .footer { text-align: center; }
    h1 { margin: 0; font-size: 14px; text-transform: uppercase; word-wrap: break-word; font-weight: bold; }
    h2 { margin: 5px 0; font-size: 13px; border-top: 1px dashed black; border-bottom: 1px dashed black; padding: 4px 0; font-weight: bold; }
    p { margin: 3px 0; }
    hr { border: none; border-top: 1px dashed black; margin: 4px 0; }
    .item { display: flex; justify-content: space-between; }
    .item .concepto { width: 70%; text-align: left; word-wrap: break-word; }
    .item .monto { width: 30%; text-align: right; }
    .total-line { font-weight: bold; }
    .section-title { font-weight: bold; margin-top: 10px; margin-bottom: 5px; text-align: center; text-transform: uppercase; }
    .info-line { display: flex; justify-content: space-between; align-items: center; }
    .info-line .label { font-weight: bold; text-align: left; white-space: nowrap; }
    .info-line .value { text-align: right; }
    .final-message { margin-top: 20px; font-weight: bold; }
  </style>
</head>
<body>
  <div class="ticket">
    <div class="header">
      <h1>${escapeHtml(data.empresa.nombreFantasia)}</h1>
      <p>CUIT: ${escapeHtml(data.empresa.cuit)}</p>
      <h2>CIERRE DE CAJA</h2>
      <p>Sesión ID: ${escapeHtml(String(data.sesion.id))}</p>
    </div>
    <hr>
    <div class="info-line"><span class="label">Impresión:</span><span class="value">${fechaEmision}</span></div>
    <div class="info-line"><span class="label">Apertura:</span><span class="value">${formatReceiptDate(data.sesion.fechaApertura)}</span></div>
    <div class="info-line"><span class="label">Cajero Apertura:</span><span class="value">${escapeHtml(data.usuarioApertura)}</span></div>
    <div class="info-line"><span class="label">Cierre:</span><span class="value">${formatReceiptDate(data.sesion.fechaCierre)}</span></div>
    <div class="info-line"><span class="label">Cajero Cierre:</span><span class="value">${escapeHtml(data.usuarioCierre)}</span></div>
    <p class="section-title">Arqueo de Caja</p>
    <hr>
    <div class="item"><p>Saldo Inicial:</p><p>${formatMoney(data.sesion.saldoInicial)}</p></div>
    <div class="item"><p>(+) Total Ventas:</p><p>${formatMoney(data.totales.ventas)}</p></div>
    <div class="item"><p>(+) Total Propinas:</p><p>${formatMoney(data.totales.propinas ?? 0)}</p></div>
    <div class="item"><p>(+) Ingresos Varios:</p><p>${formatMoney(data.totales.ingresos)}</p></div>
    <div class="item"><p>(-) Egresos (total):</p><p>${formatMoney(data.totales.egresos)}</p></div>
    <hr>
    <div class="item total-line"><p>SALDO CALCULADO:</p><p>${formatMoney(data.sesion.saldoFinalCalculado)}</p></div>
    <div class="item"><p>SALDO DECLARADO:</p><p>${formatMoney(data.sesion.saldoFinalDeclarado)}</p></div>
    <hr>
    <div class="item total-line"><p>DIFERENCIA:</p><p>${formatMoney(data.sesion.diferencia)}</p></div>
    <p class="section-title">Desglose de Ventas</p>
    <hr>
    <div class="item"><p>Ventas en Efectivo:</p><p>${formatMoney(data.desgloseMetodosPago.efectivo)}</p></div>
    <div class="item"><p>Ventas por Transferencia:</p><p>${formatMoney(data.desgloseMetodosPago.transferencia)}</p></div>
    <div class="item"><p>Ventas por POS:</p><p>${formatMoney(data.desgloseMetodosPago.bancario)}</p></div>
    <div class="item total-line"><p>TOTAL VENTAS:</p><p>${formatMoney(data.totales.ventas)}</p></div>
    ${ventasDetalle ? `<p class="section-title">Detalle de Ventas</p><hr>${ventasDetalle}` : ""}
    ${arqueoBlock}
    ${ingresosDetalle ? `<p class="section-title">Detalle de Ingresos</p><hr>${ingresosDetalle}` : ""}
    ${egresosDetalle ? `<p class="section-title">Detalle de Egresos</p><hr>${egresosDetalle}` : ""}
    <hr>
    <p class="footer final-message">Fin del reporte de cierre.</p>
  </div>
</body>
</html>`;
}
