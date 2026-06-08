import { Button } from "../ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../ui/popover";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Plus, Minus, Percent, DollarSign } from "lucide-react";
import { useState } from "react";

export interface Adjustment {
  id: string;
  type: "charge" | "discount";
  label: string;
  amount: number;
  isPercentage: boolean;
}

interface AdjustmentsPanelProps {
  adjustments: Adjustment[];
  onAddAdjustment: (adjustment: Omit<Adjustment, "id">) => void;
  onRemoveAdjustment: (id: string) => void;
}

export function AdjustmentsPanel({
  adjustments,
  onAddAdjustment,
  onRemoveAdjustment,
}: AdjustmentsPanelProps) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [isPercentage, setIsPercentage] = useState(false);
  const [adjustmentType, setAdjustmentType] = useState<"charge" | "discount">("charge");

  const quickAdjustments = [
    { label: "Recargo Tarjeta 10%", type: "charge" as const, amount: 10, isPercentage: true },
    { label: "Delivery $1000", type: "charge" as const, amount: 1000, isPercentage: false },
    { label: "Descuento 15%", type: "discount" as const, amount: 15, isPercentage: true },
    { label: "Descuento $500", type: "discount" as const, amount: 500, isPercentage: false },
  ];

  const handleQuickAdjustment = (adj: typeof quickAdjustments[0]) => {
    onAddAdjustment(adj);
    setOpen(false);
  };

  const handleCustomAdjustment = () => {
    if (!label || !amount) return;

    onAddAdjustment({
      type: adjustmentType,
      label,
      amount: parseFloat(amount),
      isPercentage,
    });

    setLabel("");
    setAmount("");
    setOpen(false);
  };

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-full h-10">
            <Plus className="size-4 mr-2" />
            Recargos / Descuentos
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="start">
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-3">Acciones Rápidas</h4>
              <div className="grid grid-cols-2 gap-2">
                {quickAdjustments.map((adj, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickAdjustment(adj)}
                    className={
                      adj.type === "charge"
                        ? "border-orange-200 hover:bg-orange-50"
                        : "border-green-200 hover:bg-green-50"
                    }
                  >
                    {adj.type === "charge" ? (
                      <Plus className="size-3 mr-1" />
                    ) : (
                      <Minus className="size-3 mr-1" />
                    )}
                    {adj.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="border-t pt-4 space-y-3">
              <h4 className="font-medium">Personalizado</h4>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={adjustmentType === "charge" ? "default" : "outline"}
                  onClick={() => setAdjustmentType("charge")}
                  className="flex-1"
                >
                  <Plus className="size-4 mr-1" />
                  Recargo
                </Button>
                <Button
                  size="sm"
                  variant={adjustmentType === "discount" ? "default" : "outline"}
                  onClick={() => setAdjustmentType("discount")}
                  className="flex-1"
                >
                  <Minus className="size-4 mr-1" />
                  Descuento
                </Button>
              </div>

              <div>
                <Label htmlFor="adj-label">Descripción</Label>
                <Input
                  id="adj-label"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="Ej: Envío a domicilio"
                />
              </div>

              <div>
                <Label htmlFor="adj-amount">Monto</Label>
                <div className="flex gap-2">
                  <Input
                    id="adj-amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                  />
                  <Button
                    variant={isPercentage ? "default" : "outline"}
                    size="icon"
                    onClick={() => setIsPercentage(!isPercentage)}
                  >
                    {isPercentage ? (
                      <Percent className="size-4" />
                    ) : (
                      <DollarSign className="size-4" />
                    )}
                  </Button>
                </div>
              </div>

              <Button onClick={handleCustomAdjustment} className="w-full">
                Aplicar
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {adjustments.map((adj) => (
        <div
          key={adj.id}
          className={`flex items-center justify-between p-2 rounded-lg text-sm ${
            adj.type === "charge"
              ? "bg-orange-50 text-orange-900"
              : "bg-green-50 text-green-900"
          }`}
        >
          <div className="flex items-center gap-2">
            {adj.type === "charge" ? (
              <Plus className="size-4" />
            ) : (
              <Minus className="size-4" />
            )}
            <span className="font-medium">{adj.label}</span>
          </div>
          <div className="flex items-center gap-2">
            <span>
              {adj.type === "charge" ? "+" : "-"}
              {adj.isPercentage ? `${adj.amount}%` : `$${adj.amount.toFixed(2)}`}
            </span>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0"
              onClick={() => onRemoveAdjustment(adj.id)}
            >
              ×
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
