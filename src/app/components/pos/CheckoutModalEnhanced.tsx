import { useState } from "react";
import { CartItem, PaymentMethod } from "../../../lib/wails-bridge";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Separator } from "../ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { DollarSign, CreditCard, Smartphone, Wallet, X, Plus, Calculator, FileText, Receipt, FileEdit } from "lucide-react";
import { toast } from "sonner";

export type VoucherType = "factura" | "comprobante" | "presupuesto";

interface CheckoutModalEnhancedProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: CartItem[];
  subtotal: number;
  onConfirm: (payments: PaymentMethod[], voucherType: VoucherType) => void;
}

export function CheckoutModalEnhanced({
  open,
  onOpenChange,
  items,
  subtotal,
  onConfirm,
}: CheckoutModalEnhancedProps) {
  const [payments, setPayments] = useState<PaymentMethod[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod["type"]>("cash");
  const [amount, setAmount] = useState("");
  const [cashReceived, setCashReceived] = useState("");
  const [showChange, setShowChange] = useState(false);
  const [voucherType, setVoucherType] = useState<VoucherType>("comprobante");

  const paymentMethods: { type: PaymentMethod["type"]; label: string; icon: any }[] = [
    { type: "cash", label: "Efectivo", icon: DollarSign },
    { type: "card", label: "Tarjeta", icon: CreditCard },
    { type: "transfer", label: "Transferencia", icon: Wallet },
    { type: "qr", label: "QR / App", icon: Smartphone },
  ];

  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const remaining = subtotal - totalPaid;
  const change = cashReceived ? parseFloat(cashReceived) - subtotal : 0;

  const handleQuickPayCash = () => {
    setSelectedMethod("cash");
    setCashReceived(subtotal.toString());
    setShowChange(false);
  };

  const handleQuickPayCashWithChange = () => {
    setSelectedMethod("cash");
    setCashReceived("");
    setShowChange(true);
  };

  const handleQuickPay = (method: PaymentMethod["type"]) => {
    const methodData = paymentMethods.find((m) => m.type === method);
    if (!methodData) return;

    setPayments([
      {
        type: method,
        amount: subtotal,
        label: methodData.label,
      },
    ]);
  };

  const handleAddPayment = () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Ingresa un monto válido");
      return;
    }

    const paymentAmount = Math.min(parseFloat(amount), remaining);
    const method = paymentMethods.find((m) => m.type === selectedMethod);

    if (!method) return;

    setPayments([
      ...payments,
      {
        type: selectedMethod,
        amount: paymentAmount,
        label: method.label,
      },
    ]);

    setAmount("");

    if (remaining - paymentAmount <= 0.01) {
      toast.success("Monto completado");
    }
  };

  const handleRemovePayment = (index: number) => {
    setPayments(payments.filter((_, i) => i !== index));
  };

  const handleConfirmCashPayment = () => {
    if (!cashReceived || parseFloat(cashReceived) < subtotal) {
      toast.error("El monto recibido debe ser mayor o igual al total");
      return;
    }

    const methodData = paymentMethods.find((m) => m.type === "cash");
    if (!methodData) return;

    setPayments([
      {
        type: "cash",
        amount: subtotal,
        label: methodData.label,
      },
    ]);

    // Si hay vuelto, mostrarlo antes de confirmar
    if (change > 0.01) {
      setTimeout(() => {
        handleConfirm();
      }, 100);
    } else {
      handleConfirm();
    }
  };

  const handleConfirm = () => {
    if (remaining > 0.01) {
      toast.error("El pago no está completo");
      return;
    }

    onConfirm(payments, voucherType);
    setPayments([]);
    setAmount("");
    setCashReceived("");
    setShowChange(false);
    onOpenChange(false);
  };

  const handleClose = () => {
    setPayments([]);
    setAmount("");
    setCashReceived("");
    setShowChange(false);
    setVoucherType("comprobante");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Procesar Pago</DialogTitle>
          <DialogDescription>
            Selecciona el método de pago
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-4 bg-muted rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-muted-foreground">Total a Pagar:</span>
              <span className="text-3xl font-bold">${subtotal.toFixed(2)}</span>
            </div>
            {totalPaid > 0 && !showChange && (
              <>
                <Separator className="my-2" />
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm">Pagado:</span>
                  <span className="font-medium text-green-600">
                    ${totalPaid.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Restante:</span>
                  <span className="text-2xl font-bold text-orange-600">
                    ${remaining.toFixed(2)}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Pago con Efectivo y Cálculo de Vuelto */}
          {showChange ? (
            <div className="space-y-4 p-4 border-2 border-green-200 rounded-lg bg-green-50">
              <div className="flex items-center gap-2 text-green-900">
                <Calculator className="size-5" />
                <h3 className="font-semibold">Pago con Efectivo - Calcular Vuelto</h3>
              </div>

              <div>
                <Label htmlFor="cashReceived">
                  Monto Recibido del Cliente ($)
                </Label>
                <Input
                  id="cashReceived"
                  type="number"
                  step="0.01"
                  min={subtotal}
                  value={cashReceived}
                  onChange={(e) => setCashReceived(e.target.value)}
                  placeholder={`Mínimo: $${subtotal.toFixed(2)}`}
                  className="h-14 text-2xl mt-2"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleConfirmCashPayment();
                    }
                  }}
                />
              </div>

              {cashReceived && parseFloat(cashReceived) >= subtotal && (
                <div className="p-4 bg-white rounded-lg border-2 border-green-300">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-medium">Vuelto a Entregar:</span>
                    <span className="text-4xl font-bold text-green-600">
                      ${change.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setCashReceived("");
                    setShowChange(false);
                  }}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleConfirmCashPayment}
                  disabled={!cashReceived || parseFloat(cashReceived) < subtotal}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  Confirmar Pago
                </Button>
              </div>
            </div>
          ) : payments.length === 0 ? (
            <div>
              <Label className="mb-3">Selecciona un método de pago</Label>
              <div className="grid grid-cols-2 gap-2">
                {/* Efectivo con opciones */}
                <Button
                  variant="outline"
                  className="h-24 flex-col gap-2 border-green-200 hover:bg-green-50"
                  onClick={handleQuickPayCash}
                >
                  <DollarSign className="size-7 text-green-600" />
                  <span className="font-medium">Efectivo</span>
                  <span className="text-xs text-muted-foreground">Monto exacto</span>
                </Button>

                <Button
                  variant="outline"
                  className="h-24 flex-col gap-2 border-green-200 hover:bg-green-50"
                  onClick={handleQuickPayCashWithChange}
                >
                  <Calculator className="size-7 text-green-600" />
                  <span className="font-medium">Efectivo</span>
                  <span className="text-xs text-muted-foreground">Con vuelto</span>
                </Button>

                {/* Otros métodos */}
                {paymentMethods.slice(1).map((method) => {
                  const Icon = method.icon;
                  return (
                    <Button
                      key={method.type}
                      variant="outline"
                      className="h-24 flex-col gap-2"
                      onClick={() => handleQuickPay(method.type)}
                    >
                      <Icon className="size-7" />
                      <span className="font-medium">{method.label}</span>
                    </Button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <Label>Pagos Registrados</Label>
              {payments.map((payment, index) => {
                const method = paymentMethods.find((m) => m.type === payment.type);
                const Icon = method?.icon || DollarSign;
                return (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-muted rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Icon className="size-5" />
                      </div>
                      <div>
                        <p className="font-medium">{payment.label}</p>
                        <p className="text-sm text-muted-foreground">
                          ${payment.amount.toFixed(2)}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleRemovePayment(index)}
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}

          {remaining > 0.01 && payments.length > 0 && !showChange && (
            <>
              <Separator />
              <div className="space-y-3">
                <Label>Agregar Otro Pago</Label>
                <div className="grid grid-cols-4 gap-2">
                  {paymentMethods.map((method) => {
                    const Icon = method.icon;
                    return (
                      <Button
                        key={method.type}
                        variant={selectedMethod === method.type ? "default" : "outline"}
                        className="h-16 flex-col gap-1"
                        onClick={() => setSelectedMethod(method.type)}
                      >
                        <Icon className="size-5" />
                        <span className="text-xs">{method.label}</span>
                      </Button>
                    );
                  })}
                </div>

                <div className="flex gap-2">
                  <div className="flex-1">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      max={remaining}
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder={`Máximo: $${remaining.toFixed(2)}`}
                      className="h-12"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleAddPayment();
                        }
                      }}
                    />
                  </div>
                  <Button onClick={handleAddPayment} className="h-12 px-6">
                    <Plus className="size-5 mr-2" />
                    Agregar
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>

        {!showChange && (
          <>
            <Separator />
            <div className="space-y-3">
              <Label className="text-base font-semibold">Tipo de Comprobante</Label>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  type="button"
                  variant={voucherType === "factura" ? "default" : "outline"}
                  onClick={() => setVoucherType("factura")}
                  className="h-20 flex-col gap-2"
                >
                  <FileText className="size-6" />
                  <span className="text-sm">Factura</span>
                </Button>
                <Button
                  type="button"
                  variant={voucherType === "comprobante" ? "default" : "outline"}
                  onClick={() => setVoucherType("comprobante")}
                  className="h-20 flex-col gap-2"
                >
                  <Receipt className="size-6" />
                  <span className="text-sm">Comprobante</span>
                </Button>
                <Button
                  type="button"
                  variant={voucherType === "presupuesto" ? "default" : "outline"}
                  onClick={() => setVoucherType("presupuesto")}
                  className="h-20 flex-col gap-2"
                >
                  <FileEdit className="size-6" />
                  <span className="text-sm">Presupuesto</span>
                </Button>
              </div>
              {voucherType === "presupuesto" && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-900">
                  <strong>Nota:</strong> Los presupuestos no descontarán stock del inventario
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button onClick={handleConfirm} disabled={remaining > 0.01}>
                Confirmar Pago (F8)
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
