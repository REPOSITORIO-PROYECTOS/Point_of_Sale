import type { Product } from "./wails-bridge";

export const DEFAULT_CATEGORIES = [
  "Cafetería",
  "Panadería",
  "Bebidas",
  "Comida",
  "Snacks",
  "Fiambrería",
  "Otros",
] as const;

type ProductWithLegacyCategory = Product & { category?: string };

export function parseCategoriesInput(value: string): string[] {
  return [...new Set(
    value
      .split(/[,;|]/)
      .map((part) => part.trim())
      .filter(Boolean),
  )];
}

export function getProductCategories(product: ProductWithLegacyCategory): string[] {
  if (product.categories && product.categories.length > 0) {
    return product.categories;
  }
  if (product.category) {
    return [product.category];
  }
  return [];
}

export function productInCategory(
  product: ProductWithLegacyCategory,
  category: string,
): boolean {
  return getProductCategories(product).includes(category);
}

export function getAllCategoriesFromProducts(products: ProductWithLegacyCategory[]): string[] {
  const categories = new Set<string>(DEFAULT_CATEGORIES);
  for (const product of products) {
    getProductCategories(product).forEach((category) => categories.add(category));
  }
  return Array.from(categories).sort((a, b) => a.localeCompare(b, "es"));
}

export function normalizeProduct(product: ProductWithLegacyCategory): Product {
  return {
    ...product,
    categories: getProductCategories(product),
  };
}

export function formatCategoriesLabel(categories: string[]): string {
  return categories.join(", ");
}
