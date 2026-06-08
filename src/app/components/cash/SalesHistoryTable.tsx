import { useState } from "react";
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
import { mockTransactions, type Transaction } from "../../../lib/mock-data";
import { ReturnModal } from "./ReturnModal";
import { toast } from "sonner";

export function SalesHistoryTable() {
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  const getPaymentMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      cash: "Efectivo",
      card: "Tarjeta",
      transfer: "Transferencia",
      qr: "QR",
      mixed: "Mixto",
    };
    return labels[method] || method;
  };

  const handleReturnClick = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setReturnModalOpen(true);
  };

  const handleSaveReturn = (returnData: {
    items: any[];
    refundType: "cash" | "credit_note";
    amount: number;
  }) => {
    if (returnData.refundType === "cash") {
      toast.success(
        `Devolución procesada: $${returnData.amount.toFixed(2)} devueltos en efectivo`
      );
    } else {
      toast.success(
        `Nota de Crédito emitida por $${returnData.amount.toFixed(2)}`
      );
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Historial de Ventas</CardTitle>
          <CardDescription>
            Tickets del turno actual con opción de gestión de devoluciones
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
                  {mockTransactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell className="font-mono font-medium">
                        #{transaction.id}
                      </TableCell>
                      <TableCell>{transaction.time}</TableCell>
                      <TableCell>
                        <div className="text-sm space-y-1">
                          {transaction.items.map((item, idx) => (
                            <div key={idx} className="text-muted-foreground">
                              {item.quantity}x {item.name}
                            </div>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-normal">
                          {getPaymentMethodLabel(transaction.paymentMethod)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        ${transaction.amount.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleReturnClick(transaction)}
                          className="w-full"
                        >
                          <RotateCcw className="size-4 mr-2" />
                          Devolución
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
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
