import { isElectronEnvironment, printReceiptElectron, printReceiptInBrowser } from "./desktop-api";
import { toPrinterPrintOptions } from "./printer-settings";
import { loadPrinterSettings } from "./printer-settings-store";
import {
  buildReceiptPrintDocument,
  renderReceiptPrintText,
  type ReceiptPrintDocument,
} from "./receipt-print-document";
import {
  buildReceiptHtml,
  buildEgresoHtml,
  buildIngresoHtml,
  type ReceiptAdjustment,
  type ReceiptLineItem,
  type ReceiptPaymentLine,
  type ReceiptTemplateOptions,
  type ReceiptVoucherType,
  type ReceiptWidthMm,
} from "./receipt-template";
import { resolveReceiptLogoUrl } from "./theme-logo";

import type { ReceiptPreviewState } from "./receipt-preview-types";
import type { ReceiptAfip, ReceiptEmisor, ReceiptReceptor } from "./receipt-template";

export type PrintReceiptPayload = {
  items: ReceiptLineItem[];
  total: number;
  subtotal?: number;
  adjustments?: ReceiptAdjustment[];
  payments?: ReceiptPaymentLine[];
  ticketId?: string;
  voucherType?: ReceiptVoucherType | "movimiento_ingreso" | "movimiento_egreso";
  businessName?: string;
  logoUrl?: string;
  receiptWidthMm?: ReceiptWidthMm;
  afipCae?: string;
  emisor?: Partial<ReceiptEmisor>;
  receptor?: Partial<ReceiptReceptor>;
  afip?: Partial<ReceiptAfip>;
  mostrarDesgloseIva?: boolean;
  observaciones?: string;
  previewOnly?: boolean;
  movement?: ReceiptPrintDocument["movement"];
  timestamp?: Date | string;
};

type BrowserPrintPreviewHandler = (preview: ReceiptPreviewState) => void;

let browserPrintPreviewHandler: BrowserPrintPreviewHandler | null = null;

export function setBrowserPrintPreviewHandler(handler: BrowserPrintPreviewHandler | null): void {
  browserPrintPreviewHandler = handler;
}

function isWailsEnvironment(): boolean {
  return typeof window !== "undefined" && !!window.go?.main?.App?.PrintReceipt;
}

export function buildPrintReceiptHtml(payload: PrintReceiptPayload): string {
  const widthMm = payload.receiptWidthMm ?? 80;

  if (
    payload.movement &&
    (payload.voucherType === "movimiento_ingreso" || payload.voucherType === "movimiento_egreso")
  ) {
    const movementHtmlPayload = {
      nombreNegocio: payload.emisor?.razonSocial ?? payload.businessName ?? "Mi Negocio",
      fechaHora: payload.timestamp ? new Date(payload.timestamp) : new Date(),
      nombreUsuario: payload.movement.operador,
      metodoPagoLabel: payload.movement.metodoPagoLabel,
      concepto: payload.movement.concepto,
      monto: payload.total,
      idMovimiento: payload.movement.idMovimiento,
      idSesion: payload.movement.idSesion,
    };

    return payload.voucherType === "movimiento_ingreso"
      ? buildIngresoHtml(movementHtmlPayload, widthMm)
      : buildEgresoHtml(movementHtmlPayload, widthMm);
  }

  const options: ReceiptTemplateOptions = {
    widthMm: payload.receiptWidthMm ?? 80,
    businessName: payload.businessName,
    logoUrl: resolveReceiptLogoUrl(payload.logoUrl),
    ticketId: payload.ticketId,
    voucherType:
      payload.voucherType === "movimiento_ingreso" || payload.voucherType === "movimiento_egreso"
        ? "comprobante"
        : payload.voucherType ?? "comprobante",
    payments: payload.payments,
    adjustments: payload.adjustments,
    subtotal: payload.subtotal,
    afipCae: payload.afipCae,
    emisor: payload.emisor,
    receptor: payload.receptor,
    afip: payload.afip,
    mostrarDesgloseIva: payload.mostrarDesgloseIva,
    observaciones: payload.observaciones,
  };

  return buildReceiptHtml(payload.items, payload.total, options);
}

export function buildPrintReceiptDocument(payload: PrintReceiptPayload): ReceiptPrintDocument {
  return buildReceiptPrintDocument({
    widthMm: payload.receiptWidthMm,
    voucherType: payload.voucherType,
    businessName: payload.businessName,
    emisor: payload.emisor,
    receptor: payload.receptor,
    items: payload.items,
    total: payload.total,
    subtotal: payload.subtotal,
    adjustments: payload.adjustments,
    payments: payload.payments,
    ticketId: payload.ticketId,
    timestamp: payload.timestamp,
    afip: payload.afip?.cae || payload.afipCae
      ? { ...payload.afip, cae: payload.afip?.cae ?? payload.afipCae }
      : payload.afip,
    mostrarDesgloseIva: payload.mostrarDesgloseIva,
    observaciones: payload.observaciones,
    movement: payload.movement,
  });
}

export function buildReceiptPreviewState(
  payload: PrintReceiptPayload,
  title?: string,
): ReceiptPreviewState {
  const widthMm = payload.receiptWidthMm ?? 80;
  return {
    html: buildPrintReceiptHtml(payload),
    text: renderReceiptPrintText(buildPrintReceiptDocument(payload)),
    widthMm,
    printPayload: payload,
    title,
  };
}

export async function printThermalHtml(
  html: string,
  receiptWidthMm: ReceiptWidthMm = 80,
  previewOnly = false,
): Promise<void> {
  if (previewOnly) {
    browserPrintPreviewHandler?.({
      html,
      text: "",
      widthMm: receiptWidthMm,
      title: "Vista previa del ticket",
    });
    return;
  }

  if (isWailsEnvironment()) {
    const data = JSON.stringify({ html, widthMm: receiptWidthMm });
    await window.go!.main!.App!.PrintReceipt(data);
    return;
  }

  if (isElectronEnvironment()) {
    throw new Error("Use printReceipt() con documento ESC/POS en Electron");
  }

  printReceiptInBrowser(html, receiptWidthMm);
}

export async function printReceipt(payload: PrintReceiptPayload): Promise<void> {
  const widthMm = payload.receiptWidthMm ?? 80;
  const html = buildPrintReceiptHtml(payload);
  const document = buildPrintReceiptDocument(payload);

  if (payload.previewOnly) {
    browserPrintPreviewHandler?.(buildReceiptPreviewState(payload));
    return;
  }

  if (isElectronEnvironment()) {
    const printerSettings = await loadPrinterSettings();
    console.info("[print] Electron", {
      mode: printerSettings.printMode,
      printer: printerSettings.printerName ?? "(predeterminada)",
      type: printerSettings.printerType,
      widthMm,
      voucherType: document.voucherType,
      silent: printerSettings.printSilent,
    });
    await printReceiptElectron({
      widthMm,
      document,
      html,
      printer: toPrinterPrintOptions(printerSettings),
    });
    return;
  }

  if (isWailsEnvironment()) {
    const data = JSON.stringify({
      widthMm,
      document,
      html,
    });
    await window.go!.main!.App!.PrintReceipt(data);
    return;
  }

  console.info("[print] navegador — abriendo diálogo HTML (sin ESC/POS)\n", renderReceiptPrintText(document));
  printReceiptInBrowser(html, widthMm, buildReceiptPreviewState(payload));
}

export function previewReceipt(payload: PrintReceiptPayload): void {
  browserPrintPreviewHandler?.(buildReceiptPreviewState(payload));
}

export function previewReceiptText(payload: PrintReceiptPayload): void {
  browserPrintPreviewHandler?.(buildReceiptPreviewState(payload, "Vista previa — modo texto"));
}

export function previewHtmlDocument(input: {
  html: string;
  text?: string;
  widthMm?: ReceiptWidthMm;
  title?: string;
}): void {
  const widthMm = input.widthMm ?? 80;
  browserPrintPreviewHandler?.({
    html: input.html,
    text: input.text ?? "",
    widthMm,
    title: input.title ?? "Vista previa",
  });
}

export async function printHtmlDocument(html: string, widthMm: ReceiptWidthMm = 80): Promise<void> {
  if (isElectronEnvironment()) {
    await printReceiptElectron({ widthMm, html });
    return;
  }

  if (isWailsEnvironment()) {
    const data = JSON.stringify({ html, widthMm });
    await window.go!.main!.App!.PrintReceipt(data);
    return;
  }

  printReceiptInBrowser(html, widthMm, {
    html,
    text: "",
    widthMm,
    title: "Impresión",
  });
}
