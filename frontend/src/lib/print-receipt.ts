import { isElectronEnvironment, printReceiptElectron, printReceiptInBrowser } from "./desktop-api";
import {
  buildReceiptHtml,
  openReceiptPreview,
  type ReceiptAdjustment,
  type ReceiptLineItem,
  type ReceiptPaymentLine,
  type ReceiptTemplateOptions,
  type ReceiptVoucherType,
  type ReceiptWidthMm,
} from "./receipt-template";
import { resolveReceiptLogoUrl } from "./theme-logo";

export type PrintReceiptPayload = {
  items: ReceiptLineItem[];
  total: number;
  subtotal?: number;
  adjustments?: ReceiptAdjustment[];
  payments?: ReceiptPaymentLine[];
  ticketId?: string;
  voucherType?: ReceiptVoucherType;
  businessName?: string;
  logoUrl?: string;
  receiptWidthMm?: ReceiptWidthMm;
  afipCae?: string;
  previewOnly?: boolean;
};

function isWailsEnvironment(): boolean {
  return typeof window !== "undefined" && !!window.go?.main?.App?.PrintReceipt;
}

export function buildPrintReceiptHtml(payload: PrintReceiptPayload): string {
  const options: ReceiptTemplateOptions = {
    widthMm: payload.receiptWidthMm ?? 80,
    businessName: payload.businessName,
    logoUrl: resolveReceiptLogoUrl(payload.logoUrl),
    ticketId: payload.ticketId,
    voucherType: payload.voucherType ?? "comprobante",
    payments: payload.payments,
    adjustments: payload.adjustments,
    subtotal: payload.subtotal,
    afipCae: payload.afipCae,
  };

  return buildReceiptHtml(payload.items, payload.total, options);
}

export async function printReceipt(payload: PrintReceiptPayload): Promise<void> {
  const html = buildPrintReceiptHtml(payload);
  const widthMm = payload.receiptWidthMm ?? 80;

  if (payload.previewOnly) {
    openReceiptPreview(html);
    return;
  }

  if (isWailsEnvironment()) {
    const data = JSON.stringify({ html, widthMm });
    await window.go!.main!.App!.PrintReceipt(data);
    return;
  }

  if (isElectronEnvironment()) {
    await printReceiptElectron(html, widthMm);
    return;
  }

  printReceiptInBrowser(html);
}

export function previewReceipt(payload: PrintReceiptPayload): void {
  openReceiptPreview(buildPrintReceiptHtml(payload));
}
