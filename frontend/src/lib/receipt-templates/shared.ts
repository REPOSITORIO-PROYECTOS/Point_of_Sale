import type { ReceiptWidthMm } from "./types";

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function formatMoney(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

export function formatReceiptDate(date: Date): string {
  return date.toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function padPuntoVenta(value: number | undefined): string {
  return String(value ?? 1).padStart(5, "0");
}

export function padNumeroComprobante(value: number | undefined): string {
  return String(value ?? 0).padStart(8, "0");
}

export function afipCodigoLabel(tipoAfip: number | undefined): string {
  if (tipoAfip === 1) return "Cod. 001";
  if (tipoAfip === 6) return "Cod. 006";
  if (tipoAfip === 11) return "Cod. 011";
  return "Cod. 083";
}

export function ticketWidthCss(widthMm: ReceiptWidthMm): string {
  const fontSize = widthMm === 55 ? "9px" : "10px";

  return `
    @page { margin: 0; size: ${widthMm}mm auto; }
    * { box-sizing: border-box; }
    html {
      margin: 0;
      padding: 0;
      background: #ececec;
    }
    html, body {
      font-family: 'Courier New', Courier, monospace;
      font-size: ${fontSize};
      width: ${widthMm}mm;
      max-width: ${widthMm}mm;
      min-height: 100%;
      margin: 0 auto;
      padding: 0;
      color: #000;
      background: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .ticket {
      width: 100%;
      max-width: 100%;
      padding: 2mm 3mm;
      margin: 0;
    }
    @media print {
      html { background: #fff; }
      html, body {
        width: ${widthMm}mm !important;
        max-width: ${widthMm}mm !important;
        margin: 0 !important;
      }
      .ticket { padding: 1mm 2mm; }
    }
  `.trim();
}

export function leyendasObligatoriasHtml(): string {
  return `<div class="leyendas-obligatorias">
    <p>Defensa del Consumidor</p>
    <p>0800-333-6634</p>
    <p>Régimen de Transparencia</p>
    <p>Fiscal al Consumidor</p>
    <p>Ley 27.743</p>
  </div>`;
}
