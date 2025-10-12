/**
 * Food Cache Module
 *
 * Manages caching of USDA food data to reduce API calls
 */

import { supabase } from './supabase';
import type { USDAMacros } from './macro/formatter';

export interface CachedFood {
  id: string;
  name: string;
  brand?: string;
  serving_size: string;
  grams_per_serving: number;
  macros: USDAMacros;
  source_db: string;
  confidence: number;
  expires_at: string;
  created_at: string;
}

export interface FoodCacheQuery {
  name: string;
  brand?: string;
}

const CACHE_TTL_DAYS = 30;

/**
 * Get food from cache
 */
export async function getFoodFromCache(
  query: FoodCacheQuery
): Promise<CachedFood | null> {
  const cacheKey = makeCacheKey(query.name, query.brand);

  const { data, error } = await supabase
    .from('food_cache')
    .select('*')
    .eq('id', cacheKey)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as CachedFood;
}

/**
 * Save food to cache
 */
export async function saveFoodToCache(
  name: string,
  brand: string | undefined,
  servingSize: string,
  gramsPerServing: number,
  macros: USDAMacros,
  sourceDb: string,
  confidence: number
): Promise<void> {
  const cacheKey = makeCacheKey(name, brand);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + CACHE_TTL_DAYS);

  const { error } = await supabase
    .from('food_cache')
    .upsert({
      id: cacheKey,
      name,
      brand: brand || null,
      serving_size: servingSize,
      grams_per_serving: gramsPerServing,
      macros,
      source_db: sourceDb,
      confidence,
      expires_at: expiresAt.toISOString(),
      created_at: new Date().toISOString()
    }, {
      onConflict: 'id'
    });

  if (error) {
    console.error('[foodCache] Error saving to cache:', error);
  }
}

/**
 * Make cache key from name and brand
 */
function makeCacheKey(name: string, brand?: string): string {
  const normalizedName = name.toLowerCase().trim();
  const normalizedBrand = brand ? brand.toLowerCase().trim() : 'generic';
  return `${normalizedName}:${normalizedBrand}`;
}

/**
 * Clear expired cache entries
 */
export async function clearExpiredCache(): Promise<number> {
  const { data, error } = await supabase
    .from('food_cache')
    .delete()
    .lt('expires_at', new Date().toISOString())
    .select();

  if (error) {
    console.error('[foodCache] Error clearing expired cache:', error);
    return 0;
  }

  return data?.length || 0;
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  total: number;
  expired: number;
  active: number;
}> {
  const now = new Date().toISOString();

  const { count: total } = await supabase
    .from('food_cache')
    .select('*', { count: 'exact', head: true });

  const { count: expired } = await supabase
    .from('food_cache')
    .select('*', { count: 'exact', head: true })
    .lt('expires_at', now);

  return {
    total: total || 0,
    expired: expired || 0,
    active: (total || 0) - (expired || 0)
  };
}

/**
 * Invalidate cache entry
 */
export async function invalidateCacheEntry(name: string, brand?: string): Promise<void> {
  const cacheKey = makeCacheKey(name, brand);

  const { error } = await supabase
    .from('food_cache')
    .delete()
    .eq('id', cacheKey);

  if (error) {
    console.error('[foodCache] Error invalidating cache:', error);
  }
}

/**
 * Search cache by name (fuzzy)
 */
export async function searchCache(query: string, limit = 10): Promise<CachedFood[]> {
  const { data, error } = await supabase
    .from('food_cache')
    .select('*')
    .ilike('name', `%${query}%`)
    .gt('expires_at', new Date().toISOString())
    .order('confidence', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[foodCache] Error searching cache:', error);
    return [];
  }

  return (data || []) as CachedFood[];
}
