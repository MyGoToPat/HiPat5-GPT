/**
 * UNIFIED NUTRITION PIPELINE
 * Handles both "tell me macros" (info-only) and "I ate" (with logging) flows
 * Replaces separate TMWYA and MACRO swarms with one consistent experience
 */

import { portionResolver } from '../../agents/shared/nutrition/portionResolver';
import { computeTEF } from '../../agents/tmwya/tef';
import { computeTDEE } from '../../agents/tmwya/tdee';
import { getSupabase } from '../../lib/supabase';
import { getLatestPromptOrFallback } from '../../lib/admin/prompts';
import { sanitizeNormalizedItems } from './sanitizeNormalizedItems';
import { PROVIDERS, type ProviderKey } from '../../agents/shared/nutrition/providers';

// Emergency Gemini kill-switch
const GEMINI_ENABLED = import.meta.env.VITE_GEMINI_NUTRITION !== 'false';

export interface NutritionPipelineOptions {
  message: string;
  userId: string;
  sessionId: string;
  /**
   * Controls UX behavior:
   * - true: Show Log/Edit/Cancel buttons (for "I ate..." flows)
   * - false: Info-only, no log button (for "what are macros of..." queries)
   */
  showLogButton?: boolean;
}

export interface NutritionPipelineResult {
  success: boolean;
  roleData?: {
    type: 'tmwya.verify';
    view: any;
    items: any[];
    totals: any;
    tef: any;
    tdee: any;
    skills_fired?: string[];
  };
  error?: string;
}

/**
 * Strip markdown code fences and preambles from JSON responses
 */
function stripMarkdownJSON(raw: string): string {
  if (!raw) return raw;
  let s = raw.trim();

  // ✅ Remove "Action completed" or similar prefixes
  s = s.replace(/^Action completed\s*[:\-]?\s*/i, '');
  s = s.replace(/^Here.*?JSON:\s*/i, '');
  s = s.replace(/^The.*?result:\s*/i, '');
  s = s.replace(/^Output:\s*/i, '');

  // ✅ Remove markdown code fences
  s = s.replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
  s = s.replace(/^```\s*/i, '').replace(/\s*```$/i, '');

  // ✅ Extract JSON object if wrapped in text
  const jsonMatch = s.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    s = jsonMatch[0];
  }

  return s.trim();
}

/**
 * Safe JSON parsing with repair attempts
 */
function safeJsonParse(text: string) {
  const stripFences = (s: string) => s.replace(/```json|```/gi, '');
  const t = stripFences(text).trim();

  try {
    return JSON.parse(t);
  } catch {}

  // Minimal repair: quote keys, remove trailing commas
  const repaired = t
    .replace(/([{,]\s*)([A-Za-z0-9_]+)\s*:/g, '$1"$2":')  // Quote unquoted keys
    .replace(/,(\s*[}\]])/g, '$1');                       // Remove trailing commas

  try {
    return JSON.parse(repaired);
  } catch {
    return null;
  }
}

/**
 * Infer meal_slot from current time
 */
function inferMealSlotFromTime(): 'breakfast' | 'lunch' | 'dinner' | 'snack' {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 11) return 'breakfast';
  if (hour >= 11 && hour < 16) return 'lunch';
  if (hour >= 16 && hour < 22) return 'dinner';
  return 'snack';
}

/**
 * OpenAI nutrition provider - fallback when Gemini is disabled
 */
async function lookupOpenAI(normalized: any, userId?: string) {
  try {
    const supabase = getSupabase();
    const prompt = `You are a nutrition expert. Given this food item, return exact nutritional data in this JSON format only:
{"calories": number, "protein_g": number, "carbs_g": number, "fat_g": number, "fiber_g": number}

Food: ${normalized.name}${normalized.brand ? ` (${normalized.brand})` : ''}${normalized.serving_label ? ` - ${normalized.serving_label}` : ''}${normalized.size_label ? ` ${normalized.size_label}` : ''}

Return only the JSON object, no other text.`;

    const { data, error } = await supabase.functions.invoke('openai-chat', {
      body: {
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: normalized.name }
        ],
        temperature: 0.1,
        model: 'gpt-4o-mini'
      }
    });

    if (error || !data?.message) {
      console.warn('[openai-nutrition] OpenAI call failed:', error);
      return null;
    }

    // Try multiple response shape possibilities
    let responseText = data.choices?.[0]?.message?.content || data.message || '';
    if (!responseText) return null;

    // Use safe JSON parsing
    const parsed = safeJsonParse(responseText);
    if (!parsed) return null;

    return {
      name: normalized.name,
      serving_label: normalized.serving_label || 'serving',
      grams_per_serving: 100,
      macros: {
        kcal: parsed.calories || 0,
        protein_g: parsed.protein_g || 0,
        carbs_g: parsed.carbs_g || 0,
        fat_g: parsed.fat_g || 0,
        fiber_g: parsed.fiber_g || 0
      },
      confidence: 0.8,
      source: 'openai-fallback',
      notes: 'Data provided by AI assistant'
    };
  } catch (e) {
    console.warn('[openai-nutrition] Exception:', e);
    return null;
  }
}

/**
 * Lookup macros in provider cascade: brand → gemini/openai → generic
 */
async function lookupMacrosInCascade(items: any[], userId?: string): Promise<any> {
  const results = [];
  const skillsFired: string[] = [];

  for (const item of items) {
    // Convert to normalized item format
    const normalized = {
      name: item.name,
      amount: item.quantity || 1,
      unit: item.unit,
      brand: item.brand,
      serving_label: item.serving_label,
      size_label: item.size_label,
      is_branded: !!item.brand
    };

    // ✅ Choose provider order based on brand status and Gemini availability
    // Branded: brand map → gemini/openai → generic
    // Whole foods: generic (USDA) → gemini/openai → openai (fallback)
    const ORDER: (ProviderKey | 'openai')[] = normalized.is_branded
      ? GEMINI_ENABLED ? ["brand", "gemini", "generic"] : ["brand", "openai", "generic"]  // Branded: brand map first
      : GEMINI_ENABLED ? ["generic", "gemini"] : ["generic", "openai"];                   // Whole foods: USDA first, then fallback

    let macroResult = null;
    let providerUsed = 'none';
    
    // ✅ Try each provider in order
    for (const key of ORDER) {
      let providerFn = null;

      if (key === 'openai') {
        providerFn = lookupOpenAI;
      } else {
        providerFn = PROVIDERS[key];
      }

      if (providerFn) {
        try {
          macroResult = await providerFn(normalized, userId);
          if (macroResult && macroResult.macros && macroResult.macros.kcal > 0) {
            providerUsed = key;
            skillsFired.push(`macro_lookup_${key}`); // Track skill usage
            console.log(`[nutrition] Provider ${key} found macros for "${item.name}"`);
            break;
          }
        } catch (err) {
          console.error(`[nutrition] Provider ${key} error for "${item.name}":`, err);
          continue;  // Try next provider
        }
      }
    }

    // ✅ Only use stub if ALL providers failed
    if (!macroResult || !macroResult.macros || macroResult.macros.kcal === 0) {
      console.warn(`[nutrition] All providers failed for "${item.name}", using stub`);
      macroResult = {
        name: item.name,
        serving_label: item.unit || 'serving',
        grams_per_serving: 100,
        macros: {
          kcal: 0,  // ✅ Show 0, not fake data
          protein_g: 0,
          carbs_g: 0,
          fat_g: 0,
          fiber_g: 0
        },
        confidence: 0.1,
        source: 'stub',
        notes: 'Unable to retrieve macro data. Please verify manually.'
      };
      providerUsed = 'stub';
    }

    // Add to results
    results.push({
      ...item,
      calories: macroResult.macros.kcal || 0,
      protein_g: macroResult.macros.protein_g || 0,
      carbs_g: macroResult.macros.carbs_g || 0,
      fat_g: macroResult.macros.fat_g || 0,
      fiber_g: macroResult.macros.fiber_g || 0,
      confidence: macroResult.confidence || 0.1,
      source: macroResult.source || 'unknown',
      provider: providerUsed
    });
  }

  // Calculate totals (ensure zeros are handled correctly)
  const totals = results.reduce((acc, item) => ({
    calories: acc.calories + (item.calories || 0),
    protein_g: acc.protein_g + (item.protein_g || 0),
    carbs_g: acc.carbs_g + (item.carbs_g || 0),
    fat_g: acc.fat_g + (item.fat_g || 0),
    fiber_g: acc.fiber_g + (item.fiber_g || 0)
  }), { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0 });

  return { 
    items: results, 
    totals,
    skills_fired: [...new Set(skillsFired)] // Unique skills
  };
}

/**
 * Main unified nutrition pipeline
 * Used by both "food_question" (info) and "meal_logging" (log) intents
 */
export async function processNutrition(options: NutritionPipelineOptions): Promise<NutritionPipelineResult> {
  const { message, userId, showLogButton = true } = options;
  const skillsFired: string[] = [];

  try {
    console.log('[nutrition] Processing:', { message, userId, showLogButton });

    // Step 1: Call normalizer LLM to parse meal text
    const supabase = getSupabase();
    const NORMALIZER_AGENT_KEY = 'tmwya-normalizer';
    const NORMALIZER_FALLBACK = `Normalize messy meal text into structured food items. Output JSON only.
Return: {"items":[{"name":"food","amount":number|null,"unit":"piece|cup|g|oz|etc"|null}]}
Rules:
- Split multiple foods by commas or "and"
- PRESERVE the user's exact food names verbatim (e.g., "skim milk" NOT "milk", "sourdough bread" NOT "bread")
- Infer common units when missing (eggs→piece, oatmeal→cup, milk→cup, bread→slice)
- Extract quantities when present
- Output valid JSON only, no markdown, no explanations`;

    const normalizerPrompt = await getLatestPromptOrFallback(NORMALIZER_AGENT_KEY, NORMALIZER_FALLBACK);
    console.info('[nutrition] normalizer prompt source:', normalizerPrompt.startsWith('Normalize messy') ? 'fallback' : 'db');

    const { data: normalizerResponse, error: normalizerError } = await supabase.functions.invoke('openai-chat', {
      body: {
        messages: [
          { role: 'system', content: normalizerPrompt },
          { role: 'user', content: message }
        ],
        stream: false,
        userId,
        temperature: 0.1,
        model: 'gpt-4o-mini',
        provider: 'openai',
        response_format: { type: 'json_object' }  // ✅ FORCE JSON MODE
      }
    });

    let parsedItems: Array<{ name: string; amount: number | null; unit: string | null }> = [];

    if (!normalizerError && normalizerResponse?.message) {
      // Try multiple response shape possibilities
      let responseText = normalizerResponse.choices?.[0]?.message?.content || normalizerResponse.message || '';
      const parsed = safeJsonParse(responseText);

      if (parsed && Array.isArray(parsed.items)) {
        parsedItems = parsed.items;
        console.log('[nutrition] Normalizer parsed items:', parsedItems);

        // Food search skill fired (meal parsing)
        if (parsedItems.length > 0) {
          skillsFired.push('food_search');
        }
      } else {
        console.warn('[nutrition] Normalizer returned invalid JSON, falling back to naive split');
        // Fixed naive split: don't break decimals (split on punctuation followed by space)
        parsedItems = message.split(/[.,]\s+| and | with | plus /i)
          .map(s => ({ name: s.trim(), amount: null as number | null, unit: null as string | null }))
          .filter(x => x.name.length > 0);
      }
    } else {
      console.warn('[nutrition] Normalizer LLM failed, falling back to naive split:', normalizerError);
      // Fixed naive split: don't break decimals (split on punctuation followed by space)
      parsedItems = message.split(/[.,]\s+| and | with | plus /i)
        .map(s => ({ name: s.trim(), amount: null as number | null, unit: null as string | null }))
        .filter(x => x.name.length > 0);
    }

    // Step 1.5: Sanitize normalized items (fix quantity/serving_label issues)
    // This handles "10-piece" → qty=1 serving="10-piece", "two 10-piece" → qty=2 serving="10-piece", etc.
    const sanitizedItems = sanitizeNormalizedItems(parsedItems, new Map());
    console.log('[nutrition] Sanitized items:', sanitizedItems);

    // Step 2: Convert sanitized items back to PortionedItem format for portionResolver
    const portionedItems = sanitizedItems.map(item => ({
      name: item.name,
      amount: item.amount,
      unit: item.unit,
      brand: item.brand,
      serving_label: item.serving_label,
      size_label: item.size_label,
      is_branded: item.is_branded
    }));

    // Step 3: Resolve portions and lookup macros
    const portioned = portionResolver(portionedItems);
    const macroResults = await lookupMacrosInCascade(portioned, userId);

    // Extract skills_fired from macro lookup
    const macroSkills = macroResults.skills_fired || [];
    skillsFired.push(...macroSkills);

    // Step 3: Compute TEF and TDEE
    const tef = computeTEF(macroResults.totals);
    const tdee = await computeTDEE(userId, macroResults.totals, tef, new Date().toISOString());

    console.log('[nutrition] Pipeline complete:', {
      items: macroResults.items.length,
      totals: macroResults.totals,
      tef: tef.kcal,
      tdee_remaining: tdee.remaining_kcal
    });

    // Step 4: Generate warnings for low-confidence or unknown items
    const warnings: Array<{ type: 'low_confidence' | 'missing_portion'; item?: string; message: string }> = [];

    macroResults.items.forEach((item: any) => {
      if (item.confidence < 0.7) {
        warnings.push({
          type: 'low_confidence',
          item: item.name,
          message: `Low confidence on "${item.name}" - please verify macros`
        });
      }
      // Flag items with zero macros (unknown foods)
      if (item.calories === 0 && item.protein_g === 0 && item.carbs_g === 0 && item.fat_g === 0) {
        warnings.push({
          type: 'missing_portion',
          item: item.name,
          message: `Unknown food "${item.name}" - please add quantity and unit`
        });
      }
    });

    // Step 5: Build verification view (ALWAYS use existing Verification Sheet schema)
    const verify = {
      rows: macroResults.items.map((i: any) => ({
        name: i.name,
        quantity: i.quantity ?? null,
        unit: i.unit ?? null,
        calories: i.calories ?? 0,
        protein_g: i.protein_g ?? 0,
        carbs_g: i.carbs_g ?? 0,
        fat_g: i.fat_g ?? 0,
        fiber_g: i.fiber_g ?? 0, // ALWAYS include fiber, even if 0
        editable: true
      })),
      totals: {
        ...macroResults.totals,
        fiber_g: macroResults.totals.fiber_g ?? 0 // Ensure fiber in totals
      },
      tef: { kcal: tef.kcal },
      tdee: {
        target_kcal: tdee.target_kcal,
        remaining_kcal: tdee.remaining_kcal,
        remaining_percentage: tdee.remaining_percentage
      },
      meal_slot: inferMealSlotFromTime(), // Time-based inference
      eaten_at: new Date().toISOString(),
      // Control button visibility based on showLogButton flag
      actions: showLogButton ? ['CONFIRM_LOG', 'EDIT_ITEMS', 'CANCEL'] : ['EDIT_ITEMS', 'CANCEL'],
      warnings
    };

    // Step 6: Return roleData in the shape ChatPat expects
    return {
      success: true,
      roleData: {
        type: 'tmwya.verify',
        view: verify,
        items: macroResults.items,
        totals: verify.totals,
        tef: verify.tef,
        tdee: verify.tdee,
        skills_fired: skillsFired  // ✅ Include skills_fired
      }
    };

  } catch (error: any) {
    console.error('[nutrition] Pipeline failed:', error);
    return {
      success: false,
      error: error?.message ?? 'Nutrition pipeline failed'
    };
  }
}

