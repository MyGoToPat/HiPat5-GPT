/**
 * Idempotency Key Generator
 *
 * Creates SHA-256 hashes to prevent duplicate meal logs.
 * Uses 30-second rounding window to catch rapid double-taps.
 */

import type { MacroSummary } from '../../cache/questionCache';

/**
 * Generate idempotency key for meal logging
 *
 * @param userId - User ID
 * @param summary - Macro summary from aggregator
 * @param timestamp - ISO timestamp of meal
 * @returns 16-character hex hash
 */
export async function generateMealFingerprint(
  userId: string,
  summary: MacroSummary,
  timestamp: string
): Promise<string> {
  // Round timestamp to nearest 30 seconds (catches rapid retries)
  const roundedTs = Math.floor(new Date(timestamp).getTime() / 30000) * 30000;

  // Sort items by name for consistent ordering
  const sortedItems = [...summary.items]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(i => ({
      name: i.name.toLowerCase().trim(),
      kcal: Math.round(i.macros.kcal),
      p: Math.round(i.macros.protein_g),
      f: Math.round(i.macros.fat_g),
      c: Math.round(i.macros.carbs_g)
    }));

  // Create canonical representation
  const canonical = {
    userId,
    ts: roundedTs,
    items: sortedItems
  };

  const payload = JSON.stringify(canonical);

  // SHA-256 via Web Crypto API (browser-safe)
  const encoder = new TextEncoder();
  const data = encoder.encode(payload);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);

  // Convert to hex string
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  // Return first 16 chars (sufficient uniqueness for our use case)
  return hashHex.substring(0, 16);
}

/**
 * Synchronous version using simple hash (fallback for Node environments)
 * Not cryptographically secure, but sufficient for deduplication
 */
export function generateMealFingerprintSync(
  userId: string,
  summary: MacroSummary,
  timestamp: string
): string {
  const roundedTs = Math.floor(new Date(timestamp).getTime() / 30000) * 30000;

  const sortedItems = [...summary.items]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(i => ({
      name: i.name.toLowerCase().trim(),
      kcal: Math.round(i.macros.kcal),
      p: Math.round(i.macros.protein_g),
      f: Math.round(i.macros.fat_g),
      c: Math.round(i.macros.carbs_g)
    }));

  const canonical = {
    userId,
    ts: roundedTs,
    items: sortedItems
  };

  const payload = JSON.stringify(canonical);

  // Simple hash function
  let hash = 0;
  for (let i = 0; i < payload.length; i++) {
    const char = payload.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  return Math.abs(hash).toString(16).padStart(16, '0').substring(0, 16);
}
