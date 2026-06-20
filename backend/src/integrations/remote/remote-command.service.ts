import { Injectable, Logger } from '@nestjs/common';
import { CashService } from '@/resources/cash/cash.service';
import { ProductsService } from '@/resources/products/products.service';

export type CatalogProductSummary = {
  id: string;
  name: string;
  price: number;
  categories: string[];
  stock?: number;
};

export type CatalogSnapshot = {
  categories: Array<{ name: string; productCount: number }>;
  products: CatalogProductSummary[];
  syncedAt: string;
};

@Injectable()
export class RemoteCommandService {
  private readonly logger = new Logger(RemoteCommandService.name);

  constructor(
    private readonly productsService: ProductsService,
    private readonly cashService: CashService,
  ) {}

  async handleCommand(action: string, payload: unknown): Promise<unknown> {
    switch (action) {
      case 'get_catalog':
        return this.getCatalog();
      case 'get_cash_history':
        return this.getCashHistory(payload);
      case 'increase_prices_by_category':
        return this.increasePricesByCategory(payload);
      default:
        throw new Error(`Unknown command: ${action}`);
    }
  }

  private async getCatalog(): Promise<CatalogSnapshot> {
    const [categories, products] = await Promise.all([
      this.productsService.listCategories(),
      this.productsService.findAll(),
    ]);

    const countByCategory = new Map<string, number>();
    for (const category of categories) {
      countByCategory.set(category, 0);
    }

    for (const product of products) {
      for (const category of product.categories) {
        const trimmed = category.trim();
        if (!trimmed) {
          continue;
        }

        countByCategory.set(trimmed, (countByCategory.get(trimmed) ?? 0) + 1);
      }
    }

    return {
      categories: [...countByCategory.entries()]
        .map(([name, productCount]) => ({ name, productCount }))
        .sort((left, right) => left.name.localeCompare(right.name, 'es')),
      products: products.map((product) => ({
        id: product.id,
        name: product.name,
        price: product.price,
        categories: product.categories,
        ...(product.stock != null ? { stock: product.stock } : {}),
      })),
      syncedAt: new Date().toISOString(),
    };
  }

  private async getCashHistory(payload: unknown) {
    const limit =
      typeof payload === 'object' && payload !== null && 'limit' in payload
        ? Number((payload as { limit?: number }).limit ?? 50)
        : 50;

    const sessions = await this.cashService.listClosedSessions(Math.min(Math.max(limit, 1), 100));
    const openSession = await this.cashService.getSession();

    return {
      currentSession: openSession,
      closedSessions: sessions,
      syncedAt: new Date().toISOString(),
    };
  }

  private async increasePricesByCategory(payload: unknown) {
    if (typeof payload !== 'object' || payload === null) {
      throw new Error('Invalid payload');
    }

    const category = String((payload as { category?: string }).category ?? '').trim();
    const percent = Number((payload as { percent?: number }).percent);

    if (!category || !Number.isFinite(percent) || percent <= 0) {
      throw new Error('category and positive percent are required');
    }

    const result = await this.productsService.increasePricesByCategory(category, percent);
    this.logger.log(
      `Remote price increase: ${result.affectedCount} product(s) in "${result.category}" (+${result.percent}%)`,
    );

    return {
      affectedCount: result.affectedCount,
      category: result.category,
      percent: result.percent,
      syncedAt: new Date().toISOString(),
    };
  }
}
