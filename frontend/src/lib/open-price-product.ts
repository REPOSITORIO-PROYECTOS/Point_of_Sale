import type { CartItem, Product } from "./wails-bridge";

/** Producto de ajuste: precio en catálogo es 0 y se define al vender. */
export function isOpenPriceProduct(product: Pick<Product, "openPrice">): boolean {
  return Boolean(product.openPrice);
}

export function getCartLineKey(item: CartItem): string {
  return item.cartLineId ?? item.id;
}

export function createOpenPriceCartLine(product: Product, salePrice: number): CartItem {
  return {
    ...product,
    price: salePrice,
    quantity: 1,
    cartLineId: `${product.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  };
}
