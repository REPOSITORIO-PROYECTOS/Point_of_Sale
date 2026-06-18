import { useState, useEffect } from "react";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Package, Plus, Edit, Trash2, AlertTriangle, Search, X, Barcode, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { PosAPI } from "../../../lib/pos-api";
import type { Product } from "../../../lib/wails-bridge";
import { Checkbox } from "../ui/checkbox";
import {
  formatCategoriesLabel,
  getAllCategoriesFromProducts,
  getProductCategories,
  productInCategory,
} from "../../../lib/product-categories";

export function ProductsManagementView() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [priceIncreaseDialogOpen, setPriceIncreaseDialogOpen] = useState(false);
  const [increaseType, setIncreaseType] = useState<"general" | "category" | "selection">("general");
  const [increasePercentage, setIncreasePercentage] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState({
    id: "",
    name: "",
    price: "",
    cost: "",
    categories: [] as string[],
    stock: "",
    minStock: "",
    unit: "unidad" as "unidad" | "gramos" | "kilogramos" | "litros" | "mililitros",
    quantity: "",
  });
  const [barcodes, setBarcodes] = useState<string[]>([]);
  const [newBarcode, setNewBarcode] = useState("");
  const [newCategory, setNewCategory] = useState("");

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const data = await PosAPI.getProducts();
      setProducts(data);
    } catch (error) {
      console.error("Failed to load products:", error);
      toast.error("Error al cargar productos");
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setSelectedProduct(null);
    setFormData({
      id: "",
      name: "",
      price: "",
      cost: "",
      categories: [],
      stock: "",
      minStock: "",
      unit: "unidad",
      quantity: "",
    });
    setBarcodes([]);
    setNewBarcode("");
    setNewCategory("");
    setEditDialogOpen(true);
  };

  const handleEdit = (product: Product) => {
    setSelectedProduct(product);
    setFormData({
      id: product.id,
      name: product.name,
      price: product.price.toString(),
      cost: product.cost?.toString() || "",
      categories: getProductCategories(product),
      stock: product.stock?.toString() || "",
      minStock: product.minStock?.toString() || "",
      unit: product.unit || "unidad",
      quantity: product.quantity?.toString() || "",
    });
    setBarcodes(product.barcodes || []);
    setNewBarcode("");
    setNewCategory("");
    setEditDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.id || !formData.name || !formData.price || formData.categories.length === 0) {
      toast.error("Completa los campos obligatorios");
      return;
    }

    const newProduct: Product = {
      id: formData.id,
      name: formData.name,
      price: parseFloat(formData.price),
      cost: formData.cost ? parseFloat(formData.cost) : undefined,
      categories: formData.categories,
      stock: formData.stock ? parseInt(formData.stock) : undefined,
      minStock: formData.minStock ? parseInt(formData.minStock) : undefined,
      barcodes: barcodes.length > 0 ? barcodes : undefined,
      unit: formData.unit,
      quantity: formData.quantity ? parseFloat(formData.quantity) : undefined,
    };

    try {
      if (selectedProduct) {
        await PosAPI.updateProduct(newProduct);
        setProducts(products.map((p) => (p.id === selectedProduct.id ? newProduct : p)));
        toast.success("Producto actualizado");
      } else {
        await PosAPI.createProduct(newProduct);
        setProducts([...products, newProduct]);
        toast.success("Producto agregado");
      }
      setEditDialogOpen(false);
    } catch (error) {
      console.error("Failed to save product:", error);
      toast.error("Error al guardar el producto");
    }
  };

  const handleAddBarcode = () => {
    if (newBarcode.trim() && !barcodes.includes(newBarcode.trim())) {
      setBarcodes([...barcodes, newBarcode.trim()]);
      setNewBarcode("");
    }
  };

  const handleRemoveBarcode = (barcode: string) => {
    setBarcodes(barcodes.filter((b) => b !== barcode));
  };

  const toggleCategory = (category: string) => {
    setFormData((current) => {
      const hasCategory = current.categories.includes(category);
      return {
        ...current,
        categories: hasCategory
          ? current.categories.filter((item) => item !== category)
          : [...current.categories, category],
      };
    });
  };

  const handleAddCategory = () => {
    const trimmed = newCategory.trim();
    if (!trimmed) return;
    setFormData((current) => ({
      ...current,
      categories: current.categories.includes(trimmed)
        ? current.categories
        : [...current.categories, trimmed],
    }));
    setNewCategory("");
  };

  const formatQuantity = (value: number, unit: string) => {
    if (unit === "gramos" && value >= 1000) {
      return `${(value / 1000).toFixed(2)} kg`;
    }
    if (unit === "mililitros" && value >= 1000) {
      return `${(value / 1000).toFixed(2)} L`;
    }
    return `${value} ${unit}`;
  };

  const handleApplyPriceIncrease = async () => {
    if (!increasePercentage || parseFloat(increasePercentage) <= 0) {
      toast.error("Ingresa un porcentaje válido");
      return;
    }

    const percentage = parseFloat(increasePercentage) / 100;
    let updatedProducts = [...products];
    let affectedCount = 0;

    if (increaseType === "general") {
      updatedProducts = updatedProducts.map((p) => ({
        ...p,
        price: p.price * (1 + percentage),
        cost: p.cost ? p.cost * (1 + percentage) : p.cost,
      }));
      affectedCount = updatedProducts.length;
    } else if (increaseType === "category") {
      if (!selectedCategory) {
        toast.error("Selecciona una categoría");
        return;
      }
      updatedProducts = updatedProducts.map((p) => {
        if (productInCategory(p, selectedCategory)) {
          affectedCount++;
          return {
            ...p,
            price: p.price * (1 + percentage),
            cost: p.cost ? p.cost * (1 + percentage) : p.cost,
          };
        }
        return p;
      });
    } else if (increaseType === "selection") {
      if (selectedProducts.size === 0) {
        toast.error("Selecciona al menos un producto");
        return;
      }
      updatedProducts = updatedProducts.map((p) => {
        if (selectedProducts.has(p.id)) {
          affectedCount++;
          return {
            ...p,
            price: p.price * (1 + percentage),
            cost: p.cost ? p.cost * (1 + percentage) : p.cost,
          };
        }
        return p;
      });
    }

    try {
      const savedProducts = await PosAPI.replaceProducts(updatedProducts);
      setProducts(savedProducts);
      setPriceIncreaseDialogOpen(false);
      setIncreasePercentage("");
      setSelectedCategory("");
      setSelectedProducts(new Set());
      toast.success(
        `Precios actualizados: ${affectedCount} producto(s) con ${increasePercentage}% de aumento`
      );
    } catch (error) {
      console.error("Failed to update prices:", error);
      toast.error("Error al actualizar precios");
    }
  };

  const toggleProductSelection = (productId: string) => {
    const newSelection = new Set(selectedProducts);
    if (newSelection.has(productId)) {
      newSelection.delete(productId);
    } else {
      newSelection.add(productId);
    }
    setSelectedProducts(newSelection);
  };

  const getUniqueCategories = () => getAllCategoriesFromProducts(products);

  const handleDelete = async (productId: string) => {
    try {
      await PosAPI.deleteProduct(productId);
      setProducts(products.filter((p) => p.id !== productId));
      toast.success("Producto dado de baja");
    } catch (error) {
      console.error("Failed to delete product:", error);
      toast.error("Error al dar de baja el producto");
    }
  };

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getProductCategories(p).some((category) =>
        category.toLowerCase().includes(searchTerm.toLowerCase()),
      ) ||
      (p.barcodes && p.barcodes.some((b) => b.toLowerCase().includes(searchTerm.toLowerCase())))
  );

  const getStockBadge = (product: Product) => {
    if (!product.stock) return null;
    if (product.minStock && product.stock < product.minStock) {
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertTriangle className="size-3" />
          Bajo Stock
        </Badge>
      );
    }
    return <Badge variant="secondary">{product.stock} unidades</Badge>;
  };

  return (
    <>
      <div className="flex flex-col h-full min-h-0">
        <div className="p-6 border-b bg-background shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Package className="size-6" />
              <div>
                <h1 className="text-2xl font-semibold">Gestión de Productos</h1>
                <p className="text-sm text-muted-foreground">
                  Administra el catálogo de productos
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => setPriceIncreaseDialogOpen(true)}
                size="lg"
                variant="outline"
                className="gap-2"
              >
                <TrendingUp className="size-4" />
                Suba de Precios
              </Button>
              <Button onClick={handleAdd} size="lg" className="gap-2">
                <Plus className="size-4" />
                Agregar Producto
              </Button>
            </div>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-auto p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {loading ? (
              <div className="py-16 text-center text-muted-foreground">
                Cargando productos...
              </div>
            ) : (
              <>
            {/* Búsqueda */}
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre, código, categoría o código de barra..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="text-sm text-muted-foreground">
                {filteredProducts.length} productos
              </div>
            </div>

            {/* Tabla de Productos */}
            <Card>
              <CardHeader>
                <CardTitle>Catálogo de Productos</CardTitle>
                <CardDescription>
                  Lista completa de productos disponibles
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[120px]">Código</TableHead>
                        <TableHead>Nombre</TableHead>
                        <TableHead className="w-[180px]">Categorías</TableHead>
                        <TableHead className="w-[110px]">Cantidad</TableHead>
                        <TableHead className="w-[100px]">Precio</TableHead>
                        <TableHead className="w-[100px]">Costo</TableHead>
                        <TableHead className="w-[150px]">Stock</TableHead>
                        <TableHead className="w-[120px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredProducts.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="py-12 text-center text-muted-foreground">
                            {searchTerm
                              ? "No hay productos que coincidan con la búsqueda"
                              : "No hay productos cargados. Usá «Agregar Producto» para empezar."}
                          </TableCell>
                        </TableRow>
                      ) : (
                      filteredProducts.map((product) => (
                        <TableRow key={product.id}>
                          <TableCell className="font-mono font-medium">
                            <div>{product.id}</div>
                            {product.barcodes && product.barcodes.length > 0 && (
                              <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                                <Barcode className="size-3" />
                                {product.barcodes.length}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="font-medium">
                            {product.name}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {getProductCategories(product).map((category) => (
                                <Badge key={category} variant="outline">
                                  {category}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {product.quantity && product.unit
                              ? formatQuantity(product.quantity, product.unit)
                              : "-"}
                          </TableCell>
                          <TableCell className="font-semibold">
                            ${product.price.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {product.cost
                              ? `$${product.cost.toFixed(2)}`
                              : "-"}
                          </TableCell>
                          <TableCell>{getStockBadge(product)}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEdit(product)}
                              >
                                <Edit className="size-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDelete(product.id)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Modal de Edición/Creación */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedProduct ? "Editar Producto" : "Agregar Producto"}
            </DialogTitle>
            <DialogDescription>
              Completa la información del producto
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 py-4 max-h-[60vh] overflow-y-auto">
            <div>
              <Label htmlFor="id">Código / ID *</Label>
              <Input
                id="id"
                value={formData.id}
                onChange={(e) =>
                  setFormData({ ...formData, id: e.target.value })
                }
                placeholder="SKU001"
                className="mt-1"
                disabled={!!selectedProduct}
              />
            </div>

            <div>
              <Label htmlFor="name">Nombre del Producto *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Café Espresso"
                className="mt-1"
              />
            </div>

            <div className="col-span-2">
              <Label>Categorías *</Label>
              <p className="text-xs text-muted-foreground mt-1 mb-2">
                Un producto puede pertenecer a varias categorías
              </p>
              <div className="grid grid-cols-2 gap-2 border rounded-lg p-3 max-h-40 overflow-y-auto">
                {getAllCategoriesFromProducts(products).map((category) => (
                  <label
                    key={category}
                    htmlFor={`category-${category}`}
                    className="flex items-center gap-2 text-sm cursor-pointer"
                  >
                    <Checkbox
                      id={`category-${category}`}
                      checked={formData.categories.includes(category)}
                      onCheckedChange={() => toggleCategory(category)}
                    />
                    <span>{category}</span>
                  </label>
                ))}
              </div>
              <div className="flex gap-2 mt-2">
                <Input
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddCategory();
                    }
                  }}
                  placeholder="Nueva categoría"
                />
                <Button type="button" variant="outline" onClick={handleAddCategory}>
                  Agregar
                </Button>
              </div>
              {formData.categories.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.categories.map((category) => (
                    <Badge key={category} variant="secondary" className="gap-1 pl-2 pr-1">
                      {category}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleCategory(category)}
                        className="h-auto p-0.5 hover:bg-destructive/20"
                      >
                        <X className="size-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="unit">Unidad de Medida</Label>
              <Select
                value={formData.unit}
                onValueChange={(value: any) =>
                  setFormData({ ...formData, unit: value })
                }
              >
                <SelectTrigger id="unit" className="mt-1">
                  <SelectValue placeholder="Selecciona unidad" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unidad">Unidad</SelectItem>
                  <SelectItem value="gramos">Gramos (g)</SelectItem>
                  <SelectItem value="kilogramos">Kilogramos (kg)</SelectItem>
                  <SelectItem value="mililitros">Mililitros (ml)</SelectItem>
                  <SelectItem value="litros">Litros (L)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2">
              <Label htmlFor="quantity">
                Cantidad{" "}
                {formData.unit !== "unidad" && formData.quantity && (
                  <span className="text-muted-foreground text-xs">
                    ({formatQuantity(parseFloat(formData.quantity), formData.unit)})
                  </span>
                )}
              </Label>
              <Input
                id="quantity"
                type="number"
                step={formData.unit === "gramos" || formData.unit === "mililitros" ? "1" : "0.01"}
                min="0"
                value={formData.quantity}
                onChange={(e) =>
                  setFormData({ ...formData, quantity: e.target.value })
                }
                placeholder={
                  formData.unit === "gramos"
                    ? "200 (= 0.2 kg)"
                    : formData.unit === "mililitros"
                    ? "500 (= 0.5 L)"
                    : "0"
                }
                className="mt-1"
              />
            </div>

            <div className="col-span-2">
              <Label>Códigos de Barra</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={newBarcode}
                  onChange={(e) => setNewBarcode(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddBarcode();
                    }
                  }}
                  placeholder="Escanea o ingresa código de barra"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddBarcode}
                  className="gap-2"
                >
                  <Plus className="size-4" />
                  Agregar
                </Button>
              </div>
              {barcodes.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {barcodes.map((barcode, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="gap-1 pl-2 pr-1"
                    >
                      <Barcode className="size-3" />
                      {barcode}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveBarcode(barcode)}
                        className="h-auto p-0.5 hover:bg-destructive/20"
                      >
                        <X className="size-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="price">Precio de Venta ($) *</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                value={formData.price}
                onChange={(e) =>
                  setFormData({ ...formData, price: e.target.value })
                }
                placeholder="0.00"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="cost">Costo ($)</Label>
              <Input
                id="cost"
                type="number"
                step="0.01"
                min="0"
                value={formData.cost}
                onChange={(e) =>
                  setFormData({ ...formData, cost: e.target.value })
                }
                placeholder="0.00"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="stock">Stock Disponible</Label>
              <Input
                id="stock"
                type="number"
                min="0"
                value={formData.stock}
                onChange={(e) =>
                  setFormData({ ...formData, stock: e.target.value })
                }
                placeholder="0"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="minStock">Stock Mínimo</Label>
              <Input
                id="minStock"
                type="number"
                min="0"
                value={formData.minStock}
                onChange={(e) =>
                  setFormData({ ...formData, minStock: e.target.value })
                }
                placeholder="0"
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              {selectedProduct ? "Actualizar" : "Agregar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Suba de Precios */}
      <Dialog open={priceIncreaseDialogOpen} onOpenChange={setPriceIncreaseDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingUp className="size-5" />
              Suba de Precios
            </DialogTitle>
            <DialogDescription>
              Aplica aumentos de precios a tus productos
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 flex-1 overflow-y-auto">
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant={increaseType === "general" ? "default" : "outline"}
                onClick={() => setIncreaseType("general")}
                className="h-auto py-4 flex flex-col gap-2"
              >
                <Package className="size-5" />
                <span className="text-sm">Todos los Productos</span>
              </Button>
              <Button
                variant={increaseType === "category" ? "default" : "outline"}
                onClick={() => setIncreaseType("category")}
                className="h-auto py-4 flex flex-col gap-2"
              >
                <AlertTriangle className="size-5" />
                <span className="text-sm">Por Categoría</span>
              </Button>
              <Button
                variant={increaseType === "selection" ? "default" : "outline"}
                onClick={() => setIncreaseType("selection")}
                className="h-auto py-4 flex flex-col gap-2"
              >
                <Edit className="size-5" />
                <span className="text-sm">Selección Manual</span>
              </Button>
            </div>

            <div>
              <Label htmlFor="increasePercentage">Porcentaje de Aumento (%)</Label>
              <Input
                id="increasePercentage"
                type="number"
                step="0.01"
                min="0"
                value={increasePercentage}
                onChange={(e) => setIncreasePercentage(e.target.value)}
                placeholder="10.00"
                className="mt-1 text-lg h-12"
              />
            </div>

            {increaseType === "category" && (
              <div>
                <Label htmlFor="categorySelect">Selecciona Categoría</Label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger id="categorySelect" className="mt-1">
                    <SelectValue placeholder="Selecciona una categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {getUniqueCategories().map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat} ({products.filter((p) => productInCategory(p, cat)).length}{" "}
                        productos)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {increaseType === "selection" && (
              <div className="border rounded-lg">
                <div className="p-3 bg-muted border-b">
                  <p className="text-sm font-medium">
                    Selecciona los productos ({selectedProducts.size} seleccionados)
                  </p>
                </div>
                <div className="max-h-60 overflow-y-auto">
                  {filteredProducts.map((product) => (
                    <div
                      key={product.id}
                      className="flex items-center gap-3 p-3 border-b last:border-b-0 hover:bg-muted/50"
                    >
                      <Checkbox
                        checked={selectedProducts.has(product.id)}
                        onCheckedChange={() => toggleProductSelection(product.id)}
                      />
                      <div className="flex-1">
                        <p className="font-medium">{product.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatCategoriesLabel(getProductCategories(product))} - ${product.price.toFixed(2)}
                        </p>
                      </div>
                      {increasePercentage && parseFloat(increasePercentage) > 0 && (
                        <div className="text-right">
                          <p className="text-sm text-green-600 font-medium">
                            ${(
                              product.price *
                              (1 + parseFloat(increasePercentage) / 100)
                            ).toFixed(2)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            +${(
                              product.price *
                              (parseFloat(increasePercentage) / 100)
                            ).toFixed(2)}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {increaseType === "general" && increasePercentage && (
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">
                  Vista previa del aumento:
                </p>
                <div className="space-y-1">
                  <p className="text-sm">
                    Productos afectados:{" "}
                    <span className="font-bold">{products.length}</span>
                  </p>
                  <p className="text-sm">
                    Aumento promedio:{" "}
                    <span className="font-bold text-green-600">
                      $
                      {(
                        products.reduce((acc, p) => acc + p.price, 0) /
                        products.length *
                        (parseFloat(increasePercentage) / 100)
                      ).toFixed(2)}
                    </span>
                  </p>
                </div>
              </div>
            )}

            {increaseType === "category" &&
              selectedCategory &&
              increasePercentage && (
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2">
                    Vista previa del aumento:
                  </p>
                  <div className="space-y-1">
                    <p className="text-sm">
                      Productos afectados:{" "}
                      <span className="font-bold">
                        {products.filter((p) => productInCategory(p, selectedCategory)).length}
                      </span>
                    </p>
                    <p className="text-sm">
                      Aumento promedio:{" "}
                      <span className="font-bold text-green-600">
                        $
                        {(
                          products
                            .filter((p) => productInCategory(p, selectedCategory))
                            .reduce((acc, p) => acc + p.price, 0) /
                          products.filter((p) => productInCategory(p, selectedCategory))
                            .length *
                          (parseFloat(increasePercentage) / 100)
                        ).toFixed(2)}
                      </span>
                    </p>
                  </div>
                </div>
              )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setPriceIncreaseDialogOpen(false);
                setIncreasePercentage("");
                setSelectedCategory("");
                setSelectedProducts(new Set());
              }}
            >
              Cancelar
            </Button>
            <Button onClick={handleApplyPriceIncrease} className="gap-2">
              <TrendingUp className="size-4" />
              Aplicar Aumento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
