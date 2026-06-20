import { useEffect, useState } from "react";
import { Badge } from "../ui/badge";
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
import { DollarSign, TrendingDown, TrendingUp } from "lucide-react";
import { PosAPI } from "../../../lib/pos-api";
import type { CashMovementRecord } from "../../../lib/pos-domain-types";
import { toast } from "sonner";

export function CashMovementsTable() {
  const [movements, setMovements] = useState<CashMovementRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadMovements() {
      try {
        const data = await PosAPI.getCashMovements();
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
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Movimientos de Caja</CardTitle>
        <CardDescription>Ingresos y egresos manuales registrados en la API</CardDescription>
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                      Cargando movimientos...
                    </TableCell>
                  </TableRow>
                ) : movements.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                      No hay movimientos registrados
                    </TableCell>
                  </TableRow>
                ) : (
                  movements.map((movement) => {
                    const isIncome = movement.amount >= 0;
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
            Las ventas del POS se reflejan en la sesión de caja, no como movimiento manual.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
