import { useEffect, useState } from "react";
import { Button } from "../ui/button";
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
import { RotateCcw } from "lucide-react";
import { PosAPI } from "../../../lib/pos-api";
import type { SaleHistoryItem } from "../../../lib/pos-domain-types";
import { CASH_DATA_UPDATED_EVENT } from "../../../lib/cash-session";
import { ReturnModal } from "./ReturnModal";
import { toast } from "sonner";

type SalesHistoryTableProps = {
  sessionId?: string;
  refreshKey?: number;
};

export function SalesHistoryTable({ sessionId, refreshKey = 0 }: SalesHistoryTableProps) {
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<SaleHistoryItem | null>(null);
  const [transactions, setTransactions] = useState<SaleHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadSales() {
      setIsLoading(true);
      try {
        const data = await PosAPI.getSales(sessionId);
        if (!cancelled) {
          setTransactions(data);
        }
      } catch (error) {
        if (!cancelled) {
          toast.error("No se pudo cargar el historial de ventas");
          console.error(error);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadSales();
    return () => {
      cancelled = true;
    };
  }, [sessionId, refreshKey]);

  useEffect(() => {
    const handleCashDataUpdated = () => {
      void (async () => {
        try {
          const data = await PosAPI.getSales(sessionId);
          setTransactions(data);
        } catch (error) {
          console.error("Failed to refresh sales history:", error);
        }
      })();
    };

    window.addEventListener(CASH_DATA_UPDATED_EVENT, handleCashDataUpdated);
    return () => window.removeEventListener(CASH_DATA_UPDATED_EVENT, handleCashDataUpdated);
  }, [sessionId]);

  const getPaymentMethodLabel = (transaction: SaleHistoryItem) => {
    const payments = transaction.payments;
    if (!payments?.length) {
      return "—";
    }
    if (payments.length > 1) {
      return "Mixto";
    }

    const labels: Record<string, string> = {
      cash: "Efectivo",
      card: "Tarjeta",
      transfer: "Transferencia",
      qr: "QR",
    };
    return labels[payments[0].type] ?? payments[0].type;
  };

  const handleReturnClick = (transaction: SaleHistoryItem) => {
    setSelectedTransaction(transaction);
    setReturnModalOpen(true);
  };

  const handleSaveReturn = (returnData: {
    items: unknown[];
    refundType: "cash" | "credit_note";
    amount: number;
  }) => {
    if (returnData.refundType === "cash") {
      toast.success(
        `Devolución procesada: $${returnData.amount.toFixed(2)} devueltos en efectivo`,
      );
    } else {
      toast.success(`Nota de Crédito emitida por $${returnData.amount.toFixed(2)}`);
    }
  };

  const emptyMessage = sessionId
    ? "No hay ventas registradas en este turno"
    : "No hay ventas registradas todavía";

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Historial de Ventas</CardTitle>
          <CardDescription>
            {sessionId
              ? "Ventas del turno de caja actual"
              : "Ventas persistidas en la base de datos"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Ticket</TableHead>
                    <TableHead className="w-[80px]">Hora</TableHead>
                    <TableHead>Productos</TableHead>
                    <TableHead className="w-[120px]">Método</TableHead>
                    <TableHead className="text-right w-[100px]">Total</TableHead>
                    <TableHead className="w-[140px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        Cargando ventas...
                      </TableCell>
                    </TableRow>
                  ) : transactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        {emptyMessage}
                      </TableCell>
                    </TableRow>
                  ) : (
                    transactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell className="font-mono text-xs">
                          {transaction.id.slice(0, 8)}
                        </TableCell>
                        <TableCell>
                          {new Date(transaction.timestamp).toLocaleTimeString("es-AR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {transaction.items.slice(0, 2).map((item) => (
                              <Badge key={item.id} variant="secondary" className="text-xs">
                                {item.quantity}x {item.name}
                              </Badge>
                            ))}
                            {transaction.items.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{transaction.items.length - 2}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{getPaymentMethodLabel(transaction)}</TableCell>
                        <TableCell className="text-right font-semibold">
                          ${transaction.total.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleReturnClick(transaction)}
                          >
                            <RotateCcw className="size-3 mr-1" />
                            Devolver
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        </CardContent>
      </Card>

      <ReturnModal
        open={returnModalOpen}
        onOpenChange={setReturnModalOpen}
        transaction={selectedTransaction}
        onSave={handleSaveReturn}
      />
    </>
  );
}
