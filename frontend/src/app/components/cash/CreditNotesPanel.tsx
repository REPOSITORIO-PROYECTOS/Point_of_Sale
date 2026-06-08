import { Badge } from "../ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { ScrollArea } from "../ui/scroll-area";
import { FileText, User, Calendar, DollarSign } from "lucide-react";
import { mockCreditNotes, type CreditNote } from "../../../lib/mock-data";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export function CreditNotesPanel() {
  const activeCreditNotes = mockCreditNotes.filter((cn) => cn.status === "active");

  const getStatusBadge = (status: CreditNote["status"]) => {
    switch (status) {
      case "active":
        return (
          <Badge className="bg-purple-100 text-purple-700 border-purple-300">
            Activa
          </Badge>
        );
      case "used":
        return <Badge variant="secondary">Utilizada</Badge>;
      case "expired":
        return <Badge variant="destructive">Vencida</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="size-5 text-purple-600" />
          Notas de Crédito Activas
        </CardTitle>
        <CardDescription>
          Comprobantes de saldo a favor pendientes de uso
        </CardDescription>
      </CardHeader>
      <CardContent>
        {activeCreditNotes.length > 0 ? (
          <ScrollArea className="h-[300px]">
            <div className="space-y-3">
              {activeCreditNotes.map((creditNote) => (
                <div
                  key={creditNote.id}
                  className="p-4 border rounded-lg bg-purple-50 border-purple-200"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono font-semibold text-purple-900">
                          {creditNote.id}
                        </span>
                        {getStatusBadge(creditNote.status)}
                      </div>
                      {creditNote.customerName && (
                        <div className="flex items-center gap-2 text-sm text-purple-700">
                          <User className="size-3" />
                          {creditNote.customerName}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-purple-700">
                        ${creditNote.balance.toFixed(2)}
                      </p>
                      <p className="text-xs text-purple-600">
                        de ${creditNote.amount.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-purple-600 mb-2">
                    <Calendar className="size-3" />
                    Emitida el{" "}
                    {format(new Date(creditNote.issueDate), "dd/MM/yyyy HH:mm", {
                      locale: es,
                    })}
                  </div>

                  <div className="pt-2 border-t border-purple-300">
                    <p className="text-xs text-purple-700 font-medium mb-1">
                      Productos devueltos:
                    </p>
                    <div className="space-y-1">
                      {creditNote.items.map((item, idx) => (
                        <div
                          key={idx}
                          className="text-xs text-purple-600 flex justify-between"
                        >
                          <span>
                            {item.quantity}x {item.name}
                          </span>
                          <span>${(item.quantity * item.price).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-2 pt-2 border-t border-purple-300">
                    <p className="text-xs text-purple-600">
                      Ticket original: #{creditNote.originalTransactionId}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="size-12 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">
              No hay notas de crédito activas
            </p>
          </div>
        )}

        {activeCreditNotes.length > 0 && (
          <div className="mt-4 p-3 bg-purple-100 border border-purple-300 rounded-lg">
            <div className="flex items-start gap-2">
              <DollarSign className="size-4 text-purple-700 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-purple-900">
                  Total en Notas de Crédito:
                </p>
                <p className="text-2xl font-bold text-purple-700">
                  $
                  {activeCreditNotes
                    .reduce((sum, cn) => sum + cn.balance, 0)
                    .toFixed(2)}
                </p>
                <p className="text-xs text-purple-600 mt-1">
                  Saldo a favor disponible para los clientes
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
