import { useEffect, useState } from "react";
import { ReceiptPreviewDialog } from "../app/components/pos/ReceiptPreviewDialog";
import type { ReceiptPreviewState } from "./receipt-preview-types";
import { setBrowserPrintPreviewHandler } from "./print-receipt";

export function ReceiptPreviewProvider({ children }: { children: React.ReactNode }) {
  const [preview, setPreview] = useState<ReceiptPreviewState | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setBrowserPrintPreviewHandler((nextPreview) => {
      setPreview(nextPreview);
      setOpen(true);
    });

    const onCustomPreview = (event: Event) => {
      const detail = (event as CustomEvent<ReceiptPreviewState>).detail;
      if (detail) {
        setPreview(detail);
        setOpen(true);
      }
    };

    window.addEventListener("pos:open-receipt-preview", onCustomPreview);

    return () => {
      setBrowserPrintPreviewHandler(null);
      window.removeEventListener("pos:open-receipt-preview", onCustomPreview);
    };
  }, []);

  return (
    <>
      {children}
      <ReceiptPreviewDialog preview={preview} open={open} onOpenChange={setOpen} />
    </>
  );
}
