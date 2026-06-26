import { useCallback, useEffect, useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
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
import { Label } from "../ui/label";
import { Calendar } from "../ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "../ui/pagination";
import {
  ClipboardList,
  Search,
  Calendar as CalendarIcon,
  ChevronRight,
  User,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  PosAPI,
  type CashClosingDetail,
  type CashClosingStatus,
  type CashClosingSummary,
} from "../../../lib/pos-api";
import { CashViewAdvanced } from "../cash/CashViewAdvanced";
import { ClosingDetailModal } from "./ClosingDetailModal";
import { CASH_SESSION_CLOSED_EVENT } from "../../../lib/cash-session";
import { useAuth } from "../../../lib/auth-context";

const PAGE_SIZE = 10;

export function AuditView() {
  const { isAdmin } = useAuth();
  const showLiveCash = isAdmin;
  const [cashAuditTab, setCashAuditTab] = useState(showLiveCash ? "cash" : "history");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<string>("all");
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [page, setPage] = useState(1);
  const [closings, setClosings] = useState<CashClosingSummary[]>([]);
  const [cashiers, setCashiers] = useState<Array<{ id: string; username: string }>>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedClosingId, setSelectedClosingId] = useState<string | null>(null);
  const [selectedClosingDetail, setSelectedClosingDetail] = useState<CashClosingDetail | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => window.clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, selectedUser, dateRange]);

  const loadClosings = useCallback(async (pageOverride?: number) => {
    const activePage = pageOverride ?? page;
    setIsLoading(true);
    setError(null);

    try {
      const response = await PosAPI.getCashClosings({
        page: activePage,
        pageSize: PAGE_SIZE,
        search: debouncedSearch || undefined,
        userId: selectedUser,
        dateFrom: dateRange.from ? format(dateRange.from, "yyyy-MM-dd") : undefined,
        dateTo: dateRange.to ? format(dateRange.to, "yyyy-MM-dd") : undefined,
      });

      setClosings(response.items);
      setCashiers(response.cashiers.map((cashier) => ({ id: cashier.id, username: cashier.username })));
      setTotal(response.total);
      setTotalPages(response.totalPages);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar los cierres");
      setClosings([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setIsLoading(false);
    }
  }, [page, debouncedSearch, selectedUser, dateRange]);

  useEffect(() => {
    void loadClosings();
  }, [loadClosings]);

  useEffect(() => {
    const handleCashSessionClosed = () => {
      setPage(1);
      void loadClosings(1);
    };

    window.addEventListener(CASH_SESSION_CLOSED_EVENT, handleCashSessionClosed);
    return () => window.removeEventListener(CASH_SESSION_CLOSED_EVENT, handleCashSessionClosed);
  }, [loadClosings]);

  const handleCashAuditTabChange = (value: string) => {
    setCashAuditTab(value);
    if (value === "history") {
      setPage(1);
      void loadClosings(1);
    }
  };

  const getStatusBadge = (status: CashClosingStatus, difference: number) => {
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

  const handleViewDetails = async (closing: CashClosingSummary) => {
    setSelectedClosingId(closing.id);
    setDetailOpen(true);
    setIsDetailLoading(true);
    setSelectedClosingDetail(null);

    try {
      const detail = await PosAPI.getCashClosingDetail(closing.id);
      setSelectedClosingDetail(detail);
    } catch (detailError) {
      setError(detailError instanceof Error ? detailError.message : "No se pudo cargar el detalle");
      setDetailOpen(false);
    } finally {
      setIsDetailLoading(false);
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedUser("all");
    setDateRange({});
    setPage(1);
  };

  const hasActiveFilters = Boolean(searchTerm || selectedUser !== "all" || dateRange.from);

  return (
    <>
      <div className="flex flex-col h-full min-h-0">
        <div className="p-6 border-b bg-background shrink-0">
          <div className="flex items-center gap-3">
            <ClipboardList className="size-6" />
            <div>
              <h1 className="text-2xl font-semibold">Auditoría</h1>
              <p className="text-sm text-muted-foreground">
                {showLiveCash
                  ? "Monitoreo de caja activa e historial de cierres"
                  : "Historial de cierres de caja para control y supervisión"}
              </p>
            </div>
          </div>
        </div>

        <Tabs value={cashAuditTab} onValueChange={handleCashAuditTabChange} className="flex-1 flex flex-col min-h-0">
          <div className="px-6 pt-4 shrink-0">
            <TabsList>
              {showLiveCash && <TabsTrigger value="cash">Caja Activa</TabsTrigger>}
              <TabsTrigger value="history">Historial de Cierres</TabsTrigger>
            </TabsList>
          </div>

          {showLiveCash && (
          <TabsContent
            value="cash"
            className="flex-1 min-h-0 overflow-hidden m-0 data-[state=active]:flex data-[state=active]:flex-col"
          >
            <CashViewAdvanced />
          </TabsContent>
          )}

          <TabsContent value="history" className="flex-1 min-h-0 overflow-auto p-6 m-0">
            <div className="max-w-7xl mx-auto space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Filtros</CardTitle>
                  <CardDescription>Busca y filtra los cierres de caja</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

                    <div>
                      <Label>Filtrar por Cajero</Label>
                      <Select value={selectedUser} onValueChange={setSelectedUser}>
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos los cajeros</SelectItem>
                          {cashiers.map((cashier) => (
                            <SelectItem key={cashier.id} value={cashier.id}>
                              {cashier.username}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

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

                  {hasActiveFilters && (
                    <div className="mt-4 flex justify-end">
                      <Button variant="ghost" size="sm" onClick={clearFilters}>
                        Limpiar Filtros
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
                  <div>
                    <CardTitle>Historial de Cierres de Caja</CardTitle>
                    <CardDescription>
                      {isLoading ? "Cargando cierres..." : `${total} cierre(s) encontrado(s)`}
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isLoading}
                    onClick={() => {
                      setPage(1);
                      void loadClosings(1);
                    }}
                  >
                    {isLoading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      "Actualizar"
                    )}
                  </Button>
                </CardHeader>
                <CardContent>
                  {error && (
                    <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {error}
                    </div>
                  )}

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
                        {isLoading ? (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                              <Loader2 className="size-5 animate-spin inline-block mr-2" />
                              Cargando historial...
                            </TableCell>
                          </TableRow>
                        ) : closings.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                              {hasActiveFilters
                                ? "No se encontraron cierres de caja con los filtros aplicados"
                                : "No hay cierres de caja registrados. Cerrá la caja desde el Mostrador para que aparezcan aquí."}
                            </TableCell>
                          </TableRow>
                        ) : (
                          closings.map((closing) => (
                            <TableRow
                              key={closing.id}
                              className="cursor-pointer hover:bg-muted/50"
                              onClick={() => void handleViewDetails(closing)}
                            >
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <CalendarIcon className="size-4 text-muted-foreground" />
                                  <div>
                                    <div className="font-medium">
                                      {format(new Date(closing.date), "dd/MM/yyyy", { locale: es })}
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
                                className={`text-right font-bold ${getDifferenceColor(closing.difference)}`}
                              >
                                {closing.difference > 0 ? "+" : ""}
                                ${closing.difference.toFixed(2)}
                              </TableCell>
                              <TableCell>
                                {getStatusBadge(closing.status, closing.difference)}
                              </TableCell>
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

                  {totalPages > 1 && (
                    <div className="mt-4 flex items-center justify-between gap-4">
                      <p className="text-sm text-muted-foreground">
                        Página {page} de {totalPages}
                      </p>
                      <Pagination>
                        <PaginationContent>
                          <PaginationItem>
                            <PaginationPrevious
                              href="#"
                              onClick={(event) => {
                                event.preventDefault();
                                if (page > 1) setPage(page - 1);
                              }}
                              className={page <= 1 ? "pointer-events-none opacity-50" : ""}
                            />
                          </PaginationItem>
                          {Array.from({ length: totalPages }, (_, index) => index + 1)
                            .filter(
                              (pageNumber) =>
                                pageNumber === 1 ||
                                pageNumber === totalPages ||
                                Math.abs(pageNumber - page) <= 1,
                            )
                            .map((pageNumber, index, visiblePages) => {
                              const previous = visiblePages[index - 1];
                              const showEllipsis = previous != null && pageNumber - previous > 1;

                              return (
                                <span key={pageNumber} className="flex items-center">
                                  {showEllipsis && (
                                    <PaginationItem>
                                      <span className="px-2 text-muted-foreground">...</span>
                                    </PaginationItem>
                                  )}
                                  <PaginationItem>
                                    <PaginationLink
                                      href="#"
                                      isActive={pageNumber === page}
                                      onClick={(event) => {
                                        event.preventDefault();
                                        setPage(pageNumber);
                                      }}
                                    >
                                      {pageNumber}
                                    </PaginationLink>
                                  </PaginationItem>
                                </span>
                              );
                            })}
                          <PaginationItem>
                            <PaginationNext
                              href="#"
                              onClick={(event) => {
                                event.preventDefault();
                                if (page < totalPages) setPage(page + 1);
                              }}
                              className={page >= totalPages ? "pointer-events-none opacity-50" : ""}
                            />
                          </PaginationItem>
                        </PaginationContent>
                      </Pagination>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <ClosingDetailModal
        closing={selectedClosingDetail}
        closingId={selectedClosingId}
        isLoading={isDetailLoading}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </>
  );
}
