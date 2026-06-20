const STORAGE_KEY = 'pos-remote-deferred-commands';

export type DeferredPriceIncrease = {
  id: string;
  clientNumber: string;
  registerId: string;
  category: string;
  percent: number;
  createdAt: string;
  attempts: number;
  lastError?: string;
};

function readAll(): DeferredPriceIncrease[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as DeferredPriceIncrease[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(items: DeferredPriceIncrease[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function listDeferredCommands(registerId?: string): DeferredPriceIncrease[] {
  const items = readAll();
  if (!registerId) {
    return items;
  }

  return items.filter((item) => item.registerId === registerId);
}

export function enqueueDeferredPriceIncrease(input: {
  clientNumber: string;
  registerId: string;
  category: string;
  percent: number;
}): DeferredPriceIncrease {
  const item: DeferredPriceIncrease = {
    id: crypto.randomUUID(),
    clientNumber: input.clientNumber.trim().toUpperCase(),
    registerId: input.registerId,
    category: input.category.trim(),
    percent: input.percent,
    createdAt: new Date().toISOString(),
    attempts: 0,
  };

  writeAll([...readAll(), item]);
  return item;
}

export function removeDeferredCommand(id: string): void {
  writeAll(readAll().filter((item) => item.id !== id));
}

export function updateDeferredCommand(
  id: string,
  patch: Partial<Pick<DeferredPriceIncrease, 'attempts' | 'lastError'>>,
): void {
  writeAll(
    readAll().map((item) => (item.id === id ? { ...item, ...patch } : item)),
  );
}

export function countDeferredCommands(registerId?: string): number {
  return listDeferredCommands(registerId).length;
}
