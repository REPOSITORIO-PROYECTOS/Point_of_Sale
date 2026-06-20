import { Badge } from "../ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { ScrollArea } from "../ui/scroll-area";
import { FileText } from "lucide-react";

export function CreditNotesPanel() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="size-5 text-purple-600" />
          Notas de Crédito Activas
        </CardTitle>
        <CardDescription>
          Pendiente de API en backend — no hay datos mock
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[200px]">
          <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
            <FileText className="size-10 mb-3 opacity-40" />
            <p className="font-medium">Sin notas de crédito</p>
            <p className="text-sm mt-1">
              Este módulo requiere endpoints de devoluciones/notas de crédito en el backend.
            </p>
            <Badge variant="outline" className="mt-4">
              Próximamente
            </Badge>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
