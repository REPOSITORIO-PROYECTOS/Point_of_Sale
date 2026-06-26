import { useState } from "react";
import { PosAPI } from "../../../lib/pos-api";
import { useTheme } from "../../../lib/theme-context";
import { CartItem, Transaction, WailsAPI, Product } from "../../../lib/wails-bridge";
import { createOpenPriceCartLine, getCartLineKey } from "../../../lib/open-price-product";
import { ProductCatalog } from "./ProductCatalog";
import { ShoppingCart } from "./ShoppingCart";
import { toast } from "sonner";

export function POSScreen() {
  const { themeConfig } = useTheme();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  const handleAddToCart = (product: Product, _weight?: number, openPriceAmount?: number) => {
    if (openPriceAmount != null && openPriceAmount > 0) {
      const line = createOpenPriceCartLine(product, openPriceAmount);
      setCartItems((prev) => [...prev, line]);
      toast.success(`${product.name} - $${openPriceAmount.toFixed(2)} agregado al carrito`);
      return;
    }

    setCartItems((prev) => {
      const existing = prev.find((item) => item.id === product.id && !item.cartLineId);
      if (existing) {
        return prev.map((item) =>
          getCartLineKey(item) === getCartLineKey(existing)
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
    toast.success(`${product.name} agregado al carrito`);
  };

  const handleUpdateQuantity = (lineKey: string, delta: number) => {
    setCartItems((prev) => {
      return prev
        .map((item) =>
          getCartLineKey(item) === lineKey
            ? { ...item, quantity: item.quantity + delta }
            : item
        )
        .filter((item) => item.quantity > 0);
    });
  };

  const handleRemoveItem = (lineKey: string) => {
    setCartItems((prev) => prev.filter((item) => getCartLineKey(item) !== lineKey));
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

      await PosAPI.createSale(transaction);

      const printResult = await WailsAPI.tryPrintReceipt(cartItems, total, {
        receiptWidthMm: themeConfig.receiptWidthMm ?? 80,
        logoUrl: themeConfig.logoUrl,
        ticketId: transaction.id,
      });

      if (!printResult.ok) {
        toast.warning("Venta registrada, pero no se pudo imprimir el ticket", {
          description: printResult.error,
        });
      } else {
        toast.success("Transacción completada exitosamente");
      }

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

  return (
    <div className="flex h-full">
      <div className="flex-1 border-r">
        <ProductCatalog onAddToCart={handleAddToCart} />
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
