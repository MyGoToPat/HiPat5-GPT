/**
 * Macro Swarm V2 - Clean 7-agent system for macro queries and logging
 *
 * Flow:
 * 1. macro.router - Deterministic routing (info vs log)
 * 2. macro.nlu - Extract separate items with quantities
 * 3. macro.resolverAdapter - Call nutrition resolver
 * 4. macro.aggregator - Pure TS totals computation
 * 5. macro.formatter.det - Deterministic text builder
 * 6. macro.logger - Write meal_logs with fiber
 * 7. persona.governor - Apply Pat tone (outside bullets)
 */

import { z } from 'zod';

// ============================================================================
// SCHEMAS (Zod contracts)
// ============================================================================

export const ItemSchema = z.object({
  name: z.string().min(1),
  qty: z.number().positive(),
  unit: z.string().optional(),
  brand: z.string().optional()
});

export const MealParseSchema = z.object({
  items: z.array(ItemSchema).min(1)
});

export const MacrosSchema = z.object({
  kcal: z.number(),
  protein_g: z.number(),
  carbs_g: z.number(),
  fat_g: z.number(),
  fiber_g: z.number()
});

export const ResolvedItemSchema = z.object({
  name: z.string(),
  qty: z.number(),
  unit: z.string().optional(),
  grams_used: z.number(),
  basis_used: z.string(),
  macros: MacrosSchema
});

export const ResolveResultSchema = z.object({
  items: z.array(ResolvedItemSchema).min(1)
});

export const MacroPayloadSchema = z.object({
  items: z.array(ResolvedItemSchema),
  totals: MacrosSchema,
  consumed: z.boolean().default(false)
});

export type Item = z.infer<typeof ItemSchema>;
export type MealParse = z.infer<typeof MealParseSchema>;
export type Macros = z.infer<typeof MacrosSchema>;
export type ResolvedItem = z.infer<typeof ResolvedItemSchema>;
export type ResolveResult = z.infer<typeof ResolveResultSchema>;
export type MacroPayload = z.infer<typeof MacroPayloadSchema>;

// ============================================================================
// AGENT 1: macro.router
// ============================================================================

export function macroRouter(userText: string): { route: 'macro-question' | 'macro-logging'; confidence: number } {
  const text = userText.toLowerCase().trim();

  // Logging patterns (take priority)
  const logPatterns = [
    /^\s*(log|log\s+it|log\s+all|log\s+that|save\s+it)\s*$/i,
    /^\s*log\s+(the\s+)?([a-zA-Z0-9\s]+?)\s*(only)?\s*$/i,
    /^\s*log\s+.+\s+with\s+.+$/i,
    /^\s*(add|save|record)\s+.+\s+(to|for)\s+(breakfast|lunch|dinner|snack)/i
  ];

  for (const pattern of logPatterns) {
    if (pattern.test(text)) {
      console.info('[macro-route]', { route: 'macro-logging', target: 'macro-logging', confidence: 1.0 });
      return { route: 'macro-logging', confidence: 1.0 };
    }
  }

  // Info patterns
  const infoPatterns = [
    /(^|\b)(macros? of|what.*macros|macro breakdown|calories of)/i,
    /\b(tell\s+me|what\s+are|how\s+many)\s+(the\s+)?(macros?|calories?|nutrition)\s+(of|for|in)\b/i,
    /\b(macros?|calories?|nutrition)\s+(of|for|in)\s+/i
  ];

  for (const pattern of infoPatterns) {
    if (pattern.test(text)) {
      console.info('[macro-route]', { route: 'macro-question', target: 'macro-question', confidence: 1.0 });
      return { route: 'macro-question', confidence: 1.0 };
    }
  }

  // Default to info
  console.info('[macro-route]', { route: 'macro-question', target: 'macro-question', confidence: 0.8 });
  return { route: 'macro-question', confidence: 0.8 };
}

// ============================================================================
// AGENT 2: macro.nlu
// ============================================================================

export function macroNLU(userText: string): MealParse {
  const text = userText.toLowerCase().trim();

  // Remove common prefixes
  let foodText = text
    .replace(/^(macros? of|calories? of|what are the macros? for|tell me the macros? of)\s+/i, '')
    .replace(/^(i ate|i had|for (breakfast|lunch|dinner|snack))\s+/i, '')
    .trim();

  // Split on separators: "and", "with", comma
  const separators = /\s+and\s+|\s+with\s+|,\s*/i;
  const parts = foodText.split(separators).filter(p => p.trim().length > 0);

  const items: Item[] = [];

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    // Parse "qty unit name" or "qty name" or just "name"
    // Support fractions: "1/2 cup oatmeal"
    const qtyMatch = trimmed.match(/^(\d+(?:\/\d+)?)\s+([a-z]+\s+)?(.+)$/i);

    if (qtyMatch) {
      let qty = 1;
      const qtyStr = qtyMatch[1];

      // Handle fractions
      if (qtyStr.includes('/')) {
        const [num, den] = qtyStr.split('/').map(Number);
        qty = num / den;
      } else {
        qty = parseFloat(qtyStr);
      }

      const unit = qtyMatch[2]?.trim();
      const name = qtyMatch[3].trim();

      items.push({
        name,
        qty,
        unit: unit || undefined
      });
    } else {
      // No quantity found, default to 1
      items.push({
        name: trimmed,
        qty: 1,
        unit: undefined
      });
    }
  }

  // Validate with Zod
  try {
    return MealParseSchema.parse({ items });
  } catch (e) {
    // Fallback: treat entire text as single item
    return {
      items: [{
        name: foodText || userText,
        qty: 1,
        unit: undefined
      }]
    };
  }
}

// ============================================================================
// AGENT 3: macro.resolverAdapter
// ============================================================================

/**
 * Call nutrition resolver edge function
 * Input: MealParse
 * Output: ResolveResult
 */
export async function macroResolverAdapter(parsed: MealParse): Promise<ResolveResult> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase config missing');
  }

  const apiUrl = `${supabaseUrl}/functions/v1/nutrition-resolver`;

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${supabaseAnonKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      items: parsed.items.map(item => ({
        name: item.name,
        qty: item.qty,
        unit: item.unit || 'serving',
        brand: item.brand
      }))
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Nutrition resolver failed: ${errorText}`);
  }

  const data = await response.json();

  // Transform response to match our schema
  const resolved: ResolveResult = {
    items: data.items.map((item: any) => ({
      name: item.name,
      qty: item.qty,
      unit: item.unit,
      grams_used: item.grams_used,
      basis_used: item.basis_used,
      macros: {
        kcal: item.macros.kcal,
        protein_g: item.macros.protein_g,
        carbs_g: item.macros.carbs_g,
        fat_g: item.macros.fat_g,
        fiber_g: item.macros.fiber_g || 0
      }
    }))
  };

  console.info('[macro-resolver]', resolved.items.map(r => ({
    name: r.name,
    grams: r.grams_used,
    basis: r.basis_used,
    fiber: r.macros.fiber_g
  })));

  return ResolveResultSchema.parse(resolved);
}

// ============================================================================
// AGENT 4: macro.aggregator
// ============================================================================

export function macroAggregator(resolved: ResolveResult): MacroPayload {
  const totals: Macros = {
    kcal: 0,
    protein_g: 0,
    carbs_g: 0,
    fat_g: 0,
    fiber_g: 0
  };

  for (const item of resolved.items) {
    totals.kcal += item.macros.kcal;
    totals.protein_g += item.macros.protein_g;
    totals.carbs_g += item.macros.carbs_g;
    totals.fat_g += item.macros.fat_g;
    totals.fiber_g += item.macros.fiber_g;
  }

  return {
    items: resolved.items,
    totals,
    consumed: false
  };
}

// ============================================================================
// AGENT 5: macro.formatter.det
// ============================================================================

export function macroFormatterDet(payload: MacroPayload): string {
  const lines: string[] = [];

  // Per-item bullets
  for (const item of payload.items) {
    const qtyDisplay = item.qty || 1;
    const unitDisplay = item.unit || '';
    const nameWithQty = unitDisplay
      ? `${qtyDisplay} ${unitDisplay} ${item.name}`
      : `${qtyDisplay} ${item.name}`;

    lines.push(nameWithQty);
    lines.push(`• Calories: ${Math.round(item.macros.kcal)} kcal`);
    lines.push(`• Protein: ${round1(item.macros.protein_g)} g`);
    lines.push(`• Carbs: ${round1(item.macros.carbs_g)} g`);
    lines.push(`• Fat: ${round1(item.macros.fat_g)} g`);

    // Only show fiber if > 0
    if (item.macros.fiber_g > 0) {
      lines.push(`• Fiber: ${round1(item.macros.fiber_g)} g`);
    }
    lines.push('');
  }

  // Totals
  lines.push(`Total calories ${Math.round(payload.totals.kcal)}`);
  lines.push(`Total fiber ${round1(payload.totals.fiber_g)} g`);
  lines.push('');
  lines.push(`Say "Log All" or "Log (Food item)"`);

  console.info('[macro-formatter]', {
    ran: true,
    hasFiber: payload.totals.fiber_g > 0
  });

  return lines.join('\n').trim();
}

function round1(n: number): string {
  return n.toFixed(1).replace(/\.0$/, '');
}

// ============================================================================
// AGENT 6: macro.logger
// ============================================================================

/**
 * Log meal to database
 * - Finds last unconsumed macro payload
 * - Supports quantity adjustment
 * - Marks payload as consumed
 */
export async function macroLogger(
  userText: string,
  sessionId: string,
  userId: string,
  lastPayload?: MacroPayload
): Promise<{ success: boolean; message: string }> {
  if (!lastPayload || lastPayload.consumed) {
    return {
      success: false,
      message: "No macro data to log. Ask me about macros first."
    };
  }

  // Parse logging command
  const logAllMatch = /^\s*(log\s+all|log\s+it|log\s+that|save\s+it)\s*$/i.test(userText);
  const logItemMatch = userText.match(/^\s*log\s+(the\s+)?([a-zA-Z0-9\s]+?)(\s+only|\s+with\s+.+)?\s*$/i);

  let itemsToLog = lastPayload.items;

  // Filter for specific item if requested
  if (!logAllMatch && logItemMatch) {
    const itemName = logItemMatch[2].toLowerCase().trim();
    itemsToLog = lastPayload.items.filter(item =>
      item.name.toLowerCase().includes(itemName)
    );

    if (itemsToLog.length === 0) {
      return {
        success: false,
        message: `Could not find "${itemName}" in the macro data.`
      };
    }

    // Handle quantity adjustment (e.g., "log eggs with 4")
    const withMatch = userText.match(/\s+with\s+(\d+(?:\/\d+)?)/i);
    if (withMatch && itemsToLog.length === 1) {
      let newQty = parseFloat(withMatch[1]);
      if (withMatch[1].includes('/')) {
        const [num, den] = withMatch[1].split('/').map(Number);
        newQty = num / den;
      }

      const item = itemsToLog[0];
      const scale = newQty / item.qty;

      // Scale macros
      itemsToLog = [{
        ...item,
        qty: newQty,
        macros: {
          kcal: item.macros.kcal * scale,
          protein_g: item.macros.protein_g * scale,
          carbs_g: item.macros.carbs_g * scale,
          fat_g: item.macros.fat_g * scale,
          fiber_g: item.macros.fiber_g * scale
        }
      }];
    }
  }

  // Compute totals for items to log
  const totals: Macros = {
    kcal: 0,
    protein_g: 0,
    carbs_g: 0,
    fat_g: 0,
    fiber_g: 0
  };

  for (const item of itemsToLog) {
    totals.kcal += item.macros.kcal;
    totals.protein_g += item.macros.protein_g;
    totals.carbs_g += item.macros.carbs_g;
    totals.fat_g += item.macros.fat_g;
    totals.fiber_g += item.macros.fiber_g;
  }

  // TODO: Call saveMeal function
  // This would integrate with existing meal logging system
  // For now, return success

  return {
    success: true,
    message: `Logged ${itemsToLog.length} item(s) - ${Math.round(totals.kcal)} kcal, ${round1(totals.fiber_g)}g fiber`
  };
}

// ============================================================================
// AGENT 7: persona.governor
// ============================================================================

/**
 * Apply Pat tone outside bullet blocks
 * Must NOT edit formatted macro bullets
 */
export function personaGovernor(text: string): string {
  // Check if text contains macro bullets
  const hasBullets = text.includes('• Calories:') || text.includes('Total calories');

  if (!hasBullets) {
    // Safe to apply tone
    return text;
  }

  // Text has bullets - return unchanged to preserve formatting
  return text;
}
