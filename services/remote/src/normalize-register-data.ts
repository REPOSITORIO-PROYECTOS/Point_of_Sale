import type { RegisterCashHistory, RegisterCatalog } from './types.js';

export function normalizeCatalog(
  clientNumber: string,
  registerId: string,
  payload: unknown,
): RegisterCatalog {
  const data = payload as {
    categories?: Array<{ name: string; productCount: number }>;
    products?: Array<{
      id: string;
      name: string;
      price: number;
      categories: string[];
      stock?: number;
    }>;
    syncedAt?: string;
  };

  return {
    registerId,
    clientNumber,
    categories: data.categories ?? [],
    products: data.products ?? [],
    syncedAt: data.syncedAt ?? new Date().toISOString(),
  };
}

export function normalizeCashHistory(
  clientNumber: string,
  registerId: string,
  payload: unknown,
): RegisterCashHistory {
  const data = payload as {
    currentSession?: RegisterCashHistory['currentSession'];
    closedSessions?: RegisterCashHistory['closedSessions'];
    syncedAt?: string;
  };

  return {
    registerId,
    clientNumber,
    currentSession: data.currentSession ?? null,
    closedSessions: data.closedSessions ?? [],
    syncedAt: data.syncedAt ?? new Date().toISOString(),
  };
}
