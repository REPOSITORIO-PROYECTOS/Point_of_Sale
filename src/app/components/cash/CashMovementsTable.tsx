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
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  RotateCcw,
} from "lucide-react";
import { mockCashMovements, type CashMovement } from "../../../lib/mock-data";

export function CashMovementsTable() {
  const getMovementIcon = (type: CashMovement["type"]) => {
    switch (type) {
      case "sale":
        return <ShoppingCart className="size-4 text-green-600" />;
      case "manual_income":
        return <TrendingUp className="size-4 text-green-600" />;
      case "manual_expense":
        return <TrendingDown className="size-4 text-red-600" />;
      case "return_cash":
        return <RotateCcw className="size-4 text-red-600" />;
      default:
        return <DollarSign className="size-4" />;
    }
  };

  const getMovementLabel = (type: CashMovement["type"]) => {
    switch (type) {
      case "sale":
        return "Venta";
      case "manual_income":
        return "Ingreso Manual";
      case "manual_expense":
        return "Egreso Manual";
      case "return_cash":
        return "Devolución";
      default:
        return type;
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      cash: "Efectivo",
      card: "Tarjeta",
      transfer: "Transferencia",
      qr: "QR",
    };
    return labels[method] || method;
  };

  const isIncome = (type: CashMovement["type"]) => {
    return type === "sale" || type === "manual_income";
  };

  const totalIncome = mockCashMovements
    .filter((m) => isIncome(m.type))
    .reduce((sum, m) => sum + m.amount, 0);

  const totalExpense = mockCashMovements
    .filter((m) => !isIncome(m.type))
    .reduce((sum, m) => sum + m.amount, 0);

  const netBalance = totalIncome - totalExpense;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Movimientos del Turno</CardTitle>
        <CardDescription>
          Registro cronológico de todas las operaciones que afectan la caja
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="p-3 border rounded-lg bg-green-50 border-green-200">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="size-4 text-green-600" />
              <span className="text-sm text-green-900 font-medium">
                Total Ingresos
              </span>
            </div>
            <p className="text-2xl font-bold text-green-700">
              ${totalIncome.toFixed(2)}
            </p>
          </div>

          <div className="p-3 border rounded-lg bg-red-50 border-red-200">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="size-4 text-red-600" />
              <span className="text-sm text-red-900 font-medium">
                Total Egresos
              </span>
            </div>
            <p className="text-2xl font-bold text-red-700">
              ${totalExpense.toFixed(2)}
            </p>
          </div>

          <div className="p-3 border rounded-lg bg-blue-50 border-blue-200">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="size-4 text-blue-600" />
              <span className="text-sm text-blue-900 font-medium">
                Balance Neto
              </span>
            </div>
            <p className="text-2xl font-bold text-blue-700">
              ${netBalance.toFixed(2)}
            </p>
          </div>
        </div>

        <div className="border rounded-lg">
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Hora</TableHead>
                  <TableHead className="w-[140px]">Tipo</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead className="w-[120px]">Método</TableHead>
                  <TableHead className="text-right w-[120px]">Monto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockCashMovements.map((movement) => (
                  <TableRow key={movement.id}>
                    <TableCell className="font-medium">
                      {movement.time}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getMovementIcon(movement.type)}
                        <span className="text-sm">
                          {getMovementLabel(movement.type)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{movement.description}</div>
                      <div className="text-xs text-muted-foreground">
                        {movement.user}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-normal">
                        {getPaymentMethodLabel(movement.paymentMethod)}
                      </Badge>
                    </TableCell>
                    <TableCell
                      className={`text-right font-semibold ${
                        isIncome(movement.type)
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {isIncome(movement.type) ? "+" : "-"}$
                      {movement.amount.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}
