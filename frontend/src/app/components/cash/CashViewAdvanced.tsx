import { useState, useEffect, useCallback } from "react";
import { CashSession } from "../../../lib/wails-bridge";
import { PosAPI } from "../../../lib/pos-api";
import { getExpectedCashInDrawer } from "../../../lib/cash-expected";
import { getSalesByPaymentMethod, isCashSessionOpen, CASH_DATA_UPDATED_EVENT } from "../../../lib/cash-session";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import {
  DollarSign,
  Calendar,
  CreditCard,
  Smartphone,
  Wallet,
  Monitor,
} from "lucide-react";
import { toast } from "sonner";
import { CashMovementsTable } from "./CashMovementsTable";
import { SalesHistoryTable } from "./SalesHistoryTable";
import { CreditNotesPanel } from "./CreditNotesPanel";

export function CashViewAdvanced() {
  const [session, setSession] = useState<CashSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadSession = useCallback(async () => {
    try {
      const data = await PosAPI.getCashSession();
      setSession(data);
      setRefreshKey((value) => value + 1);
    } catch (error) {
      console.error("Failed to load cash session:", error);
      toast.error("Error al cargar sesión de caja");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  useEffect(() => {
    const onFocus = () => void loadSession();
    const onCashDataUpdated = () => void loadSession();
    window.addEventListener("focus", onFocus);
    window.addEventListener(CASH_DATA_UPDATED_EVENT, onCashDataUpdated);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener(CASH_DATA_UPDATED_EVENT, onCashDataUpdated);
    };
  }, [loadSession]);

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

  const salesByMethod = session ? getSalesByPaymentMethod(session) : null;

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="p-6 border-b bg-background shrink-0">
        <div className="flex items-center gap-3">
          <DollarSign className="size-6" />
          <div>
            <h1 className="text-2xl font-semibold">Caja Activa</h1>
            <p className="text-sm text-muted-foreground">
              Monitoreo del turno actual. Abrí, cerrá y operá la caja desde el Mostrador.
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-auto p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {isCashSessionOpen(session) ? (
            <>
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
                    Efectivo esperado en cajón
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">
                    ${getExpectedCashInDrawer(session).toFixed(2)}
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
                    <span className="font-medium">Abierta</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {salesByMethod && (
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
                            ${salesByMethod.cash.toFixed(2)}
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
                            ${salesByMethod.card.toFixed(2)}
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
                          <p className="text-sm text-muted-foreground">Transferencia</p>
                          <p className="text-2xl font-bold">
                            ${salesByMethod.transfer.toFixed(2)}
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
                            ${salesByMethod.qr.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Detalles de la Sesión</CardTitle>
                <CardDescription>Información de la sesión de caja actual</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <Calendar className="size-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Hora de Apertura</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(session.startTime).toLocaleString("es-AR")}
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm font-medium text-green-900">
                    Turno activo — las operaciones de caja se realizan en el Mostrador
                  </p>
                </div>
              </CardContent>
            </Card>

            </>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-10 text-muted-foreground text-center gap-4">
                <DollarSign className="size-16 opacity-20" />
                <p className="text-lg font-medium text-foreground">No hay caja abierta</p>
                <p className="text-sm max-w-md">
                  Para abrir o cerrar la caja, usá los controles del Mostrador. Abajo podés consultar
                  ventas y movimientos ya registrados.
                </p>
                <div className="flex items-center gap-2 text-sm p-3 bg-muted rounded-lg">
                  <Monitor className="size-4 shrink-0" />
                  <span>Mostrador → Abrir Caja / Cerrar Caja</span>
                </div>
              </CardContent>
            </Card>
          )}

          <CashMovementsTable sessionId={session?.id} refreshKey={refreshKey} />
          <CreditNotesPanel />
          <SalesHistoryTable sessionId={session?.id} refreshKey={refreshKey} />
        </div>
      </div>
    </div>
  );
}
