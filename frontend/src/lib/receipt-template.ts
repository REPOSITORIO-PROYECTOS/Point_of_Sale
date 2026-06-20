import { getDefaultLogoUrl } from "./theme-logo";

export type ReceiptWidthMm = 55 | 80;

export type ReceiptVoucherType = "factura" | "comprobante" | "presupuesto";

export type ReceiptLineItem = {
  name: string;
  quantity: number;
  price: number;
  unit?: string;
};

export type ReceiptAdjustment = {
  type: "charge" | "discount";
  label: string;
  amount: number;
  isPercentage?: boolean;
};

export type ReceiptPaymentLine = {
  type: string;
  amount: number;
  label?: string;
};

export type ReceiptTemplateOptions = {
  widthMm?: ReceiptWidthMm;
  storeName?: string;
  businessName?: string;
  logoUrl?: string;
  timestamp?: Date;
  ticketId?: string;
  voucherType?: ReceiptVoucherType;
  payments?: ReceiptPaymentLine[];
  adjustments?: ReceiptAdjustment[];
  subtotal?: number;
  afipCae?: string;
  footerNote?: string;
};

const VOUCHER_LABELS: Record<ReceiptVoucherType, string> = {
  factura: "FACTURA",
  comprobante: "COMPROBANTE DE VENTA",
  presupuesto: "PRESUPUESTO",
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
      font-family: "Segoe UI", system-ui, sans-serif;
      width: ${printableWidthMm}mm;
      margin: 0 auto;
      padding: 3mm 2mm 4mm;
      font-size: ${widthMm === 55 ? "10px" : "11px"};
      color: #111;
      line-height: 1.35;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .header { text-align: center; margin-bottom: 8px; }
    .logo { max-width: 38mm; max-height: 16mm; object-fit: contain; margin: 0 auto 4px; display: block; }
    .store-name { font-size: ${widthMm === 55 ? "12px" : "14px"}; font-weight: 700; margin: 0 0 2px; letter-spacing: 0.02em; }
    .voucher-type {
      display: inline-block;
      margin: 4px 0 6px;
      padding: 2px 8px;
      border: 1px solid #111;
      font-size: ${widthMm === 55 ? "9px" : "10px"};
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .meta { font-size: ${widthMm === 55 ? "8px" : "9px"}; color: #444; margin-bottom: 6px; }
    .meta-row { display: flex; justify-content: space-between; gap: 4px; }
    table { width: 100%; border-collapse: collapse; margin-top: 4px; }
    thead td {
      font-size: ${widthMm === 55 ? "8px" : "9px"};
      font-weight: 700;
      border-bottom: 1px solid #111;
      padding-bottom: 3px;
    }
    td { padding: 3px 0; vertical-align: top; }
    .item-name { width: 52%; word-break: break-word; font-weight: 500; }
    .item-qty { width: 14%; text-align: center; color: #333; }
    .item-unit { width: 14%; text-align: right; color: #555; font-size: 0.92em; }
    .item-total { width: 20%; text-align: right; white-space: nowrap; font-weight: 600; }
    .divider { border-top: 1px dashed #666; margin: 6px 0; }
    .divider-strong { border-top: 2px solid #111; margin: 6px 0; }
    .summary-row { display: flex; justify-content: space-between; padding: 1px 0; }
    .summary-row.muted { color: #555; font-size: 0.95em; }
    .summary-row.discount { color: #b45309; }
    .summary-row.charge { color: #0369a1; }
    .total {
      display: flex;
      justify-content: space-between;
      font-weight: 800;
      font-size: ${widthMm === 55 ? "12px" : "14px"};
      padding-top: 4px;
    }
    .payments { margin-top: 6px; font-size: ${widthMm === 55 ? "9px" : "10px"}; }
    .payments-title { font-weight: 700; margin-bottom: 3px; }
    .payment-row { display: flex; justify-content: space-between; padding: 1px 0; }
    .cae { margin-top: 6px; font-size: ${widthMm === 55 ? "8px" : "9px"}; word-break: break-all; }
    .footer {
      margin-top: 10px;
      text-align: center;
      font-size: ${widthMm === 55 ? "8px" : "9px"};
      color: #444;
      border-top: 1px dashed #999;
      padding-top: 6px;
    }
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

function paymentLabel(type: string, label?: string): string {
  if (label) return label;
  const labels: Record<string, string> = {
    cash: "Efectivo",
    card: "Tarjeta",
    transfer: "Transferencia",
    qr: "QR",
  };
  return labels[type] ?? type;
}

export function buildReceiptHtml(
  items: ReceiptLineItem[],
  total: number,
  options: ReceiptTemplateOptions = {},
): string {
  const widthMm = options.widthMm === 55 ? 55 : 80;
  const storeName = escapeHtml(options.storeName ?? options.businessName ?? "Point of Sale");
  const timestamp = formatTimestamp(options.timestamp ?? new Date());
  const subtotal = options.subtotal ?? items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const voucherType = options.voucherType ?? "comprobante";

  const rows = items
    .map((item) => {
      const lineTotal = item.price * item.quantity;
      return `<tr>
        <td class="item-name">${escapeHtml(item.name)}</td>
        <td class="item-qty">${item.quantity}</td>
        <td class="item-unit">${formatMoney(item.price)}</td>
        <td class="item-total">${formatMoney(lineTotal)}</td>
      </tr>`;
    })
    .join("");

  const adjustmentRows = (options.adjustments ?? [])
    .map((adj) => {
      const signed = adj.type === "discount" ? -Math.abs(adj.amount) : Math.abs(adj.amount);
      const cls = adj.type === "discount" ? "discount" : "charge";
      const prefix = adj.type === "discount" ? "−" : "+";
      return `<div class="summary-row ${cls}"><span>${escapeHtml(adj.label)}</span><span>${prefix}${formatMoney(Math.abs(signed))}</span></div>`;
    })
    .join("");

  const paymentBlock =
    options.payments && options.payments.length > 0
      ? `<div class="payments">
          <div class="payments-title">Forma de pago</div>
          ${options.payments
            .map(
              (p) =>
                `<div class="payment-row"><span>${escapeHtml(paymentLabel(p.type, p.label))}</span><span>${formatMoney(p.amount)}</span></div>`,
            )
            .join("")}
        </div>`
      : "";

  const receiptLogoUrl = options.logoUrl ?? getDefaultLogoUrl();
  const logoBlock = receiptLogoUrl
    ? `<img src="${escapeHtml(receiptLogoUrl)}" alt="Logo" class="logo" />`
    : "";

  const ticketMeta = options.ticketId
    ? `<div class="meta-row"><span>Ticket</span><span>#${escapeHtml(options.ticketId.slice(-8))}</span></div>`
    : "";

  const caeBlock = options.afipCae
    ? `<div class="cae"><strong>CAE:</strong> ${escapeHtml(options.afipCae)}</div>`
    : "";

  const footerText =
    options.footerNote ??
    (voucherType === "presupuesto"
      ? "Documento no válido como factura · Sin validez fiscal"
      : "Gracias por su compra");

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(VOUCHER_LABELS[voucherType])}</title>
  <style>${buildReceiptCss(widthMm)}</style>
</head>
<body>
  <div class="header">
    ${logoBlock}
    <h1 class="store-name">${storeName}</h1>
    <div class="voucher-type">${escapeHtml(VOUCHER_LABELS[voucherType])}</div>
    <div class="meta">
      ${ticketMeta}
      <div class="meta-row"><span>Fecha</span><span>${timestamp}</span></div>
    </div>
  </div>
  <table>
    <thead>
      <tr>
        <td>Producto</td>
        <td style="text-align:center">Cant</td>
        <td style="text-align:right">P.unit</td>
        <td style="text-align:right">Total</td>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="divider"></div>
  <div class="summary-row muted"><span>Subtotal</span><span>${formatMoney(subtotal)}</span></div>
  ${adjustmentRows}
  <div class="divider-strong"></div>
  <div class="total"><span>TOTAL</span><span>${formatMoney(total)}</span></div>
  ${paymentBlock}
  ${caeBlock}
  <div class="footer">${escapeHtml(footerText)}</div>
</body>
</html>`;
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
