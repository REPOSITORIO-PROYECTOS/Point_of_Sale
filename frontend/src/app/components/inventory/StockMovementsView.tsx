import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Badge } from "../ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
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
import { Textarea } from "../ui/textarea";
import {
  ArrowDownToLine,
  ArrowRightLeft,
  ArrowUpFromLine,
  Plus,
  Search,
  Trash2,
  Truck,
} from "lucide-react";
import { toast } from "sonner";
import { PosAPI, type StockMovementRecord, type StockMovementType } from "../../../lib/pos-api";
import type { Product } from "../../../lib/wails-bridge";

const STOCK_DESTINATIONS_KEY = "pos.stock.destinations";

type DraftLine = {
  product: Product;
  quantity: number;
};

const movementTypeLabels: Record<StockMovementType, string> = {
  in: "Ingreso",
  out: "Egreso",
  transfer: "Transferencia",
};

const movementTypeBadgeVariant: Record<
  StockMovementType,
  "default" | "secondary" | "destructive" | "outline"
> = {
  in: "default",
  out: "destructive",
  transfer: "secondary",
};

function readDestinations(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STOCK_DESTINATIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function writeDestinations(destinations: string[]) {
  localStorage.setItem(STOCK_DESTINATIONS_KEY, JSON.stringify(destinations));
}

export function StockMovementsView() {
  const [movementType, setMovementType] = useState<StockMovementType>("in");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [lineQuantity, setLineQuantity] = useState("1");
  const [draftLines, setDraftLines] = useState<DraftLine[]>([]);
  const [destinationLocal, setDestinationLocal] = useState("");
  const [newDestination, setNewDestination] = useState("");
  const [destinations, setDestinations] = useState<string[]>(() => readDestinations());
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [history, setHistory] = useState<StockMovementRecord[]>([]);
  const [historyFilter, setHistoryFilter] = useState<StockMovementType | "all">("all");
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [currentLocalName, setCurrentLocalName] = useState<string>("Este local");

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const data = await PosAPI.getStockMovements({
        type: historyFilter === "all" ? undefined : historyFilter,
        limit: 100,
      });
      setHistory(data);
    } catch (error) {
      console.error("Failed to load stock movements:", error);
      toast.error("Error al cargar movimientos de stock");
    } finally {
      setLoadingHistory(false);
    }
  }, [historyFilter]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    PosAPI.getBusinessSettings()
      .then((settings) => {
        if (settings.businessName?.trim()) {
          setCurrentLocalName(settings.businessName.trim());
        }
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const query = searchTerm.trim();
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    const timeout = window.setTimeout(async () => {
      setSearching(true);
      try {
        const results = await PosAPI.searchProducts({ q: query, limit: 12 });
        setSearchResults(results);
      } catch (error) {
        console.error("Product search failed:", error);
      } finally {
        setSearching(false);
      }
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [searchTerm]);

  const resetDraft = () => {
    setDraftLines([]);
    setSelectedProduct(null);
    setLineQuantity("1");
    setSearchTerm("");
    setSearchResults([]);
    setNotes("");
    if (movementType !== "transfer") {
      setDestinationLocal("");
    }
  };

  const handleAddLine = () => {
    if (!selectedProduct) {
      toast.error("Seleccioná un producto");
      return;
    }

    const quantity = parseInt(lineQuantity, 10);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      toast.error("Ingresá una cantidad válida");
      return;
    }

    setDraftLines((prev) => {
      const existing = prev.find((line) => line.product.id === selectedProduct.id);
      if (existing) {
        return prev.map((line) =>
          line.product.id === selectedProduct.id
            ? { ...line, quantity: line.quantity + quantity }
            : line,
        );
      }
      return [...prev, { product: selectedProduct, quantity }];
    });

    setSelectedProduct(null);
    setLineQuantity("1");
    setSearchTerm("");
    setSearchResults([]);
  };

  const handleRemoveLine = (productId: string) => {
    setDraftLines((prev) => prev.filter((line) => line.product.id !== productId));
  };

  const handleAddDestination = () => {
    const value = newDestination.trim();
    if (!value) return;
    const next = [...new Set([...destinations, value])].sort((a, b) =>
      a.localeCompare(b, "es"),
    );
    setDestinations(next);
    writeDestinations(next);
    setDestinationLocal(value);
    setNewDestination("");
  };

  const handleSubmit = async () => {
    if (draftLines.length === 0) {
      toast.error("Agregá al menos un producto al movimiento");
      return;
    }

    const resolvedDestination = destinationLocal.trim() || newDestination.trim();

    if (movementType === "transfer" && !resolvedDestination) {
      toast.error("Seleccioná o ingresá el local de destino");
      return;
    }

    if (movementType === "transfer" && resolvedDestination && !destinations.includes(resolvedDestination)) {
      const next = [...new Set([...destinations, resolvedDestination])].sort((a, b) =>
        a.localeCompare(b, "es"),
      );
      setDestinations(next);
      writeDestinations(next);
    }

    setSubmitting(true);
    try {
      await PosAPI.createStockMovement({
        type: movementType,
        items: draftLines.map((line) => ({
          productId: line.product.id,
          quantity: line.quantity,
        })),
        destinationLocal: movementType === "transfer" ? resolvedDestination : undefined,
        notes: notes.trim() || undefined,
      });

      toast.success(
        movementType === "in"
          ? "Ingreso de mercadería registrado"
          : movementType === "out"
            ? "Egreso de stock registrado"
            : `Transferencia registrada hacia ${resolvedDestination}`,
      );
      resetDraft();
      await loadHistory();
    } catch (error) {
      console.error("Failed to create stock movement:", error);
      toast.error(error instanceof Error ? error.message : "Error al registrar movimiento");
    } finally {
      setSubmitting(false);
    }
  };

  const totalUnits = useMemo(
    () => draftLines.reduce((sum, line) => sum + line.quantity, 0),
    [draftLines],
  );

  return (
    <div className="flex-1 min-h-0 overflow-auto p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="size-5" />
                Movimientos de stock
              </CardTitle>
              <CardDescription>
                Registrá ingresos, egresos o envíos de mercadería a otro local desde{" "}
                <strong>{currentLocalName}</strong>.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-3 gap-2">
                <Button
                  type="button"
                  variant={movementType === "in" ? "default" : "outline"}
                  className="gap-2"
                  onClick={() => {
                    setMovementType("in");
                    setDestinationLocal("");
                  }}
                >
                  <ArrowDownToLine className="size-4" />
                  Ingreso
                </Button>
                <Button
                  type="button"
                  variant={movementType === "out" ? "default" : "outline"}
                  className="gap-2"
                  onClick={() => {
                    setMovementType("out");
                    setDestinationLocal("");
                  }}
                >
                  <ArrowUpFromLine className="size-4" />
                  Egreso
                </Button>
                <Button
                  type="button"
                  variant={movementType === "transfer" ? "default" : "outline"}
                  className="gap-2"
                  onClick={() => setMovementType("transfer")}
                >
                  <ArrowRightLeft className="size-4" />
                  A otro local
                </Button>
              </div>

              {movementType === "transfer" && (
                <div className="space-y-3 rounded-lg border p-4 bg-muted/30">
                  <Label>Local de destino</Label>
                  <Select value={destinationLocal} onValueChange={setDestinationLocal}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar local destino" />
                    </SelectTrigger>
                    <SelectContent>
                      {destinations.map((destination) => (
                        <SelectItem key={destination} value={destination}>
                          {destination}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Agregar nuevo local (ej. Sucursal Norte)"
                      value={newDestination}
                      onChange={(event) => setNewDestination(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          handleAddDestination();
                        }
                      }}
                    />
                    <Button type="button" variant="outline" onClick={handleAddDestination}>
                      Agregar
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    La transferencia descuenta stock acá y queda registrado el envío al local
                    destino. El ingreso en el otro local se hace desde su propia instalación.
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label>Buscar producto</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    placeholder="Nombre, código o código de barra..."
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    className="pl-10"
                  />
                </div>
                {searching && (
                  <p className="text-xs text-muted-foreground">Buscando productos...</p>
                )}
                {searchResults.length > 0 && (
                  <div className="border rounded-lg divide-y max-h-48 overflow-auto">
                    {searchResults.map((product) => (
                      <button
                        key={product.id}
                        type="button"
                        className={`w-full text-left px-3 py-2 hover:bg-muted transition-colors ${
                          selectedProduct?.id === product.id ? "bg-muted" : ""
                        }`}
                        onClick={() => setSelectedProduct(product)}
                      >
                        <div className="font-medium">{product.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {product.id}
                          {product.stock != null ? ` · Stock: ${product.stock}` : " · Sin stock"}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {selectedProduct && (
                <div className="flex items-end gap-3 rounded-lg border p-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{selectedProduct.name}</p>
                    <p className="text-xs text-muted-foreground">{selectedProduct.id}</p>
                  </div>
                  <div className="w-24">
                    <Label htmlFor="line-quantity" className="text-xs">
                      Cantidad
                    </Label>
                    <Input
                      id="line-quantity"
                      type="number"
                      min={1}
                      value={lineQuantity}
                      onChange={(event) => setLineQuantity(event.target.value)}
                    />
                  </div>
                  <Button type="button" onClick={handleAddLine} className="gap-2">
                    <Plus className="size-4" />
                    Agregar
                  </Button>
                </div>
              )}

              {draftLines.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Producto</TableHead>
                        <TableHead className="w-[100px]">Cant.</TableHead>
                        <TableHead className="w-[60px]" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {draftLines.map((line) => (
                        <TableRow key={line.product.id}>
                          <TableCell>
                            <div className="font-medium">{line.product.name}</div>
                            <div className="text-xs text-muted-foreground">{line.product.id}</div>
                          </TableCell>
                          <TableCell>{line.quantity}</TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveLine(line.product.id)}
                            >
                              <Trash2 className="size-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="px-3 py-2 text-sm text-muted-foreground border-t">
                    Total: <strong>{totalUnits}</strong> unidades en{" "}
                    <strong>{draftLines.length}</strong> producto(s)
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="movement-notes">Observaciones (opcional)</Label>
                <Textarea
                  id="movement-notes"
                  placeholder={
                    movementType === "in"
                      ? "Ej. Factura proveedor, remito, motivo del ingreso..."
                      : movementType === "out"
                        ? "Ej. Merma, vencimiento, uso interno..."
                        : "Ej. Remito interno, responsable del traslado..."
                  }
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={resetDraft} disabled={submitting}>
                  Limpiar
                </Button>
                <Button type="button" onClick={handleSubmit} disabled={submitting}>
                  {submitting ? "Registrando..." : "Confirmar movimiento"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle>Historial</CardTitle>
                  <CardDescription>Últimos movimientos registrados</CardDescription>
                </div>
                <Select
                  value={historyFilter}
                  onValueChange={(value) => setHistoryFilter(value as StockMovementType | "all")}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="in">Ingresos</SelectItem>
                    <SelectItem value="out">Egresos</SelectItem>
                    <SelectItem value="transfer">Transferencias</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {loadingHistory ? (
                <p className="py-8 text-center text-muted-foreground">Cargando historial...</p>
              ) : history.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">
                  Todavía no hay movimientos registrados.
                </p>
              ) : (
                <div className="border rounded-lg max-h-[640px] overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Producto</TableHead>
                        <TableHead className="w-[70px]">Cant.</TableHead>
                        <TableHead>Stock</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {history.map((movement) => (
                        <TableRow key={movement.id}>
                          <TableCell className="text-xs whitespace-nowrap">
                            {new Date(movement.createdAt).toLocaleString("es-AR", {
                              dateStyle: "short",
                              timeStyle: "short",
                            })}
                          </TableCell>
                          <TableCell>
                            <Badge variant={movementTypeBadgeVariant[movement.type]}>
                              {movementTypeLabels[movement.type]}
                            </Badge>
                            {movement.destinationLocal && (
                              <div className="text-xs text-muted-foreground mt-1">
                                → {movement.destinationLocal}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{movement.productName}</div>
                            <div className="text-xs text-muted-foreground">{movement.productId}</div>
                            {movement.notes && (
                              <div className="text-xs text-muted-foreground mt-1">{movement.notes}</div>
                            )}
                          </TableCell>
                          <TableCell>{movement.quantity}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {movement.stockBefore != null && movement.stockAfter != null
                              ? `${movement.stockBefore} → ${movement.stockAfter}`
                              : "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
