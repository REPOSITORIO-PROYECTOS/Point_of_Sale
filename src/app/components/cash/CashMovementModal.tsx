import { useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { TrendingUp, TrendingDown } from "lucide-react";
import { toast } from "sonner";

interface CashMovementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "income" | "expense";
  onSave: (movement: {
    amount: number;
    description: string;
    paymentMethod: string;
  }) => void;
}

export function CashMovementModal({
  open,
  onOpenChange,
  type,
  onSave,
}: CashMovementModalProps) {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");

  const handleSave = () => {
    if (!amount || !description) {
      toast.error("Completa todos los campos requeridos");
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (parsedAmount <= 0) {
      toast.error("El monto debe ser mayor a cero");
      return;
    }

    onSave({
      amount: parsedAmount,
      description,
      paymentMethod,
    });

    setAmount("");
    setDescription("");
    setPaymentMethod("cash");
    onOpenChange(false);
  };

  const quickReasons =
    type === "income"
      ? [
          "Ingreso de cambio chico",
          "Préstamo de caja",
          "Venta externa",
          "Reembolso de gastos",
        ]
      : [
          "Pago a proveedor",
          "Retiro de propietario",
          "Gastos varios",
          "Servicios básicos",
        ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {type === "income" ? (
              <>
                <TrendingUp className="size-5 text-green-600" />
                Nuevo Ingreso Manual
              </>
            ) : (
              <>
                <TrendingDown className="size-5 text-red-600" />
                Nuevo Egreso Manual
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            Registra un {type === "income" ? "ingreso" : "egreso"} manual a la
            caja
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="amount">Monto ($) *</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="text-2xl h-14 mt-1"
              autoFocus
            />
          </div>

          <div>
            <Label htmlFor="description">Concepto / Motivo *</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe el motivo del movimiento"
              className="mt-1 resize-none"
              rows={3}
            />
            <div className="mt-2 flex flex-wrap gap-2">
              {quickReasons.map((reason) => (
                <Button
                  key={reason}
                  variant="outline"
                  size="sm"
                  onClick={() => setDescription(reason)}
                  className="text-xs"
                >
                  {reason}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="paymentMethod">Método de Pago</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger id="paymentMethod" className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Efectivo</SelectItem>
                <SelectItem value="card">Tarjeta</SelectItem>
                <SelectItem value="transfer">Transferencia</SelectItem>
                <SelectItem value="qr">QR / App</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>Guardar Movimiento</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
