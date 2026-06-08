import { useState, useEffect } from "react";
import { CashSession, WailsAPI } from "../../../lib/wails-bridge";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { DollarSign, Calendar, TrendingUp } from "lucide-react";
import { toast } from "sonner";

export function CashView() {
  const [session, setSession] = useState<CashSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [startDialogOpen, setStartDialogOpen] = useState(false);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [initialBalance, setInitialBalance] = useState("");
  const [finalBalance, setFinalBalance] = useState("");

  useEffect(() => {
    loadSession();
  }, []);

  const loadSession = async () => {
    try {
      const data = await WailsAPI.getCashSession();
      setSession(data);
    } catch (error) {
      console.error("Failed to load cash session:", error);
      toast.error("Error al cargar sesión de caja");
    } finally {
      setLoading(false);
    }
  };

  const handleStartSession = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await WailsAPI.startCashSession(parseFloat(initialBalance));
      await loadSession();
      setStartDialogOpen(false);
      setInitialBalance("");
      toast.success("Sesión de caja iniciada");
    } catch (error) {
      console.error("Failed to start session:", error);
      toast.error("Error al iniciar sesión");
    }
  };

  const handleCloseSession = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await WailsAPI.closeCashSession(parseFloat(finalBalance));
      await loadSession();
      setCloseDialogOpen(false);
      setFinalBalance("");
      toast.success("Sesión de caja cerrada");
    } catch (error) {
      console.error("Failed to close session:", error);
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
            <Button variant="outline" size="lg" onClick={handleOpenDrawer}>
              Abrir Cajón
            </Button>
            {!session?.endTime ? (
              <Button
                size="lg"
                variant="destructive"
                onClick={() => setCloseDialogOpen(true)}
                disabled={!session}
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
        {session ? (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Detalles de la Sesión</CardTitle>
                <CardDescription>Información de la sesión de caja actual</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <Calendar className="size-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Hora de Inicio</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(session.startTime).toLocaleString('es-ES')}
                    </p>
                  </div>
                </div>

                {session.endTime && (
                  <>
                    <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                      <Calendar className="size-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Hora de Cierre</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(session.endTime).toLocaleString('es-ES')}
                        </p>
                      </div>
                    </div>

                    {session.finalBalance !== undefined && (
                      <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                        <TrendingUp className="size-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">Saldo Final</p>
                          <p className="text-sm text-muted-foreground">
                            ${session.finalBalance.toFixed(2)}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Diferencia: $
                            {(
                              session.finalBalance -
                              (session.initialBalance + session.totalSales)
                            ).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {!session.endTime && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm font-medium text-green-900">
                      La sesión está actualmente activa
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Iniciar Sesión de Caja</DialogTitle>
            <DialogDescription>
              Ingrese el saldo inicial de efectivo en el cajón
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleStartSession} className="space-y-4">
            <div>
              <Label htmlFor="initialBalance">Saldo Inicial ($)</Label>
              <Input
                id="initialBalance"
                type="number"
                step="0.01"
                min="0"
                value={initialBalance}
                onChange={(e) => setInitialBalance(e.target.value)}
                placeholder="0.00"
                required
              />
            </div>
            <DialogFooter>
              <Button type="submit">Iniciar Sesión</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={closeDialogOpen} onOpenChange={setCloseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cerrar Sesión de Caja</DialogTitle>
            <DialogDescription>
              Cuente el efectivo e ingrese el saldo final
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCloseSession} className="space-y-4">
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
                  <span className="font-medium">Saldo Esperado:</span>
                  <span className="font-bold">
                    ${(session.initialBalance + session.totalSales).toFixed(2)}
                  </span>
                </div>
              </div>
            )}
            <div>
              <Label htmlFor="finalBalance">Saldo Final ($)</Label>
              <Input
                id="finalBalance"
                type="number"
                step="0.01"
                min="0"
                value={finalBalance}
                onChange={(e) => setFinalBalance(e.target.value)}
                placeholder="0.00"
                required
              />
            </div>
            <DialogFooter>
              <Button type="submit" variant="destructive">
                Cerrar Sesión
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
