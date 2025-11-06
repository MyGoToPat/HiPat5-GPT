/**
 * Gemini Cache - Browser-safe, standalone
 * Calls nutrition-gemini Edge Function directly
 * Includes in-memory cache + DB persistence
 */

import type { MacroResult } from './providers/types';
import { getSupabase } from '../../../lib/supabase';

const cache = new Map<string, { result: MacroResult; expires: number }>();

/**
 * Build canonical key for DB lookup (normalized, deterministic)
 */
function canonicalKeyFrom(q: {
  name: string;
  brand?: string;
  serving_label?: string;
  size_label?: string;
  country?: string;
}): string {
  const parts = [q.brand, q.name, q.serving_label, q.size_label]
    .filter(Boolean)
    .map(s => s!.toLowerCase().trim())
    .join(' ');
  
  return parts
    .replace(/[^a-z0-9\s]+/g, ' ')  // Remove special chars
    .replace(/\s+/g, ' ')           // Normalize spaces
    .trim() || q.name.toLowerCase();
}

/**
 * Get cached Gemini results via Edge Function
 */
export async function getCachedGemini(q: {
  name: string;
  brand?: string;
  serving_label?: string;
  size_label?: string;
  country?: string;
}): Promise<MacroResult | null> {
  const supabase = getSupabase();
  
  // Guard against empty names
  const foodName = q.name?.trim();
  if (!foodName) {
    console.warn('[geminiCache] Empty food name provided');
    return null;
  }

  // ✅ Step 1: Check in-memory cache first
  const key = JSON.stringify(q);
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) {
    console.log(`[macroLookup.trace] cache=hit key=${key}`);
    return hit.result;
  }

  // ✅ Step 2: Check DB cache
  const canonicalKey = canonicalKeyFrom(q);
  try {
    const { data: dbHit, error: dbError } = await supabase
      .from('food_cache')
      .select('*')
      .eq('id', canonicalKey)  // food_cache uses 'id' as PK, not 'canonical_key'
      .maybeSingle();

    if (!dbError && dbHit) {
      const result: MacroResult = {
        name: dbHit.name,
        serving_label: dbHit.serving_size || 'serving',
        grams_per_serving: dbHit.grams_per_serving || 100,
        macros: dbHit.macros as any,
        confidence: dbHit.confidence || 0.7,
        source: dbHit.source_db || 'gemini'
      };

      // Populate in-memory cache
      cache.set(key, {
        result,
        expires: Date.now() + 24 * 60 * 60 * 1000
      });

      console.log(`[geminiCache] cache=db-hit id=${canonicalKey}`);
      return result;
    }
  } catch (dbErr) {
    console.warn('[geminiCache] DB cache lookup failed:', dbErr);
    // Continue to Edge Function call
  }

  // ✅ Step 3: Call Edge Function
  try {
    // Build canonicalName for better Gemini results
    const canonicalName = [
      q.brand,
      q.name,
      q.serving_label,
      q.size_label
    ].filter(Boolean).join(' ').trim() || undefined;

    // Build correct payload format expected by Edge Function
    const requestBody = {
      foodName: foodName,
      canonicalName: canonicalName
    };

    const { data, error } = await supabase.functions.invoke("nutrition-gemini", {
      body: requestBody
    });

    // Enhanced error logging
    if (error) {
      console.error('[geminiCache] Edge Function error:', {
        error,
        status: (error as any)?.status,
        message: error.message,
        request: requestBody,
        timestamp: new Date().toISOString()
      });
      
      if ((error as any)?.status === 400) {
        console.error('[geminiCache] ⚠️ 400 Bad Request - check request format matches Edge Function expectations');
      }
      
      // Return null to let cascade continue (no stub masking)
      return null;
    }

    if (!data || typeof data !== 'object') {
      console.error('[geminiCache] Invalid response from Edge Function:', {
        data,
        request: requestBody,
        timestamp: new Date().toISOString()
      });
      return null;  // Let cascade continue
    }

    // Convert Edge Function response to MacroResult format
    const result: MacroResult = {
      name: data.name || foodName,
      serving_label: data.serving_label || 'serving',
      grams_per_serving: data.grams_per_serving || 100,
      macros: {
        kcal: data.macros?.kcal || 0,
        protein_g: data.macros?.protein_g || 0,
        carbs_g: data.macros?.carbs_g || 0,
        fat_g: data.macros?.fat_g || 0,
        fiber_g: data.macros?.fiber_g || 0
      },
      confidence: data.confidence || 0.8,
      source: 'gemini'
    };

    // ✅ Step 4: Persist to DB (fire and forget, don't block)
    if (result.macros.kcal > 0) {  // Only cache successful lookups
      const { error: upsertError } = await supabase.from('food_cache').upsert({
        id: canonicalKey,  // Use 'id' as PK (matches schema)
        name: result.name,
        brand: q.brand || null,
        serving_size: result.serving_label,
        grams_per_serving: result.grams_per_serving,
        macros: result.macros,
        micros: { fiber_g: result.macros.fiber_g || 0 },
        country_code: q.country?.toUpperCase() || null,
        source_db: 'gemini',
        confidence: result.confidence,
        last_accessed: new Date().toISOString(),
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
      }, {
        onConflict: 'id'
      });

      if (upsertError) {
        console.warn('[geminiCache] DB cache write failed (non-blocking):', upsertError);
      } else {
        console.log(`[geminiCache] ✅ Cached to database: ${canonicalKey}`);
      }
    }

    // ✅ Step 5: Populate in-memory cache
    cache.set(key, {
      result,
      expires: Date.now() + 24 * 60 * 60 * 1000
    });

    console.log(`[macroLookup.trace] cache=miss key=${key} (will cache to DB)`);
    return result;

  } catch (err) {
    console.error('[geminiCache] Exception:', err);
    console.error('[geminiCache] Exception details:', {
      error: err,
      query: q,
      stack: err instanceof Error ? err.stack : undefined,
      timestamp: new Date().toISOString()
    });
    return null;
  }
}

