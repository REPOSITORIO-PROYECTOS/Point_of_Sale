import { useState, useEffect } from "react";
import { PosAPI } from "../../../lib/pos-api";
import { useTheme } from "../../../lib/theme-context";
import { useAuth } from "../../../lib/auth-context";
import { useBusinessSettings } from "../../../lib/business-settings-context";
import type { Product, CartItem, Transaction, PaymentMethod, CashSession } from "../../../lib/wails-bridge";
import { WailsAPI } from "../../../lib/wails-bridge";
import { getExpectedCashBreakdown, getExpectedCashInDrawer } from "../../../lib/cash-expected";
import type { VoucherType } from "./CheckoutModalEnhanced";
import { ProductCatalog } from "./ProductCatalog";
import { ShoppingCartEnhanced } from "./ShoppingCartEnhanced";
import { CheckoutModalEnhanced } from "./CheckoutModalEnhanced";
import {
  buildAfipFacturaPayload,
  DEFAULT_AFIP_BILLING_DEFAULTS,
  formatAfipBuyerSummary,
  normalizeAfipBillingDefaults,
  type AfipBillingDefaults,
  type AfipCheckoutBuyer,
} from "../../../lib/afip-fiscal";
import { AFIP_CONDICION_IVA_OPTIONS } from "../../../lib/afip-fiscal";
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

function toCashAmount(value: unknown): number {
  const amount = typeof value === "number" ? value : Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

function formatMoney(value: unknown): string {
  return toCashAmount(value).toFixed(2);
}

type PaymentMethodKey = keyof NonNullable<CashSession["salesByPaymentMethod"]>;

const PAYMENT_METHOD_LABELS: Record<PaymentMethodKey, string> = {
  cash: "Efectivo",
  card: "Tarjeta",
  transfer: "Transferencia",
  qr: "QR / App",
};

const PAYMENT_METHOD_ORDER: PaymentMethodKey[] = ["cash", "card", "transfer", "qr"];

function getSalesByMethod(session: CashSession) {
  return session.salesByPaymentMethod ?? { cash: 0, card: 0, transfer: 0, qr: 0 };
}

export function POSScreenEnhanced({
  heldOrders,
  onHeldOrdersChange,
}: POSScreenEnhancedProps) {
  const { themeConfig } = useTheme();
  const { user } = useAuth();
  const { settings: businessSettings } = useBusinessSettings();
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
  const [countedAmount, setCountedAmount] = useState("");
  const [afipBillingDefaults, setAfipBillingDefaults] = useState<AfipBillingDefaults>(
    DEFAULT_AFIP_BILLING_DEFAULTS,
  );
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

  useEffect(() => {
    if (closeCashDialogOpen) {
      void loadCashSession();
    }
  }, [closeCashDialogOpen]);

  const loadProducts = async () => {
    try {
      const data = await PosAPI.getProducts();
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
      const session = await PosAPI.getCashSession();
      setCashSession(session);
    } catch (error) {
      console.error("Failed to load cash session:", error);
      setCashSession(null);
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

  const handleCheckout = async (
    payments: PaymentMethod[],
    voucherType: VoucherType,
    afipBuyer?: AfipCheckoutBuyer,
  ) => {
    if (cartItems.length === 0) return;

    try {
      const total = calculateTotal();

      const ticketId = Date.now().toString();
      const subtotal = calculateSubtotal();
      const receptorLabel =
        afipBuyer && afipBuyer.mode === "custom"
          ? formatAfipBuyerSummary(afipBuyer)
          : undefined;

      const facturaFiscal =
        voucherType === "factura" && afipBuyer
          ? buildAfipFacturaPayload(total, afipBuyer, afipBillingDefaults)
          : null;

      await WailsAPI.printReceipt(cartItems, total, {
        receiptWidthMm: themeConfig.receiptWidthMm ?? 80,
        logoUrl: themeConfig.logoUrl,
        businessName: businessSettings.businessName,
        voucherType,
        ticketId,
        subtotal,
        adjustments,
        payments,
        emisor: {
          razonSocial: businessSettings.businessName ?? "Mi Negocio",
          cuit: businessSettings.taxId,
          domicilio: businessSettings.address,
        },
        receptor:
          voucherType === "factura" && afipBuyer
            ? {
                nombreRazonSocial:
                  afipBuyer.mode === "consumidor_final" ? "Consumidor Final" : receptorLabel,
                cuitODni: afipBuyer.tipoDocumento === 99 ? "S/D" : afipBuyer.documento,
                condicionIva:
                  AFIP_CONDICION_IVA_OPTIONS.find((o) => o.value === afipBuyer.idCondicionIva)?.label ??
                  "Consumidor Final",
              }
            : undefined,
        afip:
          facturaFiscal && afipBuyer
            ? {
                tipoAfip: afipBuyer.tipoAfip,
                tipoComprobanteLetra: afipBuyer.tipoAfip === 1 ? "A" : afipBuyer.tipoAfip === 11 ? "C" : "B",
                neto: facturaFiscal.neto,
                iva: facturaFiscal.iva,
                ivaRateLabel: `${afipBillingDefaults.ivaRatePercent}%`,
              }
            : undefined,
        mostrarDesgloseIva: voucherType === "factura",
      });

      const transaction: Transaction = {
        id: ticketId,
        items: cartItems,
        total,
        timestamp: new Date().toISOString(),
      };

      if (voucherType !== "presupuesto") {
        await PosAPI.createSale(transaction, payments, voucherType);
      }

      if (voucherType === "factura" && afipBuyer) {
        try {
          const facturaPayload = facturaFiscal ?? buildAfipFacturaPayload(total, afipBuyer, afipBillingDefaults);
          await PosAPI.facturarAfip(facturaPayload);
        } catch (afipError) {
          console.error("AFIP facturación failed:", afipError);
          toast.error(
            afipError instanceof Error
              ? `Venta registrada, pero falló la factura: ${afipError.message}`
              : "Venta registrada, pero falló la factura electrónica"
          );
        }
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
      const newSession = await PosAPI.startCashSession(amount);
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
    const parsedCounted = parseFloat(countedAmount);
    if (countedAmount === "" || isNaN(parsedCounted) || parsedCounted < 0) {
      toast.error("Ingresá el efectivo contado en el arqueo");
      return;
    }

    let latestSession: CashSession | null;
    try {
      latestSession = await PosAPI.getCashSession();
    } catch (error) {
      console.error("Failed to verify cash session:", error);
      setCashSession(null);
      setCloseCashDialogOpen(false);
      setCountedAmount("");
      toast.error("No se pudo conectar con la API. Ejecutá npm run dev:stack y recargá la página.");
      return;
    }

    if (!latestSession || latestSession.endTime) {
      setCashSession(latestSession);
      setCloseCashDialogOpen(false);
      setCountedAmount("");
      toast.error("No hay una sesión de caja abierta");
      return;
    }

    try {
      const expectedCash = getExpectedCashInDrawer(latestSession);

      await PosAPI.closeCashSession(expectedCash, parsedCounted);
      const newSession = await PosAPI.getCashSession();
      setCashSession(newSession);
      setCloseCashDialogOpen(false);
      setCountedAmount("");

      const variance = parsedCounted - expectedCash;
      if (Math.abs(variance) < 0.01) {
        toast.success("Caja cerrada — arqueo sin diferencias");
      } else if (variance > 0) {
        toast.success(`Caja cerrada — sobrante de $${variance.toFixed(2)}`);
      } else {
        toast.warning(`Caja cerrada — faltante de $${Math.abs(variance).toFixed(2)}`);
      }
    } catch (error) {
      console.error("Failed to close cash:", error);
      const message = error instanceof Error ? error.message : "";
      if (message.toLowerCase().includes("no open cash session")) {
        try {
          const refreshedSession = await PosAPI.getCashSession();
          setCashSession(refreshedSession);
        } catch {
          setCashSession(null);
        }
        setCloseCashDialogOpen(false);
        setCountedAmount("");
        toast.error("La caja ya está cerrada o no hay sesión abierta");
        return;
      }
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

    if (!cashSession || cashSession.endTime) {
      toast.error("No hay una sesión de caja abierta");
      return;
    }

    const movement = {
      amount,
      description: movementDescription,
      paymentMethod: movementMethod as "cash" | "card" | "transfer" | "qr",
      type: movementType,
      timestamp: new Date().toISOString(),
    };

    try {
      await PosAPI.createCashMovement({
        description: movementDescription,
        amount,
        type: movementType,
        paymentMethod: movement.paymentMethod,
      });

      const updatedSession = await PosAPI.getCashSession();
      setCashSession(updatedSession);

      await WailsAPI.printMovementVoucher(
        {
          type: movementType,
          amount,
          description: movementDescription,
          paymentMethod: movementMethod,
          timestamp: movement.timestamp,
          sessionId: cashSession.id,
        },
        {
          businessName: businessSettings.businessName,
          receiptWidthMm: themeConfig.receiptWidthMm ?? 80,
          operatorName: user?.username,
        },
      );

      toast.success(
        movementType === "income"
          ? `Ingreso registrado: $${amount.toFixed(2)}`
          : `Egreso registrado: $${amount.toFixed(2)}`,
      );
    } catch (error) {
      console.error("Failed to save movement:", error);
      toast.error("Error al registrar movimiento");
      return;
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
        afipBillingDefaults={afipBillingDefaults}
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
      <Dialog
        open={closeCashDialogOpen}
        onOpenChange={(open) => {
          setCloseCashDialogOpen(open);
          if (!open) setCountedAmount("");
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="size-5" />
              Cerrar Caja — Arqueo
            </DialogTitle>
            <DialogDescription>
              Contá solo el efectivo del cajón. El sistema compara contra el saldo inicial, ventas en
              efectivo y movimientos. Tarjeta, transferencia y QR no entran al arqueo.
            </DialogDescription>
          </DialogHeader>

          {cashSession && (() => {
            const salesByMethod = getSalesByMethod(cashSession);
            const { initialBalance, cashSales, cashNet, expectedCash } =
              getExpectedCashBreakdown(cashSession);
            const parsedCounted = parseFloat(countedAmount);
            const hasCounted = countedAmount !== "" && !isNaN(parsedCounted);
            const variance = hasCounted ? parsedCounted - expectedCash : null;
            const nonCashMethods = PAYMENT_METHOD_ORDER.filter(
              (method) => method !== "cash" && toCashAmount(salesByMethod[method]) > 0,
            );

            return (
              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-lg space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Efectivo esperado en cajón
                  </p>
                  <div className="flex justify-between text-sm">
                    <span>Saldo inicial al abrir</span>
                    <span>${formatMoney(initialBalance)}</span>
                  </div>
                  {cashSales > 0 && (
                    <div className="flex justify-between text-sm">
                      <span>+ Ventas en efectivo</span>
                      <span>${formatMoney(cashSales)}</span>
                    </div>
                  )}
                  {Math.abs(cashNet) >= 0.01 && (
                    <div className="flex justify-between text-sm">
                      <span>{cashNet >= 0 ? "+ Movimientos en efectivo" : "− Movimientos en efectivo"}</span>
                      <span>
                        {cashNet >= 0 ? "" : "−"}${formatMoney(Math.abs(cashNet))}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-semibold border-t pt-2 mt-2">
                    <span>Efectivo esperado</span>
                    <span>${formatMoney(expectedCash)}</span>
                  </div>
                </div>

                {(nonCashMethods.length > 0 || cashSales > 0) && (
                  <div className="p-4 bg-muted/60 rounded-lg space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Ventas por medio de pago
                    </p>
                    {PAYMENT_METHOD_ORDER.map((method) => {
                      const amount = toCashAmount(salesByMethod[method]);
                      if (amount <= 0) return null;

                      return (
                        <div key={method} className="flex justify-between text-sm">
                          <span className={method === "cash" ? "font-medium" : "text-muted-foreground"}>
                            {PAYMENT_METHOD_LABELS[method]}
                            {method !== "cash" && (
                              <span className="text-xs ml-1">(no va al cajón)</span>
                            )}
                          </span>
                          <span className={method === "cash" ? "font-medium" : "text-muted-foreground"}>
                            ${formatMoney(amount)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div>
                  <Label htmlFor="countedAmount">Efectivo Contado en Cajón ($)</Label>
                  <Input
                    id="countedAmount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={countedAmount}
                    onChange={(e) => setCountedAmount(e.target.value)}
                    placeholder="0.00"
                    className="text-2xl h-14 mt-1"
                    autoFocus
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Solo contá billetes y monedas. No incluyas tarjeta ni transferencias.
                  </p>
                </div>

                {hasCounted && variance !== null && (
                  <div
                    className={`p-4 rounded-lg border ${
                      Math.abs(variance) < 0.01
                        ? "bg-green-50 border-green-200"
                        : variance > 0
                          ? "bg-blue-50 border-blue-200"
                          : "bg-red-50 border-red-200"
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">
                        {Math.abs(variance) < 0.01
                          ? "Arqueo de efectivo correcto"
                          : variance > 0
                            ? "Sobrante en efectivo"
                            : "Faltante en efectivo"}
                      </span>
                      <span
                        className={`text-lg font-bold ${
                          Math.abs(variance) < 0.01
                            ? "text-green-700"
                            : variance > 0
                              ? "text-blue-700"
                              : "text-red-700"
                        }`}
                      >
                        {variance > 0 ? "+" : ""}${variance.toFixed(2)}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm mt-2 text-muted-foreground">
                      <span>Esperado: ${expectedCash.toFixed(2)}</span>
                      <span className="text-right">Contado: ${parsedCounted.toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCloseCashDialogOpen(false);
                setCountedAmount("");
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleCloseCash}
              disabled={countedAmount === "" || isNaN(parseFloat(countedAmount))}
            >
              <Lock className="size-4 mr-2" />
              Cerrar Caja
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
