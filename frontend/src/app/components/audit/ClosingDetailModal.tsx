import { useState } from "react";
import { Badge } from "../ui/badge";
import { Card, CardContent, CardDescription, CardHeader } from "../ui/card";
import { ScrollArea } from "../ui/scroll-area";
import { Separator } from "../ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import {
  DollarSign,
  CreditCard,
  Smartphone,
  Wallet,
  Building2,
  User,
  Phone,
  Mail,
  MapPin,
  FileText,
  Loader2,
  TrendingDown,
  TrendingUp,
  Clock,
  AlertCircle,
  Eye,
  Printer,
} from "lucide-react";
import { format, differenceInMinutes } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import type { CashClosingDetail } from "../../../lib/pos-api";
import { useTheme } from "../../../lib/theme-context";
import { useBusinessSettings } from "../../../lib/business-settings-context";
import {
  buildCashClosingReceiptHtml,
  buildCashClosingReceiptText,
} from "../../../lib/cash-closing-receipt";
import { previewHtmlDocument, printHtmlDocument } from "../../../lib/print-receipt";

interface ClosingDetailModalProps {
  closing: CashClosingDetail | null;
  closingId: string | null;
  isLoading?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ClosingDetailModal({
  closing,
  closingId,
  isLoading = false,
  open,
  onOpenChange,
}: ClosingDetailModalProps) {
  const { themeConfig } = useTheme();
  const { settings: businessSettings } = useBusinessSettings();
  const [isPrinting, setIsPrinting] = useState(false);

  const getPaymentMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      cash: "Efectivo",
      card: "Tarjeta",
      transfer: "Transferencia",
      qr: "QR",
      mixed: "Mixto",
    };
    return labels[method] || method;
  };

  const renderPaymentDetails = (transaction: CashClosingDetail["sales"][number]) => {
    if (transaction.paymentMethod === "mixed" && transaction.paymentDetails) {
      return (
        <div className="space-y-1">
          {transaction.paymentDetails.map((detail, idx) => (
            <Badge key={idx} variant="outline" className="font-normal mr-1">
              {getPaymentMethodLabel(detail.method)}: ${detail.amount.toFixed(2)}
            </Badge>
          ))}
        </div>
      );
    }
    return (
      <Badge variant="outline" className="font-normal">
        {getPaymentMethodLabel(transaction.paymentMethod)}
      </Badge>
    );
  };

  const formatDateTime = (value: string) =>
    format(new Date(value), "dd/MM/yyyy HH:mm", { locale: es });

  const formatTurnDuration = (start: string, end: string) => {
    const minutes = differenceInMinutes(new Date(end), new Date(start));
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const remainder = minutes % 60;
    return remainder > 0 ? `${hours} h ${remainder} min` : `${hours} h`;
  };

  const hasDifference = closing && Math.abs(closing.difference) >= 0.01;
  const cashIncome = closing?.movementTotals?.cashIncome ?? 0;
  const cashExpense = closing?.movementTotals?.cashExpense ?? 0;

  const resolveClosingForReceipt = (detail: CashClosingDetail): CashClosingDetail => ({
    ...detail,
    businessData: {
      ...detail.businessData,
      name: businessSettings.businessName ?? detail.businessData.name,
      rut: businessSettings.taxId ?? detail.businessData.rut,
      phone: businessSettings.phone ?? detail.businessData.phone,
      email: businessSettings.email ?? detail.businessData.email,
      address: businessSettings.address ?? detail.businessData.address,
    },
  });

  const handlePreviewClosing = () => {
    if (!closing) return;
    const widthMm = themeConfig.receiptWidthMm ?? 80;
    const enriched = resolveClosingForReceipt(closing);
    previewHtmlDocument({
      html: buildCashClosingReceiptHtml(enriched, widthMm),
      text: buildCashClosingReceiptText(enriched),
      widthMm,
      title: `Cierre de caja #${closing.id.slice(-8)}`,
    });
  };

  const handlePrintClosing = async () => {
    if (!closing) return;
    setIsPrinting(true);
    try {
      const widthMm = themeConfig.receiptWidthMm ?? 80;
      const enriched = resolveClosingForReceipt(closing);
      await printHtmlDocument(buildCashClosingReceiptHtml(enriched, widthMm), widthMm);
      toast.success("Cierre enviado a la impresora");
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo imprimir el cierre";
      toast.error(message);
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[85vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="text-xl">Detalle de Cierre de Caja</DialogTitle>
          <DialogDescription>
            {closing
              ? format(new Date(closing.date), "dd 'de' MMMM 'de' yyyy 'a las' HH:mm", {
                  locale: es,
                })
              : closingId
                ? "Cargando detalle..."
                : "Seleccione un cierre"}
          </DialogDescription>
        </DialogHeader>

        {isLoading || !closing ? (
          <div className="flex flex-1 items-center justify-center py-24 text-muted-foreground">
            <Loader2 className="size-6 animate-spin mr-2" />
            Cargando detalle del cierre...
          </div>
        ) : (
          <ScrollArea className="h-full px-6 pb-6">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-3">Datos del Negocio</h3>
                <Card className="bg-muted/30">
                  <CardContent className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-start gap-3">
                        <Building2 className="size-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm text-muted-foreground">Nombre</p>
                          <p className="font-medium">{closing.businessData.name || "—"}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <FileText className="size-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm text-muted-foreground">RUT/CUIT</p>
                          <p className="font-medium">{closing.businessData.rut || "—"}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Phone className="size-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm text-muted-foreground">Teléfono</p>
                          <p className="font-medium">{closing.businessData.phone || "—"}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Mail className="size-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm text-muted-foreground">Email</p>
                          <p className="font-medium">{closing.businessData.email || "—"}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 md:col-span-2">
                        <MapPin className="size-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm text-muted-foreground">Dirección</p>
                          <p className="font-medium">{closing.businessData.address || "—"}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Separator />

              <div>
                <h3 className="text-lg font-semibold mb-3">Turno de Caja</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="p-3 border rounded-lg bg-muted/30">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="size-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Apertura</span>
                    </div>
                    <p className="font-medium text-sm">{formatDateTime(closing.startTime)}</p>
                  </div>
                  <div className="p-3 border rounded-lg bg-muted/30">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="size-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Cierre</span>
                    </div>
                    <p className="font-medium text-sm">{formatDateTime(closing.endTime)}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Duración: {formatTurnDuration(closing.startTime, closing.endTime)}
                    </p>
                  </div>
                  <div className="p-3 border rounded-lg bg-muted/30">
                    <div className="flex items-center gap-2 mb-1">
                      <User className="size-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Abrió</span>
                    </div>
                    <p className="font-medium">{closing.openedByUsername ?? "Sin registrar"}</p>
                    {closing.openedByRole ? (
                      <Badge variant="secondary" className="mt-1 text-xs">
                        {closing.openedByRole}
                      </Badge>
                    ) : null}
                  </div>
                  <div className="p-3 border rounded-lg bg-muted/30">
                    <div className="flex items-center gap-2 mb-1">
                      <User className="size-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Cerró</span>
                    </div>
                    <p className="font-medium">{closing.closedByUsername ?? closing.user}</p>
                    <Badge variant="secondary" className="mt-1 text-xs">
                      {closing.closedByRole ?? closing.userRole}
                    </Badge>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="text-lg font-semibold mb-3">Resumen Financiero</h3>
                {closing.legacyArqueoCorrected ? (
                  <p className="text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">
                    Cierre anterior al arqueo corregido: el efectivo esperado y la diferencia se
                    recalculan con solo ventas en efectivo y movimientos de cajón. El contado
                    físico registrado al cerrar no cambia.
                  </p>
                ) : null}
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                  <Card className="bg-muted/50">
                    <CardHeader className="p-4 pb-2">
                      <CardDescription className="text-xs">Efectivo Esperado</CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <p className="text-2xl font-bold">${closing.expectedAmount.toFixed(2)}</p>
                    </CardContent>
                  </Card>

                  <Card className="bg-muted/50">
                    <CardHeader className="p-4 pb-2">
                      <CardDescription className="text-xs">Efectivo Contado</CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <p className="text-2xl font-bold">${closing.countedAmount.toFixed(2)}</p>
                    </CardContent>
                  </Card>

                  <Card className={hasDifference ? "bg-amber-50 border-amber-200" : "bg-muted/50"}>
                    <CardHeader className="p-4 pb-2">
                      <CardDescription className="text-xs">Diferencia</CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <p
                        className={`text-2xl font-bold ${
                          !hasDifference
                            ? "text-green-700"
                            : closing.difference > 0
                              ? "text-blue-700"
                              : "text-red-700"
                        }`}
                      >
                        {closing.difference > 0 ? "+" : ""}${closing.difference.toFixed(2)}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="bg-green-50 border-green-200">
                    <CardHeader className="p-4 pb-2">
                      <CardDescription className="text-xs text-green-900">Total Ventas</CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <p className="text-2xl font-bold text-green-700">
                        ${closing.totalSales.toFixed(2)}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="bg-blue-50 border-blue-200">
                    <CardHeader className="p-4 pb-2">
                      <CardDescription className="text-xs text-blue-900">Transacciones</CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <p className="text-2xl font-bold text-blue-700">{closing.transactionsCount}</p>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {hasDifference ? (
                <>
                  <Separator />
                  <div>
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                      <AlertCircle className="size-5 text-amber-600" />
                      Explicación de la diferencia
                    </h3>
                    <Card className="bg-amber-50/50 border-amber-200">
                      <CardContent className="p-4 space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Saldo inicial</span>
                          <span>${closing.initialBalance.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>+ Ventas en efectivo</span>
                          <span>${closing.salesByMethod.cash.toFixed(2)}</span>
                        </div>
                        {cashIncome > 0 ? (
                          <div className="flex justify-between text-green-800">
                            <span>+ Ingresos manuales (efectivo)</span>
                            <span>${cashIncome.toFixed(2)}</span>
                          </div>
                        ) : null}
                        {cashExpense > 0 ? (
                          <div className="flex justify-between text-red-800">
                            <span>− Egresos manuales (efectivo)</span>
                            <span>${cashExpense.toFixed(2)}</span>
                          </div>
                        ) : null}
                        <Separator />
                        <div className="flex justify-between font-semibold">
                          <span>= Efectivo esperado en cajón</span>
                          <span>${closing.expectedAmount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Efectivo contado</span>
                          <span>${closing.countedAmount.toFixed(2)}</span>
                        </div>
                        <div
                          className={`flex justify-between font-bold ${
                            closing.difference > 0 ? "text-blue-700" : "text-red-700"
                          }`}
                        >
                          <span>Diferencia</span>
                          <span>
                            {closing.difference > 0 ? "+" : ""}${closing.difference.toFixed(2)}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </>
              ) : null}

              <Separator />

              <div>
                <h3 className="text-lg font-semibold mb-3">Movimientos de Caja</h3>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[160px]">Fecha y hora</TableHead>
                        <TableHead>Descripción</TableHead>
                        <TableHead className="w-[100px]">Tipo</TableHead>
                        <TableHead className="w-[120px]">Operador</TableHead>
                        <TableHead className="text-right w-[100px]">Monto</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {closing.movements.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            No hay movimientos manuales en este turno
                          </TableCell>
                        </TableRow>
                      ) : (
                        closing.movements.map((movement) => {
                          const isIncome = movement.type === "income";
                          return (
                            <TableRow key={movement.id}>
                              <TableCell className="text-sm text-muted-foreground">
                                {formatDateTime(movement.createdAt)}
                              </TableCell>
                              <TableCell>{movement.description}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  {isIncome ? (
                                    <TrendingUp className="size-4 text-green-600" />
                                  ) : (
                                    <TrendingDown className="size-4 text-red-600" />
                                  )}
                                  {isIncome ? "Ingreso" : "Egreso"}
                                </div>
                              </TableCell>
                              <TableCell className="text-sm">
                                {movement.operatorUsername ?? "—"}
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {isIncome ? "+" : "−"}$
                                {Math.abs(movement.amount).toFixed(2)}
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="text-lg font-semibold mb-3">Ventas por Método de Pago</h3>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="p-4 border rounded-lg bg-green-50 border-green-200">
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign className="size-5 text-green-700" />
                      <span className="font-medium text-green-900">Efectivo</span>
                    </div>
                    <p className="text-xl font-bold text-green-700">
                      ${closing.salesByMethod.cash.toFixed(2)}
                    </p>
                  </div>

                  <div className="p-4 border rounded-lg bg-blue-50 border-blue-200">
                    <div className="flex items-center gap-2 mb-2">
                      <CreditCard className="size-5 text-blue-700" />
                      <span className="font-medium text-blue-900">Tarjeta</span>
                    </div>
                    <p className="text-xl font-bold text-blue-700">
                      ${closing.salesByMethod.card.toFixed(2)}
                    </p>
                  </div>

                  <div className="p-4 border rounded-lg bg-purple-50 border-purple-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Wallet className="size-5 text-purple-700" />
                      <span className="font-medium text-purple-900">Transferencia</span>
                    </div>
                    <p className="text-xl font-bold text-purple-700">
                      ${closing.salesByMethod.transfer.toFixed(2)}
                    </p>
                  </div>

                  <div className="p-4 border rounded-lg bg-orange-50 border-orange-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Smartphone className="size-5 text-orange-700" />
                      <span className="font-medium text-orange-900">QR / App</span>
                    </div>
                    <p className="text-xl font-bold text-orange-700">
                      ${closing.salesByMethod.qr.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="text-lg font-semibold mb-3">Log de Transacciones</h3>
                <p className="text-xs text-muted-foreground mb-2">
                  Si un ticket muestra &quot;Ajuste histórico&quot;, hubo descuento o recargo manual
                  en el carrito (ya no disponible en ventas nuevas). El total cobrado puede diferir
                  de la suma de ítems.
                </p>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[80px]">Hora</TableHead>
                        <TableHead className="w-[100px]">Ticket</TableHead>
                        <TableHead>Productos</TableHead>
                        <TableHead className="w-[160px]">Método de Pago</TableHead>
                        <TableHead className="w-[120px]">Subtotal</TableHead>
                        <TableHead className="text-right w-[120px]">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {closing.sales.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            No hay ventas registradas en este cierre
                          </TableCell>
                        </TableRow>
                      ) : (
                        closing.sales.map((transaction) => (
                          <TableRow key={transaction.id}>
                            <TableCell className="font-medium">{transaction.time}</TableCell>
                            <TableCell className="font-mono text-sm">{transaction.id}</TableCell>
                            <TableCell>
                              <div className="text-sm space-y-1">
                                {transaction.items.map((item, idx) => (
                                  <div key={idx} className="text-muted-foreground">
                                    {item.quantity}x {item.name}
                                  </div>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell>
                              {renderPaymentDetails(transaction)}
                              <div className="text-xs text-muted-foreground mt-1">
                                {transaction.cashierRole}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm text-muted-foreground">
                                ${transaction.subtotal.toFixed(2)}
                                {transaction.hasLegacyTicketAdjustment ||
                                Math.abs(transaction.amount - transaction.subtotal) >= 0.01 ? (
                                  <Badge variant="outline" className="ml-1 text-xs text-amber-700">
                                    Ajuste histórico
                                  </Badge>
                                ) : null}
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              ${transaction.amount.toFixed(2)}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          </ScrollArea>
        )}

        {closing && !isLoading ? (
          <DialogFooter className="px-6 py-4 border-t gap-2 sm:justify-end">
            <Button type="button" variant="outline" onClick={handlePreviewClosing}>
              <Eye className="size-4 mr-2" />
              Vista previa ticket
            </Button>
            <Button type="button" onClick={() => void handlePrintClosing()} disabled={isPrinting}>
              <Printer className="size-4 mr-2" />
              {isPrinting ? "Imprimiendo..." : "Imprimir cierre"}
            </Button>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
