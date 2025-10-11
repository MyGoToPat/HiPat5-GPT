/**
 * Question Cache Manager
 *
 * Caches the last food question's MacroSummary for quick "log" follow-ups.
 * Uses hybrid storage: in-memory (fastest) + localStorage (survives refresh).
 *
 * TTL: 5 minutes (long enough for "tell me macros" → "log", short enough to prevent stale data)
 */

export interface MacroSummary {
  items: Array<{
    name: string;
    quantity: number;
    unit: string;
    macros: {
      kcal: number;
      protein_g: number;
      fat_g: number;
      carbs_g: number;
      fiber_g: number;
    };
    metadata?: {
      prepState?: 'cooked' | 'raw' | 'mixed';
      explicitPrep?: boolean;
      sizeAssumed?: string;
      unitConverted?: boolean;
      targetUnit?: string;
      source?: 'cache' | 'usda' | 'llm_estimate';
      confidence?: number;
    };
  }>;
  totals: {
    kcal: number;
    protein_g: number;
    fat_g: number;
    carbs_g: number;
    fiber_g: number;
  };
  metadata?: {
    reconciled?: boolean;
    reconciliationReason?: string;
  };
}

export interface QuestionCache {
  summary: MacroSummary;
  timestamp: number;
  rawText: string;
  ttl: number;
}

export class QuestionCacheManager {
  private static readonly STORAGE_KEY = 'pat_last_question_cache';
  private static readonly TTL_MS = 5 * 60 * 1000; // 5 minutes

  // Layer 1: In-memory cache (fastest, session-only)
  private static memCache: QuestionCache | null = null;

  /**
   * Save a food question summary to cache
   */
  static save(summary: MacroSummary, rawText: string, userId: string): void {
    const cache: QuestionCache = {
      summary,
      timestamp: Date.now(),
      rawText,
      ttl: this.TTL_MS
    };

    // Save to memory
    this.memCache = cache;

    // Save to localStorage (scoped to user)
    try {
      localStorage.setItem(
        `${this.STORAGE_KEY}_${userId}`,
        JSON.stringify(cache)
      );
    } catch (e) {
      console.warn('[QuestionCache] localStorage unavailable:', e);
    }
  }

  /**
   * Get cached summary (with TTL check)
   */
  static get(userId: string): MacroSummary | null {
    // Try memory first
    if (this.memCache && this.isValid(this.memCache)) {
      return this.memCache.summary;
    }

    // Try localStorage
    try {
      const stored = localStorage.getItem(`${this.STORAGE_KEY}_${userId}`);
      if (stored) {
        const cache: QuestionCache = JSON.parse(stored);
        if (this.isValid(cache)) {
          // Hydrate memory cache
          this.memCache = cache;
          return cache.summary;
        }
      }
    } catch (e) {
      console.warn('[QuestionCache] localStorage read failed:', e);
    }

    return null;
  }

  /**
   * Clear cache for a user
   */
  static clear(userId: string): void {
    this.memCache = null;
    try {
      localStorage.removeItem(`${this.STORAGE_KEY}_${userId}`);
    } catch (e) {
      // Silent fail
    }
  }

  /**
   * Check if cache is still valid (within TTL)
   */
  private static isValid(cache: QuestionCache): boolean {
    return Date.now() - cache.timestamp < cache.ttl;
  }

  /**
   * Get cache metadata (for debugging)
   */
  static getMetadata(userId: string): { exists: boolean; age?: number; expired?: boolean } {
    const cache = this.memCache || this.getFromStorage(userId);

    if (!cache) {
      return { exists: false };
    }

    const age = Date.now() - cache.timestamp;
    return {
      exists: true,
      age,
      expired: age >= cache.ttl
    };
  }

  private static getFromStorage(userId: string): QuestionCache | null {
    try {
      const stored = localStorage.getItem(`${this.STORAGE_KEY}_${userId}`);
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      return null;
    }
  }
}
