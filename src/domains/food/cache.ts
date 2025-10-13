import { FoodResult } from './format';

interface CacheEntry {
  result: FoodResult;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export function getCachedFood(key: string): FoodResult | null {
  const entry = cache.get(key);
  if (!entry) return null;

  if (Date.now() - entry.timestamp > CACHE_TTL) {
    cache.delete(key);
    return null;
  }

  return entry.result;
}

export function setCachedFood(key: string, result: FoodResult): void {
  cache.set(key, {
    result,
    timestamp: Date.now()
  });

  setTimeout(() => cache.delete(key), CACHE_TTL);
}

export function clearFoodCache(): void {
  cache.clear();
}
