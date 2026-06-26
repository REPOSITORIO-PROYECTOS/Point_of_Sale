import type { ReceiptWidthMm } from "./receipt-template";
import type { PrintReceiptPayload } from "./print-receipt";

export type ReceiptPreviewState = {
  html: string;
  text: string;
  widthMm: ReceiptWidthMm;
  printPayload?: PrintReceiptPayload;
  title?: string;
};
