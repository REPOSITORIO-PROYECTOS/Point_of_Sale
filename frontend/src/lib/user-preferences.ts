const STORAGE_KEY = "pos.user.preferences";

export type UserPreferences = {
  receiptWidthMm?: 55 | 80;
};

type PreferencesStore = Record<string, UserPreferences>;

function readStore(): PreferencesStore {
  if (typeof window === "undefined") return {};
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as PreferencesStore;
  } catch {
    return {};
  }
}

function writeStore(store: PreferencesStore) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function getUserPreferences(userId: string): UserPreferences {
  return readStore()[userId] ?? {};
}

export function saveUserPreferences(userId: string, preferences: Partial<UserPreferences>) {
  const store = readStore();
  store[userId] = { ...store[userId], ...preferences };
  writeStore(store);
}

export function getEffectiveReceiptWidth(
  userId: string | undefined,
  fallback: 55 | 80 = 80,
): 55 | 80 {
  if (!userId) return fallback;
  return getUserPreferences(userId).receiptWidthMm ?? fallback;
}
