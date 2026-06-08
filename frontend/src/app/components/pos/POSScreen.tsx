import { useState, useEffect } from "react";
import { Product, CartItem, WailsAPI, Transaction } from "../../../lib/wails-bridge";
import { ProductCatalog } from "./ProductCatalog";
import { ShoppingCart } from "./ShoppingCart";
import { toast } from "sonner";

export function POSScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const data = await WailsAPI.getProducts();
      setProducts(data);
    } catch (error) {
      console.error("Failed to load products:", error);
      toast.error("Error al cargar productos");
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = (product: Product) => {
    setCartItems((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
    toast.success(`${product.name} agregado al carrito`);
  };

  const handleUpdateQuantity = (productId: string, delta: number) => {
    setCartItems((prev) => {
      return prev
        .map((item) =>
          item.id === productId
            ? { ...item, quantity: item.quantity + delta }
            : item
        )
        .filter((item) => item.quantity > 0);
    });
  };

  const handleRemoveItem = (productId: string) => {
    setCartItems((prev) => prev.filter((item) => item.id !== productId));
    toast.success("Artículo eliminado del carrito");
  };

  const handleCheckout = async () => {
    if (cartItems.length === 0) return;

    try {
      const total = cartItems.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      );

      const transaction: Transaction = {
        id: Date.now().toString(),
        items: cartItems,
        total,
        timestamp: new Date().toISOString(),
      };

      await WailsAPI.printReceipt(cartItems, total);
      await WailsAPI.saveTransaction(transaction);

      toast.success("Transacción completada exitosamente");
      setCartItems([]);
    } catch (error) {
      console.error("Checkout failed:", error);
      toast.error("Error al procesar el pago");
    }
  };

  const handleCancel = () => {
    if (cartItems.length === 0) return;
    setCartItems([]);
    toast.success("Pedido cancelado");
  };

  const handleHold = () => {
    if (cartItems.length === 0) return;
    toast.success("Pedido pausado");
    setCartItems([]);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-pulse text-muted-foreground">
            Cargando productos...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      <div className="flex-1 border-r">
        <ProductCatalog products={products} onAddToCart={handleAddToCart} />
      </div>
      <div className="w-[400px]">
        <ShoppingCart
          items={cartItems}
          onUpdateQuantity={handleUpdateQuantity}
          onRemoveItem={handleRemoveItem}
          onCheckout={handleCheckout}
          onCancel={handleCancel}
          onHold={handleHold}
        />
      </div>
    </div>
  );
}
