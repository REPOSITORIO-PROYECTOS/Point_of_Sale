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
import { DollarSign, CreditCard, Smartphone, Wallet, X, Plus } from "lucide-react";
import { toast } from "sonner";

interface CheckoutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: CartItem[];
  subtotal: number;
  onConfirm: (payments: PaymentMethod[]) => void;
}

export function CheckoutModal({
  open,
  onOpenChange,
  items,
  subtotal,
  onConfirm,
}: CheckoutModalProps) {
  const [payments, setPayments] = useState<PaymentMethod[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod["type"]>("cash");
  const [amount, setAmount] = useState("");

  const paymentMethods: { type: PaymentMethod["type"]; label: string; icon: any }[] = [
    { type: "cash", label: "Efectivo", icon: DollarSign },
    { type: "card", label: "Tarjeta", icon: CreditCard },
    { type: "transfer", label: "Transferencia", icon: Wallet },
    { type: "qr", label: "QR / App", icon: Smartphone },
  ];

  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const remaining = subtotal - totalPaid;

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

  const handleConfirm = () => {
    if (remaining > 0.01) {
      toast.error("El pago no está completo");
      return;
    }

    onConfirm(payments);
    setPayments([]);
    setAmount("");
    onOpenChange(false);
  };

  const handleClose = () => {
    setPayments([]);
    setAmount("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Procesar Pago</DialogTitle>
          <DialogDescription>
            Selecciona el método de pago o divide el pago entre varios métodos
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-4 bg-muted rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-muted-foreground">Total a Pagar:</span>
              <span className="text-3xl font-bold">${subtotal.toFixed(2)}</span>
            </div>
            {totalPaid > 0 && (
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

          {payments.length === 0 ? (
            <div>
              <Label className="mb-3">Pago Único - Selecciona un método</Label>
              <div className="grid grid-cols-2 gap-2">
                {paymentMethods.map((method) => {
                  const Icon = method.icon;
                  return (
                    <Button
                      key={method.type}
                      variant="outline"
                      className="h-20 flex-col gap-2"
                      onClick={() => handleQuickPay(method.type)}
                    >
                      <Icon className="size-6" />
                      <span>{method.label}</span>
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

          {remaining > 0.01 && payments.length > 0 && (
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

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={remaining > 0.01}>
            Confirmar Pago (F8)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
