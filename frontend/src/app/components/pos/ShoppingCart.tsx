import { CartItem } from "../../../lib/wails-bridge";
import { getCartLineKey } from "../../../lib/open-price-product";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Separator } from "../ui/separator";
import { Plus, Minus, Trash2, ShoppingCart as CartIcon } from "lucide-react";

interface ShoppingCartProps {
  items: CartItem[];
  onUpdateQuantity: (lineKey: string, delta: number) => void;
  onRemoveItem: (lineKey: string) => void;
  onCheckout: () => void;
  onCancel: () => void;
  onHold: () => void;
}

export function ShoppingCart({
  items,
  onUpdateQuantity,
  onRemoveItem,
  onCheckout,
  onCancel,
  onHold,
}: ShoppingCartProps) {
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="flex flex-col h-full bg-muted/30">
      <div className="p-4 border-b bg-background">
        <div className="flex items-center gap-2">
          <CartIcon className="size-5" />
          <h2 className="font-semibold">Pedido Actual</h2>
          {itemCount > 0 && (
            <span className="ml-auto bg-primary text-primary-foreground px-2 py-1 rounded-full text-sm">
              {itemCount} {itemCount === 1 ? "artículo" : "artículos"}
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <CartIcon className="size-16 mb-4 opacity-20" />
            <p>No hay artículos en el carrito</p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item) => {
              const lineKey = getCartLineKey(item);
              const isOpenPriceLine = Boolean(item.cartLineId);
              return (
              <Card key={lineKey} className="p-3">
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <h4 className="font-medium">{item.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      ${item.price.toFixed(2)} {isOpenPriceLine ? "(ajuste)" : "c/u"}
                    </p>
                  </div>
                  {isOpenPriceLine ? (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-9 text-destructive"
                      onClick={() => onRemoveItem(lineKey)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  ) : (
                  <div className="flex items-center gap-2">
                    <Button
                      size="icon"
                      variant="outline"
                      className="size-9"
                      onClick={() => onUpdateQuantity(lineKey, -1)}
                    >
                      <Minus className="size-4" />
                    </Button>
                    <span className="w-8 text-center font-semibold">
                      {item.quantity}
                    </span>
                    <Button
                      size="icon"
                      variant="outline"
                      className="size-9"
                      onClick={() => onUpdateQuantity(lineKey, 1)}
                    >
                      <Plus className="size-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-9 text-destructive"
                      onClick={() => onRemoveItem(lineKey)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                  )}
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Subtotal</span>
                  <span className="font-semibold">
                    ${(item.price * item.quantity).toFixed(2)}
                  </span>
                </div>
              </Card>
            );
            })}
          </div>
        )}
      </div>

      <div className="border-t bg-background p-4 space-y-3">
        <div className="flex justify-between items-center text-lg">
          <span className="font-semibold">Total</span>
          <span className="text-3xl font-bold">${total.toFixed(2)}</span>
        </div>

        <Separator />

        <div className="grid grid-cols-3 gap-2">
          <Button
            variant="outline"
            className="h-12"
            onClick={onCancel}
            disabled={items.length === 0}
          >
            Cancelar
          </Button>
          <Button
            variant="outline"
            className="h-12"
            onClick={onHold}
            disabled={items.length === 0}
          >
            Pausar
          </Button>
          <Button
            className="h-12"
            onClick={onCheckout}
            disabled={items.length === 0}
          >
            Cobrar
          </Button>
        </div>
      </div>
    </div>
  );
}
