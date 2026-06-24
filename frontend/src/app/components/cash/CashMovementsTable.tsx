import { useEffect, useState } from "react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { ScrollArea } from "../ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { DollarSign, Printer, TrendingDown, TrendingUp } from "lucide-react";
import { PosAPI } from "../../../lib/pos-api";
import { WailsAPI } from "../../../lib/wails-bridge";
import { useAuth } from "../../../lib/auth-context";
import { useBusinessSettings } from "../../../lib/business-settings-context";
import { useTheme } from "../../../lib/theme-context";
import type { CashMovementRecord } from "../../../lib/pos-domain-types";
import { toast } from "sonner";

type CashMovementsTableProps = {
  sessionId?: string;
  refreshKey?: number;
};

function isIncomeMovement(movement: CashMovementRecord): boolean {
  if (movement.type === "income") return true;
  if (movement.type === "expense") return false;
  return movement.amount >= 0;
}

export function CashMovementsTable({ sessionId, refreshKey = 0 }: CashMovementsTableProps) {
  const [movements, setMovements] = useState<CashMovementRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [printingId, setPrintingId] = useState<number | null>(null);
  const { user } = useAuth();
  const { settings: businessSettings } = useBusinessSettings();
  const { themeConfig } = useTheme();

  const handleReprint = async (movement: CashMovementRecord) => {
    if (!sessionId) {
      toast.error("No hay sesión de caja activa para reimprimir");
      return;
    }

    const type =
      movement.type ?? (movement.amount >= 0 ? "income" : "expense");

    setPrintingId(movement.id);
    try {
      await WailsAPI.printMovementVoucher(
        {
          type,
          amount: Math.abs(movement.amount),
          description: movement.description,
          paymentMethod: movement.paymentMethod ?? "cash",
          timestamp: movement.createdAt,
          movementId: movement.id,
          sessionId,
        },
        {
          businessName: businessSettings.businessName,
          receiptWidthMm: themeConfig.receiptWidthMm ?? 80,
          operatorName: user?.username,
        },
      );
      toast.success("Comprobante enviado a impresión");
    } catch (error) {
      console.error("Failed to reprint movement voucher:", error);
      toast.error("No se pudo reimprimir el comprobante");
    } finally {
      setPrintingId(null);
    }
  };

  useEffect(() => {
    let cancelled = false;

    async function loadMovements() {
      setIsLoading(true);
      try {
        const data = await PosAPI.getCashMovements(sessionId);
        if (!cancelled) {
          setMovements(
            data.map((movement) => ({
              ...movement,
              createdAt:
                typeof movement.createdAt === "string"
                  ? movement.createdAt
                  : new Date(movement.createdAt).toISOString(),
            })),
          );
        }
      } catch (error) {
        if (!cancelled) {
          toast.error("No se pudieron cargar los movimientos de caja");
          console.error(error);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadMovements();
    return () => {
      cancelled = true;
    };
  }, [sessionId, refreshKey]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Movimientos de Caja</CardTitle>
        <CardDescription>Ingresos y egresos manuales del turno actual</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg">
          <ScrollArea className="h-[300px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[140px]">Fecha</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead className="text-right w-[120px]">Monto</TableHead>
                  <TableHead className="w-[56px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      Cargando movimientos...
                    </TableCell>
                  </TableRow>
                ) : movements.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      No hay movimientos registrados en este turno
                    </TableCell>
                  </TableRow>
                ) : (
                  movements.map((movement) => {
                    const isIncome = isIncomeMovement(movement);
                    return (
                      <TableRow key={movement.id}>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(movement.createdAt).toLocaleString("es-AR")}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {isIncome ? (
                              <TrendingUp className="size-4 text-green-600" />
                            ) : (
                              <TrendingDown className="size-4 text-red-600" />
                            )}
                            {movement.description}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant={isIncome ? "default" : "destructive"}>
                            {isIncome ? "+" : "-"}${Math.abs(movement.amount).toFixed(2)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            title="Reimprimir comprobante"
                            disabled={printingId === movement.id}
                            onClick={() => void handleReprint(movement)}
                          >
                            <Printer className="size-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>
        {!isLoading && movements.length === 0 && (
          <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
            <DollarSign className="size-3" />
            Los ingresos y egresos manuales impactan el saldo esperado al cerrar caja.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
