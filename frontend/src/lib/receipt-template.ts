import { getDefaultLogoUrl } from "./theme-logo";

export type ReceiptWidthMm = 55 | 80;

export type ReceiptLineItem = {
  name: string;
  quantity: number;
  price: number;
};

export type ReceiptTemplateOptions = {
  widthMm?: ReceiptWidthMm;
  storeName?: string;
  businessName?: string;
  logoUrl?: string;
  timestamp?: Date;
};

/**
 * HTML receipt for thermal printers via the OS print driver.
 * Direct ESC/POS drivers are planned for a future sprint.
 */
export function buildReceiptCss(widthMm: ReceiptWidthMm): string {
  const printableWidthMm = widthMm === 55 ? 48 : 72;

  return `
    @page { margin: 0; size: ${widthMm}mm auto; }
    * { box-sizing: border-box; }
    body {
      font-family: "Courier New", Courier, monospace;
      width: ${printableWidthMm}mm;
      margin: 0 auto;
      padding: 4mm 2mm;
      font-size: ${widthMm === 55 ? "10px" : "12px"};
      color: #000;
    }
    .header { text-align: center; margin-bottom: 6px; }
    .logo { max-width: 40mm; max-height: 18mm; object-fit: contain; margin-bottom: 4px; }
    h1 { font-size: ${widthMm === 55 ? "12px" : "14px"}; margin: 0 0 4px; }
    .meta { font-size: ${widthMm === 55 ? "9px" : "10px"}; margin-bottom: 6px; text-align: center; }
    table { width: 100%; border-collapse: collapse; }
    td { padding: 2px 0; vertical-align: top; }
    .item-name { width: 55%; word-break: break-word; }
    .item-qty { width: 15%; text-align: center; }
    .item-total { width: 30%; text-align: right; white-space: nowrap; }
    .divider { border-top: 1px dashed #000; margin: 6px 0; }
    .total { font-weight: bold; text-align: right; font-size: ${widthMm === 55 ? "11px" : "13px"}; }
    .footer { margin-top: 8px; text-align: center; font-size: ${widthMm === 55 ? "9px" : "10px"}; }
  `.trim();
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatMoney(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

function formatTimestamp(date: Date): string {
  return date.toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function buildReceiptHtml(
  items: ReceiptLineItem[],
  total: number,
  options: ReceiptTemplateOptions = {},
): string {
  const widthMm = options.widthMm === 55 ? 55 : 80;
  const storeName = escapeHtml(options.storeName ?? options.businessName ?? "Point of Sale");
  const timestamp = formatTimestamp(options.timestamp ?? new Date());

  const rows = items
    .map((item) => {
      const lineTotal = item.price * item.quantity;
      return `<tr>
        <td class="item-name">${escapeHtml(item.name)}</td>
        <td class="item-qty">${item.quantity}</td>
        <td class="item-total">${formatMoney(lineTotal)}</td>
      </tr>`;
    })
    .join("");

  const receiptLogoUrl = options.logoUrl ?? getDefaultLogoUrl();
  const logoBlock = `<img src="${escapeHtml(receiptLogoUrl)}" alt="Logo" class="logo" />`;

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Recibo</title>
  <style>
    ${buildReceiptCss(widthMm)}
  </style>
</head>
<body>
  <div class="header">
    ${logoBlock}
    <h1>${storeName}</h1>
    <div class="meta">${timestamp}</div>
  </div>
  <table>${rows}</table>
  <div class="divider"></div>
  <div class="total">Total: ${formatMoney(total)}</div>
  <div class="footer">Gracias por su compra</div>
</body>
</html>`;
}
