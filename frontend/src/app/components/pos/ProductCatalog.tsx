import { useState, useEffect, useRef, type KeyboardEvent } from "react";
import { Product } from "../../../lib/wails-bridge";
import { PosAPI } from "../../../lib/pos-api";
import { getProductCategories } from "../../../lib/product-categories";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Card } from "../ui/card";
import { Search, Plus, Weight, Lock, Unlock, ArrowUpDown, Loader2 } from "lucide-react";
import { isCashSessionOpen } from "../../../lib/cash-session";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Label } from "../ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";

const CATALOG_RESULT_LIMIT = 80;
const SEARCH_DEBOUNCE_MS = 250;

interface ProductCatalogProps {
  onAddToCart: (product: Product, weight?: number) => void;
  cashSession?: unknown;
  onOpenCash?: () => void;
  onCloseCash?: () => void;
  onOpenMovements?: () => void;
}

export function ProductCatalog({
  onAddToCart,
  cashSession,
  onOpenCash,
  onCloseCash,
  onOpenMovements,
}: ProductCatalogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [suppliers, setSuppliers] = useState<string[]>([]);
  const [displayedProducts, setDisplayedProducts] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [weightDialogOpen, setWeightDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [weight, setWeight] = useState("");
  const [amount, setAmount] = useState("");
  const [weightInputMode, setWeightInputMode] = useState<"weight" | "amount">("weight");
  const barcodeLookupRef = useRef(false);
  const searchRequestRef = useRef(0);

  useEffect(() => {
    void PosAPI.getProductCategories()
      .then(setCategories)
      .catch((error) => console.error("Failed to load categories:", error));
    void PosAPI.getProductSuppliers()
      .then(setSuppliers)
      .catch((error) => console.error("Failed to load suppliers:", error));
  }, []);

  useEffect(() => {
    const trimmed = searchQuery.trim();
    const hasQuery = trimmed.length >= 2;
    const hasCategory = Boolean(selectedCategory);
    const hasSupplier = Boolean(selectedSupplier);

    if (!hasQuery && !hasCategory && !hasSupplier) {
      setDisplayedProducts([]);
      setIsSearching(false);
      return;
    }

    const requestId = ++searchRequestRef.current;
    setIsSearching(true);

    const timer = window.setTimeout(() => {
      void PosAPI.searchProducts({
        q: hasQuery ? trimmed : undefined,
        category: hasCategory ? selectedCategory ?? undefined : undefined,
        supplier: hasSupplier ? selectedSupplier ?? undefined : undefined,
        limit: CATALOG_RESULT_LIMIT,
      })
        .then((results) => {
          if (searchRequestRef.current !== requestId) return;
          setDisplayedProducts(results);
        })
        .catch((error) => {
          if (searchRequestRef.current !== requestId) return;
          console.error("Product search failed:", error);
          setDisplayedProducts([]);
        })
        .finally(() => {
          if (searchRequestRef.current !== requestId) return;
          setIsSearching(false);
        });
    }, hasQuery ? SEARCH_DEBOUNCE_MS : 0);

    return () => window.clearTimeout(timer);
  }, [searchQuery, selectedCategory, selectedSupplier]);

  const handleProductClick = (product: Product) => {
    if (product.unit === "kilogramos" || product.unit === "gramos") {
      setSelectedProduct(product);
      setWeightDialogOpen(true);
    } else {
      onAddToCart(product);
    }
  };

  const resetWeightDialog = () => {
    setWeight("");
    setAmount("");
    setWeightInputMode("weight");
    setSelectedProduct(null);
  };

  const resolveWeightKg = (): number | null => {
    if (!selectedProduct) return null;

    if (weightInputMode === "weight") {
      const parsedWeight = parseFloat(weight);
      return parsedWeight > 0 ? parsedWeight : null;
    }

    const parsedAmount = parseFloat(amount);
    if (parsedAmount <= 0 || selectedProduct.price <= 0) return null;
    return parsedAmount / selectedProduct.price;
  };

  const handleWeightConfirm = () => {
    const resolvedWeight = resolveWeightKg();
    if (selectedProduct && resolvedWeight) {
      onAddToCart(selectedProduct, resolvedWeight);
      setWeightDialogOpen(false);
      resetWeightDialog();
    }
  };

  const quickWeights = [0.25, 0.5, 0.75, 1, 1.5, 2];

  const handleSearchKeyDown = async (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter" || barcodeLookupRef.current) return;

    const trimmed = searchQuery.trim();
    if (!trimmed) return;

    barcodeLookupRef.current = true;
    try {
      const match = await PosAPI.getProductByBarcode(trimmed);
      event.preventDefault();
      setSearchQuery("");
      setSelectedCategory(null);
      setSelectedSupplier(null);
      handleProductClick(match);
    } catch {
      // Sin coincidencia por código: la búsqueda por texto sigue en el listado.
    } finally {
      barcodeLookupRef.current = false;
    }
  };

  const isOpen = isCashSessionOpen(cashSession);
  const trimmedQuery = searchQuery.trim();
  const showCatalogGrid =
    trimmedQuery.length >= 2 || Boolean(selectedCategory) || Boolean(selectedSupplier);

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Buscar por nombre, proveedor o escanear código de barras..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            autoFocus
            className="pl-10 h-14 text-lg"
          />
        </div>

        <div className="flex gap-2">
          {isOpen ? (
            <>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 gap-2"
                onClick={onCloseCash}
              >
                <Lock className="size-4" />
                Cerrar Caja
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 gap-2"
                onClick={onOpenMovements}
              >
                <ArrowUpDown className="size-4" />
                Movimientos
              </Button>
            </>
          ) : (
            <Button
              variant="default"
              size="sm"
              className="w-full gap-2"
              onClick={onOpenCash}
            >
              <Unlock className="size-4" />
              Abrir Caja
            </Button>
          )}
        </div>

        <div
          className={`p-2 rounded-lg text-sm text-center ${
            isOpen
              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
              : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100"
          }`}
        >
          {isOpen ? (
            <div className="flex items-center justify-center gap-2">
              <div className="size-2 rounded-full bg-green-600 animate-pulse" />
              Caja Abierta
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2">
              <div className="size-2 rounded-full bg-red-600" />
              Caja Cerrada
            </div>
          )}
        </div>
      </div>

      {categories.length > 0 && (
        <div className="px-4 py-3 border-b flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant={selectedCategory === null ? "default" : "outline"}
            onClick={() => setSelectedCategory(null)}
          >
            Todas las categorías
          </Button>
          {categories.map((category) => (
            <Button
              key={category}
              type="button"
              size="sm"
              variant={selectedCategory === category ? "default" : "outline"}
              onClick={() =>
                setSelectedCategory((current) => (current === category ? null : category))
              }
            >
              {category}
            </Button>
          ))}
        </div>
      )}

      {suppliers.length > 0 && (
        <div className="px-4 py-3 border-b flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant={selectedSupplier === null ? "default" : "outline"}
            onClick={() => setSelectedSupplier(null)}
          >
            Todos los proveedores
          </Button>
          {suppliers.map((supplier) => (
            <Button
              key={supplier}
              type="button"
              size="sm"
              variant={selectedSupplier === supplier ? "default" : "outline"}
              onClick={() =>
                setSelectedSupplier((current) => (current === supplier ? null : supplier))
              }
            >
              {supplier}
            </Button>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-auto p-4">
        {!showCatalogGrid ? (
          <div className="text-center py-16 text-muted-foreground space-y-2">
            <p className="text-lg font-medium">Buscá o escaneá un producto</p>
            <p className="text-sm">
              Escribí al menos 2 letras o elegí una categoría o proveedor para ver el catálogo.
            </p>
            <p className="text-sm">Con lector de barras, escaneá y presioná Enter.</p>
          </div>
        ) : isSearching ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
            <Loader2 className="size-5 animate-spin" />
            Buscando productos...
          </div>
        ) : displayedProducts.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No se encontraron productos
          </div>
        ) : (
          <>
            {displayedProducts.length >= CATALOG_RESULT_LIMIT && (
              <p className="text-sm text-muted-foreground mb-4 text-center">
                Mostrando los primeros {CATALOG_RESULT_LIMIT} resultados. Acotá la búsqueda para
                encontrar más rápido.
              </p>
            )}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {displayedProducts.map((product) => (
                <Card
                  key={product.id}
                  className="p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => handleProductClick(product)}
                >
                  <div className="flex flex-col gap-2">
                    <div className="flex-1">
                      <h4 className="font-medium truncate">{product.name}</h4>
                      {getProductCategories(product).length > 0 && (
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          {getProductCategories(product).join(", ")}
                        </p>
                      )}
                      {product.supplier && (
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          {product.supplier}
                        </p>
                      )}
                      {(product.unit === "kilogramos" || product.unit === "gramos") && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                          <Weight className="size-3" />
                          Por peso
                        </div>
                      )}
                      <p className="text-2xl font-bold mt-2">
                        ${product.price.toFixed(2)}
                        {(product.unit === "kilogramos" || product.unit === "gramos") && (
                          <span className="text-sm text-muted-foreground ml-1">/kg</span>
                        )}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      className="w-full h-10"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleProductClick(product);
                      }}
                    >
                      <Plus className="size-4 mr-1" />
                      Agregar
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>

      <Dialog
        open={weightDialogOpen}
        onOpenChange={(open) => {
          setWeightDialogOpen(open);
          if (!open) resetWeightDialog();
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Weight className="size-5" />
              {selectedProduct?.name}
            </DialogTitle>
            <DialogDescription>
              Ingresá el peso en kilogramos o el monto en pesos
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Tabs
              value={weightInputMode}
              onValueChange={(value) => setWeightInputMode(value as "weight" | "amount")}
            >
              <TabsList className="w-full">
                <TabsTrigger value="weight" className="flex-1">
                  Por peso
                </TabsTrigger>
                <TabsTrigger value="amount" className="flex-1">
                  Por monto
                </TabsTrigger>
              </TabsList>

              <TabsContent value="weight" className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="weight">Peso (kg)</Label>
                  <Input
                    id="weight"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleWeightConfirm();
                      }
                    }}
                    placeholder="0.00"
                    className="text-2xl h-14 mt-1"
                    autoFocus
                  />
                  {selectedProduct && weight && parseFloat(weight) > 0 && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Total: ${(selectedProduct.price * parseFloat(weight)).toFixed(2)}
                    </p>
                  )}
                </div>

                <div>
                  <Label className="text-sm text-muted-foreground">Pesos rápidos</Label>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {quickWeights.map((w) => (
                      <Button
                        key={w}
                        variant="outline"
                        onClick={() => setWeight(w.toString())}
                        className="h-12"
                      >
                        {w} kg
                      </Button>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="amount" className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="amount">Monto ($)</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleWeightConfirm();
                      }
                    }}
                    placeholder="0.00"
                    className="text-2xl h-14 mt-1"
                    autoFocus
                  />
                  {selectedProduct && amount && parseFloat(amount) > 0 && selectedProduct.price > 0 && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Peso: {(parseFloat(amount) / selectedProduct.price).toFixed(3)} kg
                      {" · "}
                      ${selectedProduct.price.toFixed(2)}/kg
                    </p>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setWeightDialogOpen(false);
                resetWeightDialog();
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleWeightConfirm}
              disabled={!resolveWeightKg()}
            >
              <Plus className="size-4 mr-1" />
              Agregar al Carrito
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
