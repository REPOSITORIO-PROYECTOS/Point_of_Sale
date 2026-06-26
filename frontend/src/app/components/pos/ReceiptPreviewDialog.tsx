import { useEffect, useState } from "react";
import { Download, Eye, FileText, Printer } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Button } from "../ui/button";
import type { ReceiptPreviewState } from "../../../lib/receipt-preview-types";
import { printReceipt } from "../../../lib/print-receipt";
import { generateReceiptPdf, isElectronEnvironment } from "../../../lib/desktop-api";

type ReceiptPreviewDialogProps = {
  preview: ReceiptPreviewState | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ReceiptPreviewDialog({ preview, open, onOpenChange }: ReceiptPreviewDialogProps) {
  const [isPrinting, setIsPrinting] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (pdfBlobUrl) {
        URL.revokeObjectURL(pdfBlobUrl);
      }
    };
  }, [pdfBlobUrl]);

  useEffect(() => {
    if (!open && pdfBlobUrl) {
      URL.revokeObjectURL(pdfBlobUrl);
      setPdfBlobUrl(null);
    }
  }, [open, pdfBlobUrl]);

  if (!preview) {
    return null;
  }

  const handlePrint = async () => {
    if (!preview.printPayload) {
      toast.error("No hay datos de impresión para este ticket");
      return;
    }

    setIsPrinting(true);
    try {
      await printReceipt(preview.printPayload);
      toast.success("Ticket enviado a la impresora");
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo imprimir";
      toast.error(message);
    } finally {
      setIsPrinting(false);
    }
  };

  const handleGeneratePdf = async () => {
    if (!isElectronEnvironment()) {
      toast.info("El PDF está disponible en la app de escritorio (.exe)");
      return;
    }

    setIsGeneratingPdf(true);
    try {
      const blob = await generateReceiptPdf(preview.html, preview.widthMm);
      if (pdfBlobUrl) {
        URL.revokeObjectURL(pdfBlobUrl);
      }
      const url = URL.createObjectURL(blob);
      setPdfBlobUrl(url);
      toast.success("PDF generado");
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo generar el PDF";
      toast.error(message);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleDownloadPdf = async () => {
    let url = pdfBlobUrl;
    if (!url) {
      setIsGeneratingPdf(true);
      try {
        const blob = await generateReceiptPdf(preview.html, preview.widthMm);
        url = URL.createObjectURL(blob);
        setPdfBlobUrl(url);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo generar el PDF");
        return;
      } finally {
        setIsGeneratingPdf(false);
      }
    }

    const ticketId = preview.printPayload?.ticketId ?? "ticket";
    const anchor = document.createElement("a");
    anchor.href = url!;
    anchor.download = `${ticketId}.pdf`;
    anchor.click();
  };

  const handleOpenPdf = async () => {
    let url = pdfBlobUrl;
    if (!url) {
      await handleGeneratePdf();
      url = pdfBlobUrl;
    }
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{preview.title ?? "Vista previa del ticket"}</DialogTitle>
          <DialogDescription>
            Ancho {preview.widthMm} mm · {preview.widthMm === 55 ? 32 : 48} columnas en modo texto
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="visual" className="flex-1 min-h-0">
          <TabsList className="w-full">
            <TabsTrigger value="visual" className="flex-1">
              Visual
            </TabsTrigger>
            <TabsTrigger value="text" className="flex-1">
              Texto térmico
            </TabsTrigger>
            {pdfBlobUrl ? (
              <TabsTrigger value="pdf" className="flex-1">
                PDF
              </TabsTrigger>
            ) : null}
          </TabsList>

          <TabsContent value="visual" className="mt-3">
            <div className="flex justify-center overflow-auto max-h-[50vh] rounded-lg border bg-muted p-4">
              <iframe
                title="Vista previa ticket"
                className="border border-border bg-white"
                style={{ width: `${preview.widthMm}mm`, minHeight: "280px" }}
                srcDoc={preview.html}
              />
            </div>
          </TabsContent>

          <TabsContent value="text" className="mt-3">
            <div className="overflow-auto max-h-[50vh] rounded-lg border bg-muted p-4">
              <pre
                className="mx-auto bg-white border border-dashed border-border p-3 text-xs font-mono whitespace-pre-wrap break-words"
                style={{ maxWidth: preview.widthMm === 55 ? "280px" : "380px" }}
              >
                {preview.text}
              </pre>
            </div>
          </TabsContent>

          {pdfBlobUrl ? (
            <TabsContent value="pdf" className="mt-3">
              <iframe
                title="Vista previa PDF"
                src={pdfBlobUrl}
                className="w-full h-[50vh] rounded-lg border"
              />
            </TabsContent>
          ) : null}
        </Tabs>

        <DialogFooter className="flex-wrap gap-2 sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {isElectronEnvironment() ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void handleGeneratePdf()}
                  disabled={isGeneratingPdf}
                >
                  <FileText className="size-4 mr-2" />
                  {isGeneratingPdf ? "Generando..." : "Ver PDF"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void handleDownloadPdf()}
                  disabled={isGeneratingPdf}
                >
                  <Download className="size-4 mr-2" />
                  Guardar PDF
                </Button>
              </>
            ) : (
              <p className="text-xs text-muted-foreground self-center">
                PDF disponible en la app de escritorio
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {preview.printPayload ? (
              <Button type="button" onClick={() => void handlePrint()} disabled={isPrinting}>
                <Printer className="size-4 mr-2" />
                {isPrinting ? "Imprimiendo..." : "Imprimir"}
              </Button>
            ) : (
              <Button type="button" variant="outline" onClick={() => void handleOpenPdf()}>
                <Eye className="size-4 mr-2" />
                Abrir PDF
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
