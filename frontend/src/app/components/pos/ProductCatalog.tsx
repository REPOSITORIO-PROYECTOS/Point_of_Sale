import { useState, useMemo, useRef, type KeyboardEvent } from "react";
import { Product } from "../../../lib/wails-bridge";
import { PosAPI } from "../../../lib/pos-api";
import {
  getAllCategoriesFromProducts,
  getProductCategories,
  productInCategory,
} from "../../../lib/product-categories";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Card } from "../ui/card";
import { Search, Plus, Weight, Lock, Unlock, ArrowUpDown } from "lucide-react";
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

interface ProductCatalogProps {
  products: Product[];
  onAddToCart: (product: Product, weight?: number) => void;
  cashSession?: any;
  onOpenCash?: () => void;
  onCloseCash?: () => void;
  onOpenMovements?: () => void;
}

export function ProductCatalog({
  products,
  onAddToCart,
  cashSession,
  onOpenCash,
  onCloseCash,
  onOpenMovements,
}: ProductCatalogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [weightDialogOpen, setWeightDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [weight, setWeight] = useState("");
  const barcodeLookupRef = useRef(false);

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    const query = searchQuery.toLowerCase();
    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(query) ||
        getProductCategories(product).some((category) =>
          category.toLowerCase().includes(query),
        ) ||
        (product.barcodes && product.barcodes.some((b) => b.includes(query)))
    );
  }, [products, searchQuery]);

  const categories = useMemo(() => getAllCategoriesFromProducts(products), [products]);

  const handleProductClick = (product: Product) => {
    if (product.unit === "kilogramos" || product.unit === "gramos") {
      setSelectedProduct(product);
      setWeightDialogOpen(true);
    } else {
      onAddToCart(product);
    }
  };

  const handleWeightConfirm = () => {
    if (selectedProduct && weight && parseFloat(weight) > 0) {
      onAddToCart(selectedProduct, parseFloat(weight));
      setWeightDialogOpen(false);
      setWeight("");
      setSelectedProduct(null);
    }
  };

  const quickWeights = [0.25, 0.5, 0.75, 1, 1.5, 2];

  const findProductByBarcode = (code: string): Product | undefined => {
    const trimmed = code.trim();
    if (!trimmed) return undefined;
    return products.find((product) =>
      product.barcodes?.some((barcode) => barcode === trimmed),
    );
  };

  const handleSearchKeyDown = async (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter" || barcodeLookupRef.current) return;

    const trimmed = searchQuery.trim();
    if (!trimmed) return;

    let match = findProductByBarcode(trimmed);

    if (!match) {
      barcodeLookupRef.current = true;
      try {
        match = await PosAPI.getProductByBarcode(trimmed);
      } catch {
        return;
      } finally {
        barcodeLookupRef.current = false;
      }
    }

    event.preventDefault();
    setSearchQuery("");
    handleProductClick(match);
  };
  const isOpen = isCashSessionOpen(cashSession);

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Buscar productos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            autoFocus
            className="pl-10 h-14 text-lg"
          />
        </div>

        {/* Botones de Caja */}
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

        {/* Indicador de estado de caja */}
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

      <div className="flex-1 overflow-auto p-4">
        {categories.map((category) => {
          const categoryProducts = filteredProducts.filter((p) =>
            productInCategory(p, category)
          );
          if (categoryProducts.length === 0) return null;

          return (
            <div key={category} className="mb-6">
              <h3 className="mb-3 font-semibold text-muted-foreground uppercase tracking-wide">
                {category}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {categoryProducts.map((product) => (
                  <Card
                    key={product.id}
                    className="p-4 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => handleProductClick(product)}
                  >
                    <div className="flex flex-col gap-2">
                      <div className="flex-1">
                        <h4 className="font-medium truncate">{product.name}</h4>
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
            </div>
          );
        })}

        {filteredProducts.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No se encontraron productos
          </div>
        )}
      </div>

      {/* Diálogo para ingresar peso */}
      <Dialog open={weightDialogOpen} onOpenChange={setWeightDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Weight className="size-5" />
              {selectedProduct?.name}
            </DialogTitle>
            <DialogDescription>
              Ingresa la cantidad en kilogramos
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
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
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setWeightDialogOpen(false);
                setWeight("");
                setSelectedProduct(null);
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleWeightConfirm}
              disabled={!weight || parseFloat(weight) <= 0}
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
