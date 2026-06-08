import { useState, useMemo } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { ScrollArea } from "../ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Label } from "../ui/label";
import { Separator } from "../ui/separator";
import { Calendar } from "../ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import {
  ClipboardList,
  Search,
  Calendar as CalendarIcon,
  ChevronRight,
  DollarSign,
  User,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  CreditCard,
  Smartphone,
  Wallet,
  Eye,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  mockCashClosings,
  mockTransactions,
  mockAuditEvents,
  type CashClosing,
  type Transaction,
  type AuditEvent,
} from "../../../lib/mock-data";
import { CashViewAdvanced } from "../cash/CashViewAdvanced";
import { ClosingDetailModal } from "./ClosingDetailModal";

interface AuditViewProps {
  heldOrdersCount?: number;
  onRequestClearOrders?: () => void;
}

export function AuditView({ heldOrdersCount = 0, onRequestClearOrders }: AuditViewProps = {}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<string>("all");
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [selectedClosing, setSelectedClosing] = useState<CashClosing | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const filteredClosings = useMemo(() => {
    return mockCashClosings.filter((closing) => {
      const matchesSearch =
        searchTerm === "" ||
        closing.user.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesUser = selectedUser === "all" || closing.user === selectedUser;

      const matchesDate =
        !dateRange.from ||
        !dateRange.to ||
        (new Date(closing.date) >= dateRange.from &&
          new Date(closing.date) <= dateRange.to);

      return matchesSearch && matchesUser && matchesDate;
    });
  }, [searchTerm, selectedUser, dateRange]);

  const users = useMemo(() => {
    const uniqueUsers = new Set(mockCashClosings.map((c) => c.user));
    return Array.from(uniqueUsers);
  }, []);

  const getStatusBadge = (status: CashClosing["status"], difference: number) => {
    switch (status) {
      case "perfect":
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle className="size-3 mr-1" />
            Cuadre Perfecto
          </Badge>
        );
      case "surplus":
        return (
          <Badge className="bg-blue-100 text-blue-800 border-blue-200">
            <TrendingUp className="size-3 mr-1" />
            Sobrante +${Math.abs(difference).toFixed(2)}
          </Badge>
        );
      case "shortage":
        return (
          <Badge className="bg-red-100 text-red-800 border-red-200">
            <AlertCircle className="size-3 mr-1" />
            Faltante -${Math.abs(difference).toFixed(2)}
          </Badge>
        );
    }
  };

  const getDifferenceColor = (difference: number) => {
    if (Math.abs(difference) < 0.01) return "text-green-600";
    if (difference > 0) return "text-blue-600";
    return "text-red-600";
  };

  const handleViewDetails = (closing: CashClosing) => {
    setSelectedClosing(closing);
    setDetailOpen(true);
  };

  return (
    <>
      <div className="flex flex-col h-full">
        <div className="p-6 border-b bg-background">
          <div className="flex items-center gap-3">
            <ClipboardList className="size-6" />
            <div>
              <h1 className="text-2xl font-semibold">Auditoría y Caja</h1>
              <p className="text-sm text-muted-foreground">
                Gestión de caja activa e historial de cierres
              </p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="cash" className="flex-1 flex flex-col">
          <div className="px-6 pt-4">
            <TabsList>
              <TabsTrigger value="cash">Caja Activa</TabsTrigger>
              <TabsTrigger value="history">Historial de Cierres</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="cash" className="flex-1 overflow-hidden m-0">
            <CashViewAdvanced heldOrdersCount={heldOrdersCount} onRequestClearOrders={onRequestClearOrders} />
          </TabsContent>

          <TabsContent value="history" className="flex-1 overflow-auto p-6 m-0">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Filtros */}
            <Card>
              <CardHeader>
                <CardTitle>Filtros</CardTitle>
                <CardDescription>Busca y filtra los cierres de caja</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Buscador */}
                  <div>
                    <Label>Buscar Cajero</Label>
                    <div className="relative mt-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder="Nombre del cajero..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  {/* Selector de Usuario */}
                  <div>
                    <Label>Filtrar por Cajero</Label>
                    <Select value={selectedUser} onValueChange={setSelectedUser}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos los cajeros</SelectItem>
                        {users.map((user) => (
                          <SelectItem key={user} value={user}>
                            {user}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Rango de Fechas */}
                  <div>
                    <Label>Rango de Fechas</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full mt-1 justify-start">
                          <CalendarIcon className="size-4 mr-2" />
                          {dateRange.from ? (
                            dateRange.to ? (
                              <>
                                {format(dateRange.from, "dd/MM/yyyy")} -{" "}
                                {format(dateRange.to, "dd/MM/yyyy")}
                              </>
                            ) : (
                              format(dateRange.from, "dd/MM/yyyy")
                            )
                          ) : (
                            <span>Seleccionar rango</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="range"
                          selected={dateRange}
                          onSelect={(range) => setDateRange(range || {})}
                          locale={es}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {(searchTerm || selectedUser !== "all" || dateRange.from) && (
                  <div className="mt-4 flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSearchTerm("");
                        setSelectedUser("all");
                        setDateRange({});
                      }}
                    >
                      Limpiar Filtros
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Tabla de Cierres */}
            <Card>
              <CardHeader>
                <CardTitle>Historial de Cierres de Caja</CardTitle>
                <CardDescription>
                  {filteredClosings.length} cierre(s) encontrado(s)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha y Hora</TableHead>
                        <TableHead>Cajero</TableHead>
                        <TableHead className="text-right">Monto Esperado</TableHead>
                        <TableHead className="text-right">Monto Contado</TableHead>
                        <TableHead className="text-right">Diferencia</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-center">Ventas</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredClosings.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                            No se encontraron cierres de caja con los filtros aplicados
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredClosings.map((closing) => (
                          <TableRow
                            key={closing.id}
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => handleViewDetails(closing)}
                          >
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <CalendarIcon className="size-4 text-muted-foreground" />
                                <div>
                                  <div className="font-medium">
                                    {format(new Date(closing.date), "dd/MM/yyyy", {
                                      locale: es,
                                    })}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    {format(new Date(closing.date), "HH:mm")}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <User className="size-4 text-muted-foreground" />
                                {closing.user}
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              ${closing.expectedAmount.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              ${closing.countedAmount.toFixed(2)}
                            </TableCell>
                            <TableCell
                              className={`text-right font-bold ${getDifferenceColor(
                                closing.difference
                              )}`}
                            >
                              {closing.difference > 0 ? "+" : ""}
                              ${closing.difference.toFixed(2)}
                            </TableCell>
                            <TableCell>{getStatusBadge(closing.status, closing.difference)}</TableCell>
                            <TableCell className="text-center">
                              <div className="text-sm">
                                <div className="font-medium">{closing.transactionsCount}</div>
                                <div className="text-muted-foreground">tickets</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Button variant="ghost" size="icon">
                                <ChevronRight className="size-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Modal de Detalle */}
      {selectedClosing && (
        <ClosingDetailModal
          closing={selectedClosing}
          open={detailOpen}
          onOpenChange={setDetailOpen}
        />
      )}
    </>
  );
}
