import { useState, useEffect } from "react";
import { CashSession, WailsAPI } from "../../../lib/wails-bridge";
import { PosAPI } from "../../../lib/pos-api";
import { Button } from "../ui/button";
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import {
  DollarSign,
  Calendar,
  TrendingUp,
  TrendingDown,
  CreditCard,
  Smartphone,
  Wallet,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { toast } from "sonner";
import { CashMovementModal } from "./CashMovementModal";
import { CashMovementsTable } from "./CashMovementsTable";
import { SalesHistoryTable } from "./SalesHistoryTable";
import { CreditNotesPanel } from "./CreditNotesPanel";

interface CashViewAdvancedProps {
  heldOrdersCount?: number;
  onRequestClearOrders?: () => void;
}

export function CashViewAdvanced({
  heldOrdersCount = 0,
  onRequestClearOrders
}: CashViewAdvancedProps = {}) {
  const [session, setSession] = useState<CashSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [startDialogOpen, setStartDialogOpen] = useState(false);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [warningDialogOpen, setWarningDialogOpen] = useState(false);
  const [closeTypeDialogOpen, setCloseTypeDialogOpen] = useState(false);
  const [withCounting, setWithCounting] = useState(true);
  const [initialBalance, setInitialBalance] = useState("");
  const [showExpected, setShowExpected] = useState(false);
  const [incomeModalOpen, setIncomeModalOpen] = useState(false);
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [weeklyWarningShown, setWeeklyWarningShown] = useState(false);

  // Arqueo por método de pago
  const [countedAmounts, setCountedAmounts] = useState({
    cash: "",
    card: "",
    transfer: "",
    qr: "",
  });

  // Configuración de qué métodos arquear (esto debería venir de configuración)
  const [countingConfig, setCountingConfig] = useState({
    cash: true,      // Por defecto solo efectivo
    card: false,
    transfer: false,
    qr: false,
  });

  useEffect(() => {
    loadSession();
  }, []);

  useEffect(() => {
    if (session && !session.endTime) {
      checkSessionDuration(session);
    }
  }, [session]);

  const loadSession = async () => {
    try {
      const data = await PosAPI.getCashSession();
      setSession(data);
    } catch (error) {
      console.error("Failed to load cash session:", error);
      toast.error("Error al cargar sesión de caja");
    } finally {
      setLoading(false);
    }
  };

  const checkSessionDuration = (session: CashSession) => {
    if (weeklyWarningShown) return;

    const startTime = new Date(session.startTime);
    const now = new Date();
    const daysDiff = (now.getTime() - startTime.getTime()) / (1000 * 60 * 60 * 24);

    if (daysDiff >= 7) {
      setWeeklyWarningShown(true);
      toast.error(
        `¡ATENCIÓN! La caja está abierta desde hace ${Math.floor(daysDiff)} días. Se recomienda cerrarla.`,
        {
          duration: 10000,
        }
      );
    }
  };

  const handleStartSession = async (amount: number) => {
    try {
      await PosAPI.startCashSession(amount);
      await loadSession();
      setStartDialogOpen(false);
      setInitialBalance("");
      toast.success("Sesión de caja iniciada");
    } catch (error) {
      console.error("Failed to start session:", error);
      toast.error("Error al iniciar sesión");
    }
  };

  const handleCloseSession = async () => {
    if (!session) return;

    if (!withCounting) {
      // Cierre sin arqueo - usar el monto esperado
      try {
        const expectedAmount = session.initialBalance + session.totalSales;
        await PosAPI.closeCashSession(session.initialBalance + session.totalSales, expectedAmount);
        await loadSession();
        setCloseDialogOpen(false);
        resetCountingForm();
        toast.success("Sesión de caja cerrada sin arqueo");
      } catch (error) {
        console.error("Failed to close session:", error);
        toast.error("Error al cerrar sesión");
      }
      return;
    }

    // Cierre con arqueo - validar que se hayan ingresado los montos configurados
    const hasAllRequiredAmounts = Object.entries(countingConfig).every(
      ([method, enabled]) => {
        if (!enabled) return true;
        return countedAmounts[method as keyof typeof countedAmounts] !== "";
      }
    );

    if (!hasAllRequiredAmounts) {
      toast.error("Completa todos los montos de arqueo configurados");
      return;
    }

    // Mostrar comparación (ahora sí mostramos los esperados vs contados)
    setShowExpected(true);
  };

  const resetCountingForm = () => {
    setCountedAmounts({
      cash: "",
      card: "",
      transfer: "",
      qr: "",
    });
    setShowExpected(false);
  };

  const handleConfirmClose = async () => {
    if (!session) return;

    try {
      // Calcular total contado sumando todos los métodos
      const totalCounted = Object.entries(countedAmounts).reduce((sum, [method, value]) => {
        if (countingConfig[method as keyof typeof countingConfig] && value) {
          return sum + parseFloat(value);
        }
        return sum;
      }, 0);

      await PosAPI.closeCashSession(session.initialBalance + session.totalSales, totalCounted);
      await loadSession();
      setCloseDialogOpen(false);
      resetCountingForm();
      setWithCounting(true);
      setWeeklyWarningShown(false);
      toast.success("Sesión de caja cerrada");
    } catch (error) {
      console.error("Failed to confirm close:", error);
      toast.error("Error al cerrar sesión");
    }
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

  const handleSaveIncome = (movement: {
    amount: number;
    description: string;
    paymentMethod: string;
  }) => {
    toast.success(`Ingreso registrado: $${movement.amount.toFixed(2)}`);
    console.log("Income movement:", movement);
  };

  const handleSaveExpense = (movement: {
    amount: number;
    description: string;
    paymentMethod: string;
  }) => {
    toast.success(`Egreso registrado: $${movement.amount.toFixed(2)}`);
    console.log("Expense movement:", movement);
  };

  const quickAmounts = [0, 10000, 50000, 100000];

  const getTotalCounted = () => {
    return Object.entries(countedAmounts).reduce((sum, [method, value]) => {
      if (countingConfig[method as keyof typeof countingConfig] && value) {
        return sum + parseFloat(value);
      }
      return sum;
    }, 0);
  };

  const getVariance = () => {
    if (!session) return 0;
    const totalCounted = getTotalCounted();
    const expected = session.initialBalance + session.totalSales;
    return totalCounted - expected;
  };

  const getVarianceStatus = () => {
    const variance = getVariance();
    if (Math.abs(variance) < 0.01) return "perfect";
    if (variance > 0) return "surplus";
    return "shortage";
  };

  const getMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      cash: "Efectivo",
      card: "Tarjeta",
      transfer: "Transferencia",
      qr: "QR / App",
    };
    return labels[method] || method;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-pulse text-muted-foreground">
            Cargando sesión de caja...
          </div>
        </div>
      </div>
    );
  }

  const mockSalesByMethod = {
    cash: 45000,
    card: 35000,
    transfer: 20000,
    qr: 15000,
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b bg-background">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <DollarSign className="size-6" />
            <div>
              <h1 className="text-2xl font-semibold">Gestión de Caja</h1>
              <p className="text-sm text-muted-foreground">
                Administrar sesiones de caja y operaciones del cajón
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {session && !session.endTime && (
              <>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => setIncomeModalOpen(true)}
                  className="gap-2"
                >
                  <TrendingUp className="size-4 text-green-600" />
                  Nuevo Ingreso
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => setExpenseModalOpen(true)}
                  className="gap-2"
                >
                  <TrendingDown className="size-4 text-red-600" />
                  Nuevo Egreso
                </Button>
              </>
            )}
            <Button variant="outline" size="lg" onClick={handleOpenDrawer}>
              Abrir Cajón
            </Button>
            {session && !session.endTime ? (
              <Button
                size="lg"
                variant="destructive"
                onClick={() => {
                  if (heldOrdersCount > 0) {
                    setWarningDialogOpen(true);
                  } else {
                    setCloseTypeDialogOpen(true);
                  }
                }}
              >
                Cerrar Sesión
              </Button>
            ) : (
              <Button size="lg" onClick={() => setStartDialogOpen(true)}>
                Iniciar Sesión
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {session && !session.endTime ? (
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Saldo Inicial
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">
                    ${session.initialBalance.toFixed(2)}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Ventas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-green-600">
                    ${session.totalSales.toFixed(2)}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Saldo Esperado
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">
                    ${(session.initialBalance + session.totalSales).toFixed(2)}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Estado
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <div className="size-3 rounded-full bg-green-500 animate-pulse" />
                    <span className="font-medium">Activa</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Ventas por Método de Pago</CardTitle>
                <CardDescription>
                  Desglose de las ventas según el método utilizado
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="size-10 rounded-full bg-green-100 flex items-center justify-center">
                        <DollarSign className="size-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Efectivo</p>
                        <p className="text-2xl font-bold">
                          ${mockSalesByMethod.cash.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-muted rounded-lg">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="size-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <CreditCard className="size-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Tarjeta</p>
                        <p className="text-2xl font-bold">
                          ${mockSalesByMethod.card.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-muted rounded-lg">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="size-10 rounded-full bg-purple-100 flex items-center justify-center">
                        <Wallet className="size-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Transferencia
                        </p>
                        <p className="text-2xl font-bold">
                          ${mockSalesByMethod.transfer.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-muted rounded-lg">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="size-10 rounded-full bg-orange-100 flex items-center justify-center">
                        <Smartphone className="size-5 text-orange-600" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">QR / App</p>
                        <p className="text-2xl font-bold">
                          ${mockSalesByMethod.qr.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Detalles de la Sesión</CardTitle>
                <CardDescription>
                  Información de la sesión de caja actual
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <Calendar className="size-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Hora de Inicio</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(session.startTime).toLocaleString("es-ES")}
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm font-medium text-green-900">
                    La sesión está actualmente activa
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Tabla de Movimientos del Turno */}
            <CashMovementsTable />

            {/* Panel de Notas de Crédito */}
            <CreditNotesPanel />

            {/* Historial de Ventas */}
            <SalesHistoryTable />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <DollarSign className="size-16 mb-4 opacity-20" />
            <p className="text-lg mb-4">No hay sesión de caja activa</p>
            <Button size="lg" onClick={() => setStartDialogOpen(true)}>
              Iniciar Nueva Sesión
            </Button>
          </div>
        )}
      </div>

      <Dialog open={startDialogOpen} onOpenChange={setStartDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Iniciar Sesión de Caja</DialogTitle>
            <DialogDescription>
              Selecciona o ingresa el fondo de caja inicial
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              {quickAmounts.map((amount) => (
                <Button
                  key={amount}
                  variant="outline"
                  className="h-16 text-lg"
                  onClick={() => handleStartSession(amount)}
                >
                  ${amount.toLocaleString()}
                </Button>
              ))}
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  O ingresa un monto personalizado
                </span>
              </div>
            </div>

            <div>
              <Label htmlFor="customAmount">Monto Personalizado ($)</Label>
              <Input
                id="customAmount"
                type="number"
                step="0.01"
                min="0"
                value={initialBalance}
                onChange={(e) => setInitialBalance(e.target.value)}
                placeholder="0.00"
              />
            </div>

            <DialogFooter>
              <Button
                onClick={() =>
                  initialBalance && handleStartSession(parseFloat(initialBalance))
                }
                disabled={!initialBalance}
                className="w-full"
              >
                Iniciar Sesión
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Diálogo de selección de tipo de cierre */}
      <Dialog open={closeTypeDialogOpen} onOpenChange={setCloseTypeDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Tipo de Cierre de Caja</DialogTitle>
            <DialogDescription>
              Selecciona cómo deseas cerrar la caja
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <Button
              variant="outline"
              className="w-full h-auto py-4 flex flex-col gap-2"
              onClick={() => {
                setWithCounting(true);
                setCloseTypeDialogOpen(false);
                setCloseDialogOpen(true);
              }}
            >
              <CheckCircle className="size-6 text-green-600" />
              <div>
                <p className="font-semibold">Con Arqueo (Recomendado)</p>
                <p className="text-xs text-muted-foreground">
                  Cuenta el efectivo y registra diferencias
                </p>
              </div>
            </Button>

            <Button
              variant="outline"
              className="w-full h-auto py-4 flex flex-col gap-2"
              onClick={() => {
                setWithCounting(false);
                setCloseTypeDialogOpen(false);
                setCloseDialogOpen(true);
              }}
            >
              <DollarSign className="size-6 text-blue-600" />
              <div>
                <p className="font-semibold">Sin Arqueo</p>
                <p className="text-xs text-muted-foreground">
                  Cierre automático con monto esperado
                </p>
              </div>
            </Button>
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setCloseTypeDialogOpen(false)}
              className="w-full"
            >
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={closeDialogOpen}
        onOpenChange={(open) => {
          setCloseDialogOpen(open);
          if (!open) {
            setCountedAmount("");
            setShowExpected(false);
            setWithCounting(true);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {withCounting ? "Cierre Ciego de Caja" : "Cierre Sin Arqueo"}
            </DialogTitle>
            <DialogDescription>
              {withCounting
                ? "Cuenta el efectivo e ingresa el total contado"
                : "Se cerrará con el monto esperado automáticamente"}
            </DialogDescription>
          </DialogHeader>

          {!withCounting ? (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm font-medium text-blue-900 mb-2">
                  Cierre Sin Arqueo
                </p>
                <p className="text-xs text-blue-700">
                  El sistema cerrará la caja usando el monto esperado sin verificar
                  el efectivo real.
                </p>
              </div>

              {session && (
                <div className="p-4 bg-muted rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Saldo Inicial:</span>
                    <span className="font-medium">
                      ${session.initialBalance.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Total Ventas:</span>
                    <span className="font-medium text-green-600">
                      ${session.totalSales.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="font-medium">Monto que se registrará:</span>
                    <span className="font-bold">
                      ${(session.initialBalance + session.totalSales).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setCloseDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button onClick={handleCloseSession}>
                  Confirmar Cierre
                </Button>
              </DialogFooter>
            </div>
          ) : !showExpected ? (
            <div className="space-y-4">
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex gap-3">
                <AlertCircle className="size-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-yellow-900">
                    Arqueo Ciego
                  </p>
                  <p className="text-xs text-yellow-700 mt-1">
                    Ingresa los saldos contados. Los montos esperados se mostrarán al finalizar.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {countingConfig.cash && (
                  <div>
                    <Label htmlFor="countedCash" className="flex items-center gap-2">
                      <DollarSign className="size-4" />
                      Efectivo Contado ($)
                    </Label>
                    <Input
                      id="countedCash"
                      type="number"
                      step="0.01"
                      min="0"
                      value={countedAmounts.cash}
                      onChange={(e) => setCountedAmounts({...countedAmounts, cash: e.target.value})}
                      placeholder="0.00"
                      className="text-xl h-12 mt-1"
                      autoFocus
                    />
                  </div>
                )}

                {countingConfig.card && (
                  <div>
                    <Label htmlFor="countedCard" className="flex items-center gap-2">
                      <CreditCard className="size-4" />
                      Tarjeta Contado ($)
                    </Label>
                    <Input
                      id="countedCard"
                      type="number"
                      step="0.01"
                      min="0"
                      value={countedAmounts.card}
                      onChange={(e) => setCountedAmounts({...countedAmounts, card: e.target.value})}
                      placeholder="0.00"
                      className="text-xl h-12 mt-1"
                    />
                  </div>
                )}

                {countingConfig.transfer && (
                  <div>
                    <Label htmlFor="countedTransfer" className="flex items-center gap-2">
                      <Wallet className="size-4" />
                      Transferencia Contado ($)
                    </Label>
                    <Input
                      id="countedTransfer"
                      type="number"
                      step="0.01"
                      min="0"
                      value={countedAmounts.transfer}
                      onChange={(e) => setCountedAmounts({...countedAmounts, transfer: e.target.value})}
                      placeholder="0.00"
                      className="text-xl h-12 mt-1"
                    />
                  </div>
                )}

                {countingConfig.qr && (
                  <div>
                    <Label htmlFor="countedQr" className="flex items-center gap-2">
                      <Smartphone className="size-4" />
                      QR / App Contado ($)
                    </Label>
                    <Input
                      id="countedQr"
                      type="number"
                      step="0.01"
                      min="0"
                      value={countedAmounts.qr}
                      onChange={(e) => setCountedAmounts({...countedAmounts, qr: e.target.value})}
                      placeholder="0.00"
                      className="text-xl h-12 mt-1"
                    />
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setCloseDialogOpen(false);
                    resetCountingForm();
                  }}
                >
                  Cancelar
                </Button>
                <Button onClick={handleCloseSession}>
                  Ver Comparación
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              {session && (
                <>
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm font-medium text-green-900 mb-2">
                      Comparación de Arqueo
                    </p>
                    <p className="text-xs text-green-700">
                      Ahora se muestran los montos esperados vs contados
                    </p>
                  </div>

                  {/* Detalle por método de pago */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">Detalle por Método:</h4>
                    {Object.entries(countingConfig).map(([method, enabled]) => {
                      if (!enabled) return null;
                      const counted = parseFloat(countedAmounts[method as keyof typeof countedAmounts] || "0");
                      // Por simplicidad, usamos mockSalesByMethod o 0
                      const expected = mockSalesByMethod[method as keyof typeof mockSalesByMethod] || 0;
                      const diff = counted - expected;

                      return (
                        <div key={method} className="p-3 bg-muted rounded-lg">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-medium">{getMethodLabel(method)}</span>
                            <span className={`text-sm ${
                              Math.abs(diff) < 0.01 ? "text-green-600" :
                              diff > 0 ? "text-blue-600" : "text-red-600"
                            }`}>
                              {diff > 0 ? "+" : ""}{diff.toFixed(2)}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <span className="text-muted-foreground">Esperado:</span>
                              <span className="ml-2 font-medium">${expected.toFixed(2)}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Contado:</span>
                              <span className="ml-2 font-medium">${counted.toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Totales */}
                  <div className="p-4 bg-muted rounded-lg space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Saldo Inicial:</span>
                      <span className="font-medium">
                        ${session.initialBalance.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Total Ventas:</span>
                      <span className="font-medium text-green-600">
                        ${session.totalSales.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="font-medium">Saldo Esperado:</span>
                      <span className="font-bold">
                        ${(session.initialBalance + session.totalSales).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex justify-between">
                      <span className="font-medium text-blue-900">Total Contado:</span>
                      <span className="text-2xl font-bold text-blue-900">
                        ${getTotalCounted().toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Resultado */}
                  <div
                    className={`p-4 rounded-lg border-2 ${
                      getVarianceStatus() === "perfect"
                        ? "bg-green-50 border-green-200"
                        : getVarianceStatus() === "surplus"
                        ? "bg-blue-50 border-blue-200"
                        : "bg-red-50 border-red-200"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {getVarianceStatus() === "perfect" ? (
                        <CheckCircle className="size-8 text-green-600" />
                      ) : (
                        <AlertCircle
                          className={`size-8 ${
                            getVarianceStatus() === "surplus"
                              ? "text-blue-600"
                              : "text-red-600"
                          }`}
                        />
                      )}
                      <div>
                        <p
                          className={`font-bold text-lg ${
                            getVarianceStatus() === "perfect"
                              ? "text-green-900"
                              : getVarianceStatus() === "surplus"
                              ? "text-blue-900"
                              : "text-red-900"
                          }`}
                        >
                          {getVarianceStatus() === "perfect"
                            ? "¡Cuadre Perfecto!"
                            : getVarianceStatus() === "surplus"
                            ? "Sobrante"
                            : "Faltante"}
                        </p>
                        {getVarianceStatus() !== "perfect" && (
                          <p
                            className={`text-2xl font-bold ${
                              getVarianceStatus() === "surplus"
                                ? "text-blue-900"
                                : "text-red-900"
                            }`}
                          >
                            ${Math.abs(getVariance()).toFixed(2)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={() => {
                  setShowExpected(false);
                  resetCountingForm();
                }}>
                  Volver a Contar
                </Button>
                <Button onClick={handleConfirmClose}>
                  Confirmar Cierre
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Diálogo de advertencia por pedidos pendientes */}
      <AlertDialog open={warningDialogOpen} onOpenChange={setWarningDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¡Atención! Hay pedidos en espera</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Hay <strong>{heldOrdersCount}</strong> {heldOrdersCount === 1 ? "pedido" : "pedidos"} pausado(s) en el mostrador.
              </p>
              <p className="text-destructive font-medium">
                Debes facturar o eliminar estos pedidos antes de cerrar la caja.
              </p>
              <p className="text-sm">
                Si cierras la caja con pedidos pendientes, se perderán los datos de esos carritos.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Volver al Mostrador</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setWarningDialogOpen(false);
                if (onRequestClearOrders) {
                  onRequestClearOrders();
                }
                setCloseTypeDialogOpen(true);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar Pedidos y Cerrar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modales de Movimientos Manuales */}
      <CashMovementModal
        open={incomeModalOpen}
        onOpenChange={setIncomeModalOpen}
        type="income"
        onSave={handleSaveIncome}
      />

      <CashMovementModal
        open={expenseModalOpen}
        onOpenChange={setExpenseModalOpen}
        type="expense"
        onSave={handleSaveExpense}
      />
    </div>
  );
}
