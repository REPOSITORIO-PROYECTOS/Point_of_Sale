import { useState } from "react";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Badge } from "../ui/badge";
import { Switch } from "../ui/switch";
import { Checkbox } from "../ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { Card, CardContent } from "../ui/card";
import { RotateCcw, DollarSign, FileText, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { type Transaction } from "../../../lib/wails-bridge";

interface ReturnItem {
  name: string;
  quantity: number;
  maxQuantity: number;
  price: number;
  restockItem: boolean;
}

interface ReturnModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: Transaction | null;
  onSave: (returnData: {
    items: ReturnItem[];
    refundType: "cash" | "credit_note";
    amount: number;
  }) => void;
}

export function ReturnModal({
  open,
  onOpenChange,
  transaction,
  onSave,
}: ReturnModalProps) {
  const [selectedItems, setSelectedItems] = useState<
    Map<string, ReturnItem>
  >(new Map());
  const [refundType, setRefundType] = useState<"cash" | "credit_note">("cash");

  const handleItemToggle = (itemName: string, checked: boolean) => {
    const newSelected = new Map(selectedItems);
    if (checked) {
      const originalItem = transaction?.items.find((i) => i.name === itemName);
      if (originalItem) {
        newSelected.set(itemName, {
          name: itemName,
          quantity: originalItem.quantity,
          maxQuantity: originalItem.quantity,
          price: originalItem.price,
          restockItem: true,
        });
      }
    } else {
      newSelected.delete(itemName);
    }
    setSelectedItems(newSelected);
  };

  const handleQuantityChange = (itemName: string, delta: number) => {
    const newSelected = new Map(selectedItems);
    const item = newSelected.get(itemName);
    if (item) {
      const newQuantity = Math.max(
        1,
        Math.min(item.maxQuantity, item.quantity + delta)
      );
      newSelected.set(itemName, { ...item, quantity: newQuantity });
      setSelectedItems(newSelected);
    }
  };

  const handleRestockToggle = (itemName: string, restock: boolean) => {
    const newSelected = new Map(selectedItems);
    const item = newSelected.get(itemName);
    if (item) {
      newSelected.set(itemName, { ...item, restockItem: restock });
      setSelectedItems(newSelected);
    }
  };

  const calculateTotal = () => {
    let total = 0;
    selectedItems.forEach((item) => {
      total += item.quantity * item.price;
    });
    return total;
  };

  const handleSave = () => {
    if (selectedItems.size === 0) {
      toast.error("Selecciona al menos un producto para devolver");
      return;
    }

    const items = Array.from(selectedItems.values());
    const amount = calculateTotal();

    onSave({
      items,
      refundType,
      amount,
    });

    setSelectedItems(new Map());
    setRefundType("cash");
    onOpenChange(false);
  };

  if (!transaction) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="size-5 text-orange-600" />
            Gestionar Devolución
          </DialogTitle>
          <DialogDescription>
            Ticket #{transaction.id} - {transaction.time}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto space-y-4 py-4">
          {/* Selección de productos */}
          <div>
            <Label className="text-base mb-3 block">
              Productos a Devolver
            </Label>
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]"></TableHead>
                    <TableHead>Producto</TableHead>
                    <TableHead className="w-[180px]">Cantidad</TableHead>
                    <TableHead className="w-[140px]">
                      ¿Reingresar Stock?
                    </TableHead>
                    <TableHead className="text-right w-[100px]">
                      Subtotal
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transaction.items.map((item) => {
                    const isSelected = selectedItems.has(item.name);
                    const selectedItem = selectedItems.get(item.name);

                    return (
                      <TableRow key={item.name}>
                        <TableCell>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(checked) =>
                              handleItemToggle(item.name, !!checked)
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{item.name}</div>
                          <div className="text-sm text-muted-foreground">
                            ${item.price.toFixed(2)} c/u
                          </div>
                        </TableCell>
                        <TableCell>
                          {isSelected && selectedItem ? (
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  handleQuantityChange(item.name, -1)
                                }
                                disabled={selectedItem.quantity <= 1}
                              >
                                -
                              </Button>
                              <span className="w-12 text-center font-medium">
                                {selectedItem.quantity}
                              </span>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  handleQuantityChange(item.name, 1)
                                }
                                disabled={
                                  selectedItem.quantity >=
                                  selectedItem.maxQuantity
                                }
                              >
                                +
                              </Button>
                              <span className="text-sm text-muted-foreground">
                                / {item.quantity}
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">
                              {item.quantity} disponibles
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {isSelected && selectedItem ? (
                            <Switch
                              checked={selectedItem.restockItem}
                              onCheckedChange={(checked) =>
                                handleRestockToggle(item.name, checked)
                              }
                            />
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {isSelected && selectedItem
                            ? `$${(selectedItem.quantity * selectedItem.price).toFixed(2)}`
                            : `$${(item.quantity * item.price).toFixed(2)}`}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Opciones de reembolso */}
          {selectedItems.size > 0 && (
            <>
              <div>
                <Label className="text-base mb-3 block">
                  Tipo de Reembolso
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  <Card
                    className={`cursor-pointer transition-all ${
                      refundType === "cash"
                        ? "ring-2 ring-primary bg-primary/5"
                        : "hover:border-primary/50"
                    }`}
                    onClick={() => setRefundType("cash")}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div
                          className={`size-10 rounded-full flex items-center justify-center ${
                            refundType === "cash"
                              ? "bg-green-100"
                              : "bg-muted"
                          }`}
                        >
                          <DollarSign
                            className={`size-5 ${
                              refundType === "cash"
                                ? "text-green-600"
                                : "text-muted-foreground"
                            }`}
                          />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold">Devolución de Dinero</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            Registra un egreso en caja y devuelve efectivo al
                            cliente
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card
                    className={`cursor-pointer transition-all ${
                      refundType === "credit_note"
                        ? "ring-2 ring-primary bg-primary/5"
                        : "hover:border-primary/50"
                    }`}
                    onClick={() => setRefundType("credit_note")}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div
                          className={`size-10 rounded-full flex items-center justify-center ${
                            refundType === "credit_note"
                              ? "bg-purple-100"
                              : "bg-muted"
                          }`}
                        >
                          <FileText
                            className={`size-5 ${
                              refundType === "credit_note"
                                ? "text-purple-600"
                                : "text-muted-foreground"
                            }`}
                          />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold">Emitir Nota de Crédito</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            Genera saldo a favor sin restar efectivo de caja
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Resumen */}
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium">Total a Devolver:</span>
                  <span className="text-3xl font-bold">
                    ${calculateTotal().toFixed(2)}
                  </span>
                </div>
                {refundType === "credit_note" && (
                  <div className="flex items-start gap-2 mt-3 pt-3 border-t">
                    <AlertCircle className="size-4 text-purple-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-muted-foreground">
                      Se generará una Nota de Crédito por este monto que el
                      cliente podrá usar en futuras compras
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={selectedItems.size === 0}>
            Procesar Devolución
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
