import { useState, useEffect } from "react";
import { Product, CartItem, WailsAPI, Transaction, PaymentMethod, CashSession } from "../../../lib/wails-bridge";
import type { VoucherType } from "./CheckoutModalEnhanced";
import { ProductCatalog } from "./ProductCatalog";
import { ShoppingCartEnhanced } from "./ShoppingCartEnhanced";
import { CheckoutModalEnhanced } from "./CheckoutModalEnhanced";
import { OrderQueuePanel, HeldOrder } from "./OrderQueuePanel";
import { Adjustment } from "./AdjustmentsPanel";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "../ui/sheet";
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
import { toast } from "sonner";
import { useKeyboardShortcuts } from "../../../lib/use-keyboard-shortcuts";
import { ListOrdered, DollarSign, AlertTriangle, TrendingUp, TrendingDown, Lock, Unlock, ArrowUpDown } from "lucide-react";

interface POSScreenEnhancedProps {
  heldOrders: HeldOrder[];
  onHeldOrdersChange: (orders: HeldOrder[]) => void;
}

export function POSScreenEnhanced({
  heldOrders,
  onHeldOrdersChange,
}: POSScreenEnhancedProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [queueOpen, setQueueOpen] = useState(false);
  const [cashSession, setCashSession] = useState<CashSession | null>(null);
  const [noCashDialogOpen, setNoCashDialogOpen] = useState(false);
  const [weeklyWarningShown, setWeeklyWarningShown] = useState(false);
  const [openCashDialogOpen, setOpenCashDialogOpen] = useState(false);
  const [closeCashDialogOpen, setCloseCashDialogOpen] = useState(false);
  const [movementDialogOpen, setMovementDialogOpen] = useState(false);
  const [movementType, setMovementType] = useState<"income" | "expense">("income");
  const [initialBalance, setInitialBalance] = useState("");
  const [movementAmount, setMovementAmount] = useState("");
  const [movementDescription, setMovementDescription] = useState("");
  const [movementMethod, setMovementMethod] = useState("cash");

  useEffect(() => {
    loadProducts();
    loadCashSession();
  }, []);

  useEffect(() => {
    if (cashSession && !cashSession.endTime) {
      checkSessionDuration(cashSession);
    }
  }, [cashSession]);

  const loadProducts = async () => {
    try {
      const data = await WailsAPI.getProducts();
      setProducts(data);
    } catch (error) {
      console.error("Failed to load products:", error);
      toast.error("Error al cargar productos");
    } finally {
      setLoading(false);
    }
  };

  const loadCashSession = async () => {
    try {
      const session = await WailsAPI.getCashSession();
      setCashSession(session);
    } catch (error) {
      console.error("Failed to load cash session:", error);
    }
  };

  const checkSessionDuration = (session: CashSession) => {
    if (weeklyWarningShown) return;

    const startTime = new Date(session.startTime);
    const now = new Date();
    const daysDiff = (now.getTime() - startTime.getTime()) / (1000 * 60 * 60 * 24);

    if (daysDiff >= 7) {
      setWeeklyWarningShown(true);
      toast.error("¡ATENCIÓN! La caja está abierta desde hace más de 7 días. Se recomienda cerrarla.", {
        duration: 10000,
      });
    }
  };

  const handleAddToCart = (product: Product, weight?: number) => {
    if (!cashSession || cashSession.endTime) {
      setNoCashDialogOpen(true);
      toast.error("Debes abrir caja antes de realizar ventas");
      return;
    }

    const quantity = weight || 1;
    setCartItems((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, { ...product, quantity }];
    });
    if (weight) {
      toast.success(`${product.name} - ${weight} kg agregado al carrito`);
    } else {
      toast.success(`${product.name} agregado al carrito`);
    }
  };

  const handleUpdateQuantity = (productId: string, delta: number) => {
    setCartItems((prev) => {
      return prev
        .map((item) =>
          item.id === productId
            ? { ...item, quantity: item.quantity + delta }
            : item
        )
        .filter((item) => item.quantity > 0);
    });
  };

  const handleRemoveItem = (productId: string) => {
    setCartItems((prev) => prev.filter((item) => item.id !== productId));
    toast.success("Artículo eliminado del carrito");
  };

  const handleAddAdjustment = (adjustment: Omit<Adjustment, "id">) => {
    const newAdjustment: Adjustment = {
      ...adjustment,
      id: Date.now().toString(),
    };
    setAdjustments((prev) => [...prev, newAdjustment]);
    toast.success(
      adjustment.type === "charge"
        ? `Recargo aplicado: ${adjustment.label}`
        : `Descuento aplicado: ${adjustment.label}`
    );
  };

  const handleRemoveAdjustment = (id: string) => {
    setAdjustments((prev) => prev.filter((adj) => adj.id !== id));
    toast.success("Ajuste eliminado");
  };

  const calculateSubtotal = () => {
    return cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  };

  const calculateAdjustmentsTotal = () => {
    const subtotal = calculateSubtotal();
    let total = 0;

    adjustments.forEach((adj) => {
      const amount = adj.isPercentage
        ? (subtotal * adj.amount) / 100
        : adj.amount;

      if (adj.type === "charge") {
        total += amount;
      } else {
        total -= amount;
      }
    });

    return total;
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateAdjustmentsTotal();
  };

  const handleCheckout = async (payments: PaymentMethod[], voucherType: VoucherType) => {
    if (cartItems.length === 0) return;

    try {
      const total = calculateTotal();

      const transaction: Transaction = {
        id: Date.now().toString(),
        items: cartItems,
        total,
        timestamp: new Date().toISOString(),
      };

      // Imprimir comprobante según el tipo
      await WailsAPI.printReceipt(cartItems, total);

      // Solo guardar transacción y descontar stock si NO es presupuesto
      if (voucherType !== "presupuesto") {
        await WailsAPI.saveTransaction(transaction);
      }

      // Mensaje según tipo de comprobante
      const voucherLabels = {
        factura: "Factura",
        comprobante: "Comprobante",
        presupuesto: "Presupuesto",
      };

      toast.success(
        voucherType === "presupuesto"
          ? `${voucherLabels[voucherType]} generado (sin descuento de stock)`
          : `${voucherLabels[voucherType]} generado exitosamente`
      );

      setCartItems([]);
      setAdjustments([]);
      setCheckoutOpen(false);
    } catch (error) {
      console.error("Checkout failed:", error);
      toast.error("Error al procesar el pago");
    }
  };

  const handleCancel = () => {
    if (cartItems.length === 0 && adjustments.length === 0) return;
    setCartItems([]);
    setAdjustments([]);
    toast.success("Pedido cancelado");
  };

  const handleHold = () => {
    if (cartItems.length === 0) return;

    const newOrder: HeldOrder = {
      id: Date.now().toString(),
      items: [...cartItems],
      adjustments: [...adjustments],
      total: calculateTotal(),
      timestamp: new Date().toISOString(),
    };

    onHeldOrdersChange([...heldOrders, newOrder]);
    setCartItems([]);
    setAdjustments([]);
    toast.success("Pedido pausado y guardado en la cola");
  };

  const handleResumeOrder = (order: HeldOrder) => {
    setCartItems(order.items);
    setAdjustments(order.adjustments);
    onHeldOrdersChange(heldOrders.filter((o) => o.id !== order.id));
    setQueueOpen(false);
    toast.success("Pedido retomado");
  };

  const handleDeleteOrder = (orderId: string) => {
    onHeldOrdersChange(heldOrders.filter((o) => o.id !== orderId));
    toast.success("Pedido eliminado de la cola");
  };

  const handleOpenDrawer = async () => {
    try {
      await WailsAPI.openCashDrawer();
      toast.success("Cajón de efectivo abierto");
    } catch (error) {
      console.error("Failed to open drawer:", error);
      toast.error("Error al abrir cajón");
    }
  };

  const handleOpenCash = async () => {
    const amount = parseFloat(initialBalance);

    if (initialBalance === "" || isNaN(amount) || amount < 0) {
      toast.error("Ingresa un monto válido");
      return;
    }

    try {
      await WailsAPI.startCashSession(amount);
      const newSession = await WailsAPI.getCashSession();
      setCashSession(newSession);
      setOpenCashDialogOpen(false);
      setInitialBalance("");
      toast.success("Caja abierta exitosamente");
    } catch (error) {
      console.error("Failed to open cash:", error);
      toast.error("Error al abrir caja");
    }
  };

  const handleCloseCash = async () => {
    try {
      if (!cashSession) return;
      const expectedAmount = cashSession.initialBalance + cashSession.totalSales;
      await WailsAPI.closeCashSession(cashSession.totalSales, expectedAmount);
      const newSession = await WailsAPI.getCashSession();
      setCashSession(newSession);
      setCloseCashDialogOpen(false);
      toast.success("Caja cerrada exitosamente");
    } catch (error) {
      console.error("Failed to close cash:", error);
      toast.error("Error al cerrar caja");
    }
  };

  const handleSaveMovement = async () => {
    if (!movementAmount || !movementDescription) {
      toast.error("Completa todos los campos");
      return;
    }

    const amount = parseFloat(movementAmount);
    if (amount <= 0) {
      toast.error("Ingresa un monto válido");
      return;
    }

    const movement = {
      amount,
      description: movementDescription,
      paymentMethod: movementMethod,
      type: movementType,
      timestamp: new Date().toISOString(),
    };

    console.log("Movement:", movement);

    // Generar comprobante de ingreso/egreso
    try {
      const voucherType = movementType === "income" ? "Ingreso" : "Egreso";
      const voucherData = {
        type: voucherType,
        amount,
        description: movementDescription,
        paymentMethod: movementMethod,
        timestamp: movement.timestamp,
      };

      console.log(`📄 Generando comprobante de ${voucherType.toLowerCase()}:`, voucherData);

      // Aquí se puede llamar a una función para imprimir el comprobante
      // await WailsAPI.printMovementVoucher(voucherData);

      toast.success(
        movementType === "income"
          ? `Comprobante de Ingreso generado: $${amount.toFixed(2)}`
          : `Comprobante de Egreso generado: $${amount.toFixed(2)}`
      );
    } catch (error) {
      console.error("Failed to generate voucher:", error);
      toast.error("Error al generar comprobante");
    }

    setMovementDialogOpen(false);
    setMovementAmount("");
    setMovementDescription("");
    setMovementMethod("cash");
  };

  // Atajos de teclado
  useKeyboardShortcuts({
    F8: () => {
      if (cartItems.length > 0) {
        setCheckoutOpen(true);
      }
    },
    F12: () => {
      handleOpenDrawer();
    },
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-pulse text-muted-foreground">
            Cargando productos...
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex h-full relative">
        <div className="flex-1 border-r">
          <ProductCatalog
            products={products}
            onAddToCart={handleAddToCart}
            cashSession={cashSession}
            onOpenCash={() => setOpenCashDialogOpen(true)}
            onCloseCash={() => setCloseCashDialogOpen(true)}
            onOpenMovements={() => setMovementDialogOpen(true)}
          />
        </div>
        <div className="w-[400px]">
          <ShoppingCartEnhanced
            items={cartItems}
            adjustments={adjustments}
            onUpdateQuantity={handleUpdateQuantity}
            onRemoveItem={handleRemoveItem}
            onAddAdjustment={handleAddAdjustment}
            onRemoveAdjustment={handleRemoveAdjustment}
            onCheckout={() => setCheckoutOpen(true)}
            onCancel={handleCancel}
            onHold={handleHold}
            subtotal={calculateSubtotal()}
            total={calculateTotal()}
          />
        </div>

        {/* Botón flotante de cola de pedidos */}
        {heldOrders.length > 0 && (
          <Sheet open={queueOpen} onOpenChange={setQueueOpen}>
            <SheetTrigger asChild>
              <Button
                size="lg"
                className="fixed bottom-6 left-6 h-16 px-6 shadow-lg gap-3 z-50"
              >
                <ListOrdered className="size-6" />
                <div className="text-left">
                  <div className="font-semibold">Pedidos en Espera</div>
                  <div className="text-xs opacity-90">{heldOrders.length} pendiente(s)</div>
                </div>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[400px] p-0">
              <SheetHeader className="p-6 pb-4">
                <SheetTitle>Cola de Pedidos</SheetTitle>
                <SheetDescription>
                  Pedidos pausados en espera de procesamiento
                </SheetDescription>
              </SheetHeader>
              <OrderQueuePanel
                heldOrders={heldOrders}
                onResumeOrder={handleResumeOrder}
                onDeleteOrder={handleDeleteOrder}
              />
            </SheetContent>
          </Sheet>
        )}
      </div>

      <CheckoutModalEnhanced
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        items={cartItems}
        subtotal={calculateTotal()}
        onConfirm={handleCheckout}
      />

      {/* Diálogo de caja cerrada */}
      <AlertDialog open={noCashDialogOpen} onOpenChange={setNoCashDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="size-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <DollarSign className="size-6 text-destructive" />
              </div>
              <div>
                <AlertDialogTitle>Caja Cerrada</AlertDialogTitle>
                <AlertDialogDescription>
                  No puedes realizar ventas sin abrir caja
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          <div className="py-4">
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <div className="flex items-start gap-2">
                <AlertTriangle className="size-5 text-orange-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium mb-1">Ahora puedes abrir caja desde aquí:</p>
                  <p className="text-muted-foreground">
                    Presiona el botón "Abrir Caja" en la parte superior del catálogo de productos
                  </p>
                </div>
              </div>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogAction>Entendido</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Diálogo de Abrir Caja */}
      <Dialog open={openCashDialogOpen} onOpenChange={setOpenCashDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Unlock className="size-5" />
              Abrir Caja
            </DialogTitle>
            <DialogDescription>
              Ingresa el monto inicial para comenzar el día
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="initialBalance">Monto Inicial ($)</Label>
              <Input
                id="initialBalance"
                type="number"
                step="0.01"
                min="0"
                value={initialBalance}
                onChange={(e) => setInitialBalance(e.target.value)}
                placeholder="0.00"
                className="text-2xl h-14 mt-1"
                autoFocus
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[0, 10000, 50000].map((amount) => (
                <Button
                  key={amount}
                  variant="outline"
                  onClick={() => setInitialBalance(amount.toString())}
                >
                  ${amount.toLocaleString()}
                </Button>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setOpenCashDialogOpen(false);
                setInitialBalance("");
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleOpenCash}
              disabled={initialBalance === "" || isNaN(parseFloat(initialBalance))}
            >
              <Unlock className="size-4 mr-2" />
              Abrir Caja
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de Cerrar Caja */}
      <AlertDialog open={closeCashDialogOpen} onOpenChange={setCloseCashDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Lock className="size-5" />
              Cerrar Caja
            </AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de cerrar la caja? Se cerrará con el monto esperado.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {cashSession && (
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Saldo Inicial:</span>
                <span className="font-medium">
                  ${cashSession.initialBalance.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Total Ventas:</span>
                <span className="font-medium text-green-600">
                  ${cashSession.totalSales.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="font-medium">Monto Final:</span>
                <span className="font-bold">
                  ${(cashSession.initialBalance + cashSession.totalSales).toFixed(2)}
                </span>
              </div>
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleCloseCash}>
              Cerrar Caja
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Diálogo de Movimientos */}
      <Dialog open={movementDialogOpen} onOpenChange={setMovementDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowUpDown className="size-5" />
              Registrar Movimiento
            </DialogTitle>
            <DialogDescription>
              Registra ingresos o egresos de efectivo
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={movementType === "income" ? "default" : "outline"}
                onClick={() => setMovementType("income")}
                className="gap-2"
              >
                <TrendingUp className="size-4" />
                Ingreso
              </Button>
              <Button
                variant={movementType === "expense" ? "default" : "outline"}
                onClick={() => setMovementType("expense")}
                className="gap-2"
              >
                <TrendingDown className="size-4" />
                Egreso
              </Button>
            </div>

            <div>
              <Label htmlFor="movementAmount">Monto ($)</Label>
              <Input
                id="movementAmount"
                type="number"
                step="0.01"
                min="0"
                value={movementAmount}
                onChange={(e) => setMovementAmount(e.target.value)}
                placeholder="0.00"
                className="text-2xl h-14 mt-1"
              />
            </div>

            <div>
              <Label htmlFor="movementDescription">Descripción</Label>
              <Input
                id="movementDescription"
                type="text"
                value={movementDescription}
                onChange={(e) => setMovementDescription(e.target.value)}
                placeholder={
                  movementType === "income"
                    ? "Ej: Pago de buzón"
                    : "Ej: Pago a proveedor"
                }
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="movementMethod">Método de Pago</Label>
              <Select value={movementMethod} onValueChange={setMovementMethod}>
                <SelectTrigger id="movementMethod" className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Efectivo</SelectItem>
                  <SelectItem value="card">Tarjeta</SelectItem>
                  <SelectItem value="transfer">Transferencia</SelectItem>
                  <SelectItem value="qr">QR / App</SelectItem>
                  <SelectItem value="buzon">Buzón</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setMovementDialogOpen(false);
                setMovementAmount("");
                setMovementDescription("");
                setMovementMethod("cash");
              }}
            >
              Cancelar
            </Button>
            <Button onClick={handleSaveMovement}>
              Guardar Movimiento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
