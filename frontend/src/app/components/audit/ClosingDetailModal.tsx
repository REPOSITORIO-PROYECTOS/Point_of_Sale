import { useState } from "react";
import { Badge } from "../ui/badge";
import { Card, CardContent } from "../ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
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
  CheckCircle,
  Eye,
  Printer,
} from "lucide-react";
import { format, differenceInMinutes } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import type { CashClosingDetail, CashClosingStatus } from "../../../lib/pos-api";
import { useTheme } from "../../../lib/theme-context";
import { useBusinessSettings } from "../../../lib/business-settings-context";
import { emitCashClosingReceipt } from "../../../lib/cash-closing-receipt";
import { canPrintDirectly } from "../../../lib/print-receipt";

interface ClosingDetailModalProps {
  closing: CashClosingDetail | null;
  closingId: string | null;
  isLoading?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function getStatusBadge(status: CashClosingStatus, difference: number) {
  switch (status) {
    case "perfect":
      return (
        <Badge className="bg-green-100 text-green-800 border-green-200">
          <CheckCircle className="size-3 mr-1" />
          Cuadre perfecto
        </Badge>
      );
    case "surplus":
      return (
        <Badge className="bg-blue-100 text-blue-800 border-blue-200">
          <TrendingUp className="size-3 mr-1" />
          Sobrante +${Math.abs(difference).toFixed(2)}
        </Badge>
      );
    case "shortage":
      return (
        <Badge className="bg-red-100 text-red-800 border-red-200">
          <AlertCircle className="size-3 mr-1" />
          Faltante −${Math.abs(difference).toFixed(2)}
        </Badge>
      );
  }
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
        <div className="flex flex-wrap gap-1">
          {transaction.paymentDetails.map((detail, idx) => (
            <Badge key={idx} variant="outline" className="font-normal">
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

  const receiptOptions = () => ({
    widthMm: themeConfig.receiptWidthMm ?? 80,
    business: {
      businessName: businessSettings.businessName,
      taxId: businessSettings.taxId,
      phone: businessSettings.phone,
      email: businessSettings.email,
      address: businessSettings.address,
    },
  });

  const handlePreviewClosing = async () => {
    if (!closing) return;
    try {
      await emitCashClosingReceipt(closing, { ...receiptOptions(), previewOnly: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo abrir la vista previa");
    }
  };

  const handlePrintClosing = async () => {
    if (!closing) return;
    setIsPrinting(true);
    try {
      await emitCashClosingReceipt(closing, receiptOptions());
      if (canPrintDirectly()) {
        toast.success("Cierre enviado a la impresora");
      } else {
        toast.info("Usá el botón Imprimir en la vista previa del ticket");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo imprimir el cierre");
    } finally {
      setIsPrinting(false);
    }
  };

  const hasDifference = closing && Math.abs(closing.difference) >= 0.01;
  const cashIncome = closing?.movementTotals?.cashIncome ?? 0;
  const cashExpense = closing?.movementTotals?.cashExpense ?? 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-5xl flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl">
        <DialogHeader className="shrink-0 space-y-3 border-b px-6 py-4">
          <div className="flex flex-wrap items-start justify-between gap-3 pr-8">
            <div>
              <DialogTitle className="text-xl">Detalle de cierre de caja</DialogTitle>
              <DialogDescription className="mt-1">
                {closing
                  ? format(new Date(closing.date), "dd 'de' MMMM 'de' yyyy 'a las' HH:mm", {
                      locale: es,
                    })
                  : closingId
                    ? "Cargando detalle..."
                    : "Seleccione un cierre"}
              </DialogDescription>
            </div>
            {closing ? getStatusBadge(closing.status, closing.difference) : null}
          </div>

          {closing && !isLoading ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              <div className="rounded-lg border bg-muted/40 px-3 py-2">
                <p className="text-xs text-muted-foreground">Esperado</p>
                <p className="text-lg font-semibold tabular-nums">
                  ${closing.expectedAmount.toFixed(2)}
                </p>
              </div>
              <div className="rounded-lg border bg-muted/40 px-3 py-2">
                <p className="text-xs text-muted-foreground">Contado</p>
                <p className="text-lg font-semibold tabular-nums">
                  ${closing.countedAmount.toFixed(2)}
                </p>
              </div>
              <div
                className={`rounded-lg border px-3 py-2 ${
                  hasDifference ? "border-amber-200 bg-amber-50" : "bg-green-50 border-green-200"
                }`}
              >
                <p className="text-xs text-muted-foreground">Diferencia</p>
                <p
                  className={`text-lg font-semibold tabular-nums ${
                    !hasDifference
                      ? "text-green-700"
                      : closing.difference > 0
                        ? "text-blue-700"
                        : "text-red-700"
                  }`}
                >
                  {closing.difference > 0 ? "+" : ""}${closing.difference.toFixed(2)}
                </p>
              </div>
              <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2">
                <p className="text-xs text-green-900">Ventas</p>
                <p className="text-lg font-semibold text-green-700 tabular-nums">
                  ${closing.totalSales.toFixed(2)}
                </p>
              </div>
              <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2">
                <p className="text-xs text-blue-900">Tickets</p>
                <p className="text-lg font-semibold text-blue-700 tabular-nums">
                  {closing.transactionsCount}
                </p>
              </div>
            </div>
          ) : null}
        </DialogHeader>

        {isLoading || !closing ? (
          <div className="flex flex-1 items-center justify-center py-24 text-muted-foreground">
            <Loader2 className="mr-2 size-6 animate-spin" />
            Cargando detalle del cierre...
          </div>
        ) : (
          <Tabs defaultValue="resumen" className="flex min-h-0 flex-1 flex-col">
            <div className="shrink-0 border-b px-6">
              <TabsList className="h-10 w-full justify-start rounded-none border-0 bg-transparent p-0">
                <TabsTrigger value="resumen" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                  Resumen
                </TabsTrigger>
                <TabsTrigger value="movimientos" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                  Movimientos ({closing.movements.length})
                </TabsTrigger>
                <TabsTrigger value="ventas" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                  Ventas ({closing.sales.length})
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="resumen" className="mt-0 min-h-0 flex-1 overflow-y-auto px-6 py-4">
              <div className="space-y-5">
                <section>
                  <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Turno de caja
                  </h3>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-lg border p-3">
                      <div className="mb-1 flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="size-4" />
                        Apertura
                      </div>
                      <p className="text-sm font-medium">{formatDateTime(closing.startTime)}</p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <div className="mb-1 flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="size-4" />
                        Cierre
                      </div>
                      <p className="text-sm font-medium">{formatDateTime(closing.endTime)}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Duración: {formatTurnDuration(closing.startTime, closing.endTime)}
                      </p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <div className="mb-1 flex items-center gap-2 text-sm text-muted-foreground">
                        <User className="size-4" />
                        Abrió
                      </div>
                      <p className="font-medium">{closing.openedByUsername ?? "Sin registrar"}</p>
                      {closing.openedByRole ? (
                        <Badge variant="secondary" className="mt-1 text-xs">
                          {closing.openedByRole}
                        </Badge>
                      ) : null}
                    </div>
                    <div className="rounded-lg border p-3">
                      <div className="mb-1 flex items-center gap-2 text-sm text-muted-foreground">
                        <User className="size-4" />
                        Cerró
                      </div>
                      <p className="font-medium">{closing.closedByUsername ?? closing.user}</p>
                      <Badge variant="secondary" className="mt-1 text-xs">
                        {closing.closedByRole ?? closing.userRole}
                      </Badge>
                    </div>
                  </div>
                </section>

                {closing.legacyArqueoCorrected ? (
                  <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                    Cierre anterior al arqueo corregido: el efectivo esperado y la diferencia se
                    recalculan con solo ventas en efectivo y movimientos de cajón.
                  </p>
                ) : null}

                <section>
                  <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Ventas por método de pago
                  </h3>
                  <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <div className="rounded-lg border border-green-200 bg-green-50 p-3">
                      <div className="mb-1 flex items-center gap-2">
                        <DollarSign className="size-4 text-green-700" />
                        <span className="text-sm font-medium text-green-900">Efectivo</span>
                      </div>
                      <p className="text-lg font-bold text-green-700 tabular-nums">
                        ${closing.salesByMethod.cash.toFixed(2)}
                      </p>
                    </div>
                    <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                      <div className="mb-1 flex items-center gap-2">
                        <CreditCard className="size-4 text-blue-700" />
                        <span className="text-sm font-medium text-blue-900">Tarjeta</span>
                      </div>
                      <p className="text-lg font-bold text-blue-700 tabular-nums">
                        ${closing.salesByMethod.card.toFixed(2)}
                      </p>
                    </div>
                    <div className="rounded-lg border border-purple-200 bg-purple-50 p-3">
                      <div className="mb-1 flex items-center gap-2">
                        <Wallet className="size-4 text-purple-700" />
                        <span className="text-sm font-medium text-purple-900">Transferencia</span>
                      </div>
                      <p className="text-lg font-bold text-purple-700 tabular-nums">
                        ${closing.salesByMethod.transfer.toFixed(2)}
                      </p>
                    </div>
                    <div className="rounded-lg border border-orange-200 bg-orange-50 p-3">
                      <div className="mb-1 flex items-center gap-2">
                        <Smartphone className="size-4 text-orange-700" />
                        <span className="text-sm font-medium text-orange-900">QR / App</span>
                      </div>
                      <p className="text-lg font-bold text-orange-700 tabular-nums">
                        ${closing.salesByMethod.qr.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </section>

                {hasDifference ? (
                  <section>
                    <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                      <AlertCircle className="size-4 text-amber-600" />
                      Explicación de la diferencia
                    </h3>
                    <Card className="border-amber-200 bg-amber-50/50">
                      <CardContent className="space-y-2 p-4 text-sm">
                        <div className="flex justify-between">
                          <span>Saldo inicial</span>
                          <span className="tabular-nums">${closing.initialBalance.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>+ Ventas en efectivo</span>
                          <span className="tabular-nums">${closing.salesByMethod.cash.toFixed(2)}</span>
                        </div>
                        {cashIncome > 0 ? (
                          <div className="flex justify-between text-green-800">
                            <span>+ Ingresos manuales (efectivo)</span>
                            <span className="tabular-nums">${cashIncome.toFixed(2)}</span>
                          </div>
                        ) : null}
                        {cashExpense > 0 ? (
                          <div className="flex justify-between text-red-800">
                            <span>− Egresos manuales (efectivo)</span>
                            <span className="tabular-nums">${cashExpense.toFixed(2)}</span>
                          </div>
                        ) : null}
                        <Separator />
                        <div className="flex justify-between font-semibold">
                          <span>= Efectivo esperado en cajón</span>
                          <span className="tabular-nums">${closing.expectedAmount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Efectivo contado</span>
                          <span className="tabular-nums">${closing.countedAmount.toFixed(2)}</span>
                        </div>
                        <div
                          className={`flex justify-between font-bold ${
                            closing.difference > 0 ? "text-blue-700" : "text-red-700"
                          }`}
                        >
                          <span>Diferencia</span>
                          <span className="tabular-nums">
                            {closing.difference > 0 ? "+" : ""}${closing.difference.toFixed(2)}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </section>
                ) : null}

                <section>
                  <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Datos del negocio
                  </h3>
                  <Card>
                    <CardContent className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2">
                      <div className="flex items-start gap-3">
                        <Building2 className="mt-0.5 size-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">Nombre</p>
                          <p className="font-medium">{closing.businessData.name || businessSettings.businessName || "—"}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <FileText className="mt-0.5 size-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">RUT/CUIT</p>
                          <p className="font-medium">{closing.businessData.rut || businessSettings.taxId || "—"}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Phone className="mt-0.5 size-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">Teléfono</p>
                          <p className="font-medium">{closing.businessData.phone || businessSettings.phone || "—"}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Mail className="mt-0.5 size-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">Email</p>
                          <p className="font-medium">{closing.businessData.email || businessSettings.email || "—"}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 md:col-span-2">
                        <MapPin className="mt-0.5 size-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">Dirección</p>
                          <p className="font-medium">{closing.businessData.address || businessSettings.address || "—"}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </section>
              </div>
            </TabsContent>

            <TabsContent value="movimientos" className="mt-0 min-h-0 flex-1 overflow-y-auto px-6 py-4">
              <div className="overflow-hidden rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[160px]">Fecha y hora</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead className="w-[100px]">Tipo</TableHead>
                      <TableHead className="w-[120px]">Operador</TableHead>
                      <TableHead className="w-[100px] text-right">Monto</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {closing.movements.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="py-12 text-center text-muted-foreground">
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
                            <TableCell className="text-right font-medium tabular-nums">
                              {isIncome ? "+" : "−"}${Math.abs(movement.amount).toFixed(2)}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="ventas" className="mt-0 min-h-0 flex-1 overflow-y-auto px-6 py-4">
              <p className="mb-3 text-xs text-muted-foreground">
                Si un ticket muestra &quot;Ajuste histórico&quot;, hubo descuento o recargo manual en el
                carrito. El total cobrado puede diferir de la suma de ítems.
              </p>
              <div className="overflow-hidden rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[80px]">Hora</TableHead>
                      <TableHead className="w-[100px]">Ticket</TableHead>
                      <TableHead>Productos</TableHead>
                      <TableHead className="w-[160px]">Método de pago</TableHead>
                      <TableHead className="w-[120px]">Subtotal</TableHead>
                      <TableHead className="w-[120px] text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {closing.sales.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                          No hay ventas registradas en este cierre
                        </TableCell>
                      </TableRow>
                    ) : (
                      closing.sales.map((transaction) => (
                        <TableRow key={transaction.id}>
                          <TableCell className="font-medium">{transaction.time}</TableCell>
                          <TableCell className="font-mono text-sm">{transaction.id}</TableCell>
                          <TableCell>
                            <div className="space-y-1 text-sm">
                              {transaction.items.map((item, idx) => (
                                <div key={idx} className="text-muted-foreground">
                                  {item.quantity}x {item.name}
                                </div>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            {renderPaymentDetails(transaction)}
                            <div className="mt-1 text-xs text-muted-foreground">
                              {transaction.cashierRole}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm text-muted-foreground tabular-nums">
                              ${transaction.subtotal.toFixed(2)}
                              {transaction.hasLegacyTicketAdjustment ||
                              Math.abs(transaction.amount - transaction.subtotal) >= 0.01 ? (
                                <Badge variant="outline" className="ml-1 text-xs text-amber-700">
                                  Ajuste histórico
                                </Badge>
                              ) : null}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-semibold tabular-nums">
                            ${transaction.amount.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        )}

        {closing && !isLoading ? (
          <DialogFooter className="shrink-0 gap-2 border-t px-6 py-4 sm:justify-end">
            <Button type="button" variant="outline" onClick={() => void handlePreviewClosing()}>
              <Eye className="mr-2 size-4" />
              Vista previa ticket
            </Button>
            <Button type="button" onClick={() => void handlePrintClosing()} disabled={isPrinting}>
              <Printer className="mr-2 size-4" />
              {isPrinting ? "Imprimiendo..." : "Imprimir cierre"}
            </Button>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
