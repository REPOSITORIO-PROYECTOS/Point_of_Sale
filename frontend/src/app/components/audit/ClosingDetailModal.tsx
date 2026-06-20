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
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import {
  DollarSign,
  CreditCard,
  Smartphone,
  Wallet,
  AlertCircle,
  Building2,
  User,
  Phone,
  Mail,
  MapPin,
  FileText,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  type CashClosing,
} from "../../../lib/pos-domain-types";

const auditTransactions: never[] = [];
const auditEvents: never[] = [];

interface ClosingDetailModalProps {
  closing: CashClosing;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ClosingDetailModal({
  closing,
  open,
  onOpenChange,
}: ClosingDetailModalProps) {
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

  const renderPaymentDetails = (transaction: any) => {
    if (transaction.paymentMethod === "mixed" && transaction.paymentDetails) {
      return (
        <div className="space-y-1">
          {transaction.paymentDetails.map((detail: any, idx: number) => (
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

  const renderAdjustments = (transaction: any) => {
    if (!transaction.adjustments || transaction.adjustments.length === 0) {
      return null;
    }
    return (
      <div className="text-xs space-y-1 mt-1">
        {transaction.adjustments.map((adj: any, idx: number) => (
          <div
            key={idx}
            className={
              adj.type === "surcharge" ? "text-orange-600" : "text-green-600"
            }
          >
            {adj.type === "surcharge" ? "+" : "-"}
            {adj.isPercentage ? `${adj.amount}%` : `$${adj.amount.toFixed(2)}`}{" "}
            - {adj.description}
          </div>
        ))}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[85vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="text-xl">Detalle de Cierre de Caja</DialogTitle>
          <DialogDescription>
            {format(new Date(closing.date), "dd 'de' MMMM 'de' yyyy 'a las' HH:mm", {
              locale: es,
            })}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-full px-6 pb-6">
          <div className="space-y-6">
            {/* Datos del Negocio */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Datos del Negocio</h3>
              <Card className="bg-muted/30">
                <CardContent className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-start gap-3">
                      <Building2 className="size-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm text-muted-foreground">Nombre</p>
                        <p className="font-medium">{closing.businessData.name}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <FileText className="size-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm text-muted-foreground">RUT/CUIT</p>
                        <p className="font-medium">{closing.businessData.rut}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Phone className="size-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm text-muted-foreground">Teléfono</p>
                        <p className="font-medium">{closing.businessData.phone}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Mail className="size-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm text-muted-foreground">Email</p>
                        <p className="font-medium">{closing.businessData.email}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 md:col-span-2">
                      <MapPin className="size-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm text-muted-foreground">Dirección</p>
                        <p className="font-medium">{closing.businessData.address}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Separator />

            {/* Información del Cierre */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Información del Cierre</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 border rounded-lg bg-muted/30">
                  <div className="flex items-center gap-2 mb-1">
                    <User className="size-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Cajero</span>
                  </div>
                  <p className="font-medium">{closing.user}</p>
                  <Badge variant="secondary" className="mt-1 text-xs">
                    {closing.userRole}
                  </Badge>
                </div>
              </div>
            </div>

            <Separator />

            {/* Resumen Financiero */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Resumen Financiero</h3>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <Card className="bg-muted/50">
                  <CardHeader className="p-4 pb-2">
                    <CardDescription className="text-xs">
                      Saldo Esperado
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <p className="text-2xl font-bold">
                      ${closing.expectedAmount.toFixed(2)}
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-muted/50">
                  <CardHeader className="p-4 pb-2">
                    <CardDescription className="text-xs">
                      Saldo Contado
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <p className="text-2xl font-bold">
                      ${closing.countedAmount.toFixed(2)}
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-green-50 border-green-200">
                  <CardHeader className="p-4 pb-2">
                    <CardDescription className="text-xs text-green-900">
                      Total Ventas
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <p className="text-2xl font-bold text-green-700">
                      ${closing.totalSales.toFixed(2)}
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-blue-50 border-blue-200">
                  <CardHeader className="p-4 pb-2">
                    <CardDescription className="text-xs text-blue-900">
                      Transacciones
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <p className="text-2xl font-bold text-blue-700">
                      {closing.transactionsCount}
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>

            <Separator />

            {/* Ventas por Método de Pago */}
            <div>
              <h3 className="text-lg font-semibold mb-3">
                Ventas por Método de Pago
              </h3>
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
                    <span className="font-medium text-purple-900">
                      Transferencia
                    </span>
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

            {/* Log de Transacciones */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Log de Transacciones</h3>
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
                    {auditTransactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell className="font-medium">
                          {transaction.time}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {transaction.id}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm space-y-1">
                            {transaction.items.map((item, idx) => (
                              <div key={idx} className="text-muted-foreground">
                                {item.quantity}x {item.name}
                              </div>
                            ))}
                          </div>
                          {renderAdjustments(transaction)}
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
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          ${transaction.amount.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            <Separator />

            {/* Log de Eventos */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Log de Eventos</h3>
              <div className="space-y-2">
                {auditEvents.map((event) => (
                  <div
                    key={event.id}
                    className={`p-4 border rounded-lg ${
                      event.severity === "high"
                        ? "border-red-200 bg-red-50"
                        : event.severity === "medium"
                        ? "border-yellow-200 bg-yellow-50"
                        : "border-gray-200 bg-gray-50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <AlertCircle
                          className={`size-5 mt-0.5 flex-shrink-0 ${
                            event.severity === "high"
                              ? "text-red-600"
                              : event.severity === "medium"
                              ? "text-yellow-600"
                              : "text-gray-600"
                          }`}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">
                            {event.description}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Usuario: {event.user} ({event.userRole}) • {event.time}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant={
                          event.severity === "high"
                            ? "destructive"
                            : event.severity === "medium"
                            ? "default"
                            : "secondary"
                        }
                        className="flex-shrink-0"
                      >
                        {event.severity === "high"
                          ? "Alta"
                          : event.severity === "medium"
                          ? "Media"
                          : "Baja"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
