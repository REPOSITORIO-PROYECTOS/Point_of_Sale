import { CartItem } from "../../../lib/wails-bridge";
import { Adjustment } from "./AdjustmentsPanel";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { ScrollArea } from "../ui/scroll-area";
import { Clock, ShoppingBag, DollarSign, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import { useState } from "react";

export interface HeldOrder {
  id: string;
  items: CartItem[];
  adjustments: Adjustment[];
  total: number;
  timestamp: string;
  customerName?: string;
}

interface OrderQueuePanelProps {
  heldOrders: HeldOrder[];
  onResumeOrder: (order: HeldOrder) => void;
  onDeleteOrder: (orderId: string) => void;
}

export function OrderQueuePanel({
  heldOrders,
  onResumeOrder,
  onDeleteOrder,
}: OrderQueuePanelProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);

  const handleDeleteClick = (orderId: string) => {
    setOrderToDelete(orderId);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (orderToDelete) {
      onDeleteOrder(orderToDelete);
      setDeleteDialogOpen(false);
      setOrderToDelete(null);
    }
  };

  if (heldOrders.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        <ShoppingBag className="size-12 mx-auto mb-2 opacity-20" />
        <p className="text-sm">No hay pedidos en espera</p>
      </div>
    );
  }

  return (
    <>
      <ScrollArea className="h-full">
        <div className="p-4 space-y-3">
          {heldOrders.map((order) => {
            const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
            const timeAgo = getTimeAgo(order.timestamp);

            return (
              <Card
                key={order.id}
                className="p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => onResumeOrder(order)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="size-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {timeAgo}
                      </span>
                    </div>
                    {order.customerName && (
                      <p className="font-medium">{order.customerName}</p>
                    )}
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-destructive hover:bg-destructive/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteClick(order.id);
                    }}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>

                <div className="space-y-2 mb-3">
                  <div className="flex items-center gap-2 text-sm">
                    <ShoppingBag className="size-4" />
                    <span>
                      {itemCount} {itemCount === 1 ? "artículo" : "artículos"}
                    </span>
                  </div>
                  {order.items.slice(0, 2).map((item) => (
                    <div
                      key={item.id}
                      className="text-sm text-muted-foreground flex justify-between"
                    >
                      <span>
                        {item.quantity}x {item.name}
                      </span>
                      <span>${(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                  {order.items.length > 2 && (
                    <p className="text-xs text-muted-foreground">
                      +{order.items.length - 2} productos más...
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-3 border-t">
                  <div className="flex items-center gap-2">
                    <DollarSign className="size-4" />
                    <span className="font-semibold">Total</span>
                  </div>
                  <span className="text-xl font-bold">
                    ${order.total.toFixed(2)}
                  </span>
                </div>

                <Button className="w-full mt-3" size="sm">
                  Retomar Pedido
                </Button>
              </Card>
            );
          })}
        </div>
      </ScrollArea>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar pedido en espera?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El pedido se eliminará
              permanentemente de la cola.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function getTimeAgo(timestamp: string): string {
  const now = new Date();
  const past = new Date(timestamp);
  const diffMs = now.getTime() - past.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "Ahora";
  if (diffMins === 1) return "Hace 1 minuto";
  if (diffMins < 60) return `Hace ${diffMins} minutos`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours === 1) return "Hace 1 hora";
  if (diffHours < 24) return `Hace ${diffHours} horas`;

  return past.toLocaleDateString("es-ES");
}
