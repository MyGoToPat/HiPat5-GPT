/**
 * CLARIFICATION LAYER
 * Pat's personality engages BEFORE technical pipeline to clarify ambiguous food items
 * 
 * This ensures Pat asks conversational questions like "Are you asking about McDonald's McChicken sandwich?"
 * instead of showing technical warnings or failing silently.
 */

import { getSupabase } from '../../lib/supabase';
import { loadUserContext } from '../personality/patSystem';
import { buildHistoryContext } from '../../lib/chatHistoryContext';

export interface ClarificationResult {
  needsClarification: boolean;
  clarificationQuestion?: string;
  clarifiedMessage?: string; // User's message after clarification
  confidence: number; // 0-1, higher = more confident we understand the request
}

/**
 * Clarification state stored in-memory (sessionId → state)
 * Cleared automatically after verify payload emission or timeout
 */
interface ClarificationState {
  originalMessage: string;
  originalIntent: 'food_question' | 'meal_logging';
  clarificationQuestion: string;
  timestamp: number;
}

const clarificationStateMap = new Map<string, ClarificationState>();

// Auto-cleanup: clear states older than 5 minutes
setInterval(() => {
  const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
  for (const [sessionId, state] of clarificationStateMap.entries()) {
    if (state.timestamp < fiveMinutesAgo) {
      clarificationStateMap.delete(sessionId);
      console.log(`[clarification] Auto-cleared stale state for session: ${sessionId}`);
    }
  }
}, 60 * 1000); // Check every minute

/**
 * Store clarification state for a session
 */
export function storeClarificationState(
  sessionId: string,
  originalMessage: string,
  originalIntent: 'food_question' | 'meal_logging',
  clarificationQuestion: string
): void {
  clarificationStateMap.set(sessionId, {
    originalMessage,
    originalIntent,
    clarificationQuestion,
    timestamp: Date.now()
  });
  console.log(`[clarification] Stored state for session: ${sessionId}`);
}

/**
 * Get clarification state for a session
 */
export function getClarificationState(sessionId: string): ClarificationState | null {
  return clarificationStateMap.get(sessionId) || null;
}

/**
 * Clear clarification state for a session
 */
export function clearClarificationState(sessionId: string): void {
  if (clarificationStateMap.delete(sessionId)) {
    console.log(`[clarification] Cleared state for session: ${sessionId}`);
  }
}

/**
 * Merge original message with user's clarification response
 * Uses LLM to intelligently merge brand specificity
 * Handles one-shot brand inference (e.g., "yes" to "Are the nuggets and fries from McDonald's too?")
 */
export async function mergeClarificationResponse(
  originalMessage: string,
  clarificationQuestion: string,
  userResponse: string,
  userId: string
): Promise<string> {
  try {
    const supabase = getSupabase();
    
    // Detect if this is a one-shot brand inference question
    const isBrandInference = /\b(looks?\s+like|are\s+the|from\s+.*\s+too)\b/i.test(clarificationQuestion);
    
    // Simple merge prompt - if user confirms, merge brand info into original
    const mergePrompt = `You are helping merge a meal logging request with clarification.

Original message: "${originalMessage}"
Clarification asked: "${clarificationQuestion}"
User's response: "${userResponse}"

${isBrandInference ? `
This is a brand inference question. If the user confirmed (e.g., "yes", "correct", "that's right", "yep"), 
add the brand name (McDonald's) to ALL ambiguous items in the original message that don't already have a brand.
` : `
If the user confirmed (e.g., "yes", "correct", "that's right"), merge the clarification details into the original message.
If the user provided new details, incorporate them.
`}

Return ONLY the merged message, no explanation.

Examples:
- Original: "I ate a big mac, 10pc nuggets, large fries"
- Clarification: "Looks like McDonald's. Are the nuggets and fries from McDonald's too?"
- User: "Yes"
- Merged: "I ate a McDonald's Big Mac, 10pc McDonald's Chicken McNuggets, McDonald's large fries"

- Original: "I ate a big mac"
- Clarification: "Are you asking about McDonald's Big Mac?"
- User: "Yes"
- Merged: "I ate a McDonald's Big Mac"

Return the merged message:`;

    const { data, error } = await supabase.functions.invoke('openai-chat', {
      body: {
        messages: [
          { role: 'system', content: mergePrompt },
          { role: 'user', content: userResponse }
        ],
        stream: false,
        userId,
        temperature: 0.2,
        model: 'gpt-4o-mini',
        provider: 'openai'
      }
    });

    if (error || !data?.message) {
      console.warn('[clarification] Merge failed, using original message:', error);
      return originalMessage;
    }

    let merged = data.message.trim();
    // Strip surrounding quotes if LLM wrapped the entire response
    if ((merged.startsWith('"') && merged.endsWith('"')) ||
        (merged.startsWith("'") && merged.endsWith("'"))) {
      merged = merged.slice(1, -1);
    }
    console.log(`[clarification] Merged message: "${originalMessage}" + "${userResponse}" → "${merged}"`);
    return merged;
  } catch (e) {
    console.error('[clarification] Exception in merge:', e);
    return originalMessage;
  }
}

/**
 * Pre-check for branded/fast-food items that need brand clarification
 * Returns early if a branded item pattern is detected without brand context
 * Includes one-shot brand inference (if Big Mac present, infer McDonald's for nuggets/fries)
 */
function detectBrandedItemsNeedingClarification(message: string): string | null {
  const lower = message.toLowerCase();
  
  // Check if message contains brand context (McDonald's, Burger King, etc.)
  const hasBrandContext = /\b(mcdonald'?s?|burger\s+king|bk|wendy'?s?|taco\s+bell|kfc|subway|starbucks|chick[-\s]?fil[-\s]?a|popeyes|dairy\s+queen|a&w|five\s+guys|harveys|tim\s+hortons)\b/i.test(lower);
  
  // If brand context already present, no clarification needed
  if (hasBrandContext) {
    return null;
  }
  
  // Brand anchors: unique items that indicate a specific brand
  const brandAnchors = {
    mcdonalds: /\b(big\s+mac|quarter\s+pounder|mcflurry|mcrib|mcmuffin)\b/i,
    burgerking: /\b(whopper|royal|whopper\s+junior)\b/i,
    kfc: /\b(original\s+recipe|extra\s+crispy|famous\s+bowl)\b/i,
    subway: /\b(footlong|six\s+inch|subway\s+sandwich)\b/i,
    starbucks: /\b(venti|grande|tall|frappuccino|pumpkin\s+spice)\b/i,
    popeyes: /\b(popeyes|spicy\s+chicken|biscuit)\b/i
  };
  
  // Detect ambiguous branded items (without brand context)
  const ambiguousItems: { pattern: RegExp; name: string; brand?: string }[] = [];
  
  // McDonald's items
  if (/\b(mcnuggets?|chicken\s+mcnuggets?|10[-\s]?pc|10[-\s]?piece|10\s*pc|10\s*pcs|nuggets?)\b/i.test(lower)) {
    ambiguousItems.push({ pattern: /\b(mcnuggets?|chicken\s+mcnuggets?|10[-\s]?pc|10[-\s]?piece|10\s*pc|10\s*pcs|nuggets?)\b/i, name: 'nuggets', brand: 'mcdonalds' });
  }
  
  if (/\b(large\s+fries|lrg\s+fries|lg\s+fries|fries|french\s+fries)\b/i.test(lower)) {
    ambiguousItems.push({ pattern: /\b(large\s+fries|lrg\s+fries|lg\s+fries|fries|french\s+fries)\b/i, name: 'fries', brand: 'mcdonalds' });
  }
  
  if (/\b(mcchicken|mcchicken\s+sandwich)\b/i.test(lower)) {
    ambiguousItems.push({ pattern: /\b(mcchicken|mcchicken\s+sandwich)\b/i, name: 'mcchicken', brand: 'mcdonalds' });
  }
  
  if (/\b(mcdouble|double\s+cheeseburger)\b/i.test(lower)) {
    ambiguousItems.push({ pattern: /\b(mcdouble|double\s+cheeseburger)\b/i, name: 'mcdouble', brand: 'mcdonalds' });
  }
  
  if (/\b(happy\s+meal|combo|meal)\b/i.test(lower)) {
    ambiguousItems.push({ pattern: /\b(happy\s+meal|combo|meal)\b/i, name: 'combo/meal', brand: 'mcdonalds' });
  }
  
  // If no ambiguous items found, no clarification needed
  if (ambiguousItems.length === 0) {
    return null;
  }
  
  // ONE-SHOT BRAND INFERENCE: If Big Mac or other McDonald's anchor is present,
  // infer that ambiguous items are also McDonald's and ask single confirmation
  if (brandAnchors.mcdonalds.test(lower)) {
    const itemNames = ambiguousItems.map(item => item.name).join(' and ');
    return `Looks like McDonald's. Are the ${itemNames} from McDonald's too?`;
  }
  
  // If multiple ambiguous items but no brand anchor, ask generic clarification
  if (ambiguousItems.length > 1) {
    const itemNames = ambiguousItems.map(item => item.name).join(', ');
    return `Are those ${itemNames} from McDonald's, or from another restaurant?`;
  }
  
  // Single ambiguous item - ask specific question
  const item = ambiguousItems[0];
  if (item.name === 'nuggets') {
    return "Are those McDonald's Chicken McNuggets?";
  } else if (item.name === 'fries') {
    return "Are those McDonald's large fries, or from another restaurant?";
  } else if (item.name === 'mcchicken') {
    return "Are you asking about McDonald's McChicken sandwich?";
  } else if (item.name === 'mcdouble') {
    return "Are you asking about McDonald's McDouble?";
  } else if (item.name === 'combo/meal') {
    return "Are you asking about a McDonald's combo meal?";
  }
  
  return null;
}

/**
 * Check if a food-related message needs clarification BEFORE processing
 * Uses Pat's personality to generate conversational clarification questions
 */
export async function checkNeedsClarification(
  message: string,
  userId: string,
  sessionId: string,
  intent: 'food_question' | 'meal_logging'
): Promise<ClarificationResult> {
  try {
    console.log('[clarification] Checking if clarification needed for:', message);

    // STEP 1: Pre-check for branded items without brand context (deterministic)
    const brandedQuestion = detectBrandedItemsNeedingClarification(message);
    if (brandedQuestion) {
      console.log('[clarification] Pre-check detected branded item, returning clarification question');
      // CRITICAL: Return needsClarification: true to gate verify card
      return {
        needsClarification: true,
        clarificationQuestion: brandedQuestion,
        confidence: 0.85, // High confidence that clarification is needed
        reasoning: 'Branded fast-food item detected without brand context'
      };
    }

    // Build Pat's personality prompt with user context
    const userContext = await loadUserContext(userId);
    const historyCtx = await buildHistoryContext(userId, sessionId);
    
    const supabase = getSupabase();
    
    // Load master personality from database
    const { data: personalityData } = await supabase
      .from('personality_config')
      .select('prompt')
      .eq('name', 'master')
      .eq('is_active', true)
      .single();

    const personalityPrompt = personalityData?.prompt || 
      `You are Pat, the user's Hyper Intelligent Personal Assistant Team. 
You are conversational, precise, and helpful. You ask clarifying questions when needed.`;

    // Build clarification detection prompt
    const clarificationPrompt = `${personalityPrompt}

## USER CONTEXT
${userContext.firstName ? `User's name: ${userContext.firstName}` : ''}
${historyCtx ? `\n${historyCtx}` : ''}

## TASK
Review the user's food-related message and determine if clarification is needed.

**Signs that clarification IS needed:**
- Branded/fast food items without clear brand context:
  - "chicken mcnuggets" or "mcnuggets" or "10pc nuggets" → MUST ask "Are those McDonald's Chicken McNuggets?"
  - "large fries" or "lg fries" or "fries" → MUST ask "Are those McDonald's large fries, or from another restaurant?"
  - "nuggets" without brand → MUST ask for brand clarification
  - "MCChicken" without "McDonald's" → MUST ask "Are you asking about McDonald's McChicken sandwich?"
  - "combo" or "meal" without brand → MUST ask for brand clarification
- Ambiguous food names (e.g., "milk" without type, "bread" without kind)
- Portion sizes unclear (e.g., "a bowl" without knowing bowl size)
- Mixed dishes without details (e.g., "sandwich" without knowing what's in it)

**CRITICAL: If you see "mcnuggets", "nuggets", "fries", "large fries", "lg fries", "10pc", "combo", or "meal" without brand context, 
you MUST return needsClarification: true and ask a brand clarification question.**

**Signs that clarification is NOT needed:**
- Clear, specific foods WITH brand context (e.g., "McDonald's Big Mac", "Starbucks grande latte")
- Clear, specific whole foods (e.g., "3 large eggs", "1 cup cooked oatmeal", "10 oz ribeye steak")
- Foods that are uniquely branded (e.g., "Big Mac" is uniquely McDonald's, so no clarification needed)

**If clarification is needed:**
- Ask ONE clear, conversational question
- Be specific and helpful
- Use natural language (e.g., "Are you asking about McDonald's McChicken sandwich?")

**If clarification is NOT needed:**
- Return confidence: 0.9 or higher
- Return needsClarification: false

Respond in JSON only:
{
  "needsClarification": boolean,
  "clarificationQuestion": string | null,
  "confidence": number (0-1),
  "reasoning": string (brief explanation)
}

User message: "${message}"
Intent: ${intent}`;

    // Call LLM to assess if clarification is needed
    const { data, error } = await supabase.functions.invoke('openai-chat', {
      body: {
        messages: [
          { role: 'system', content: clarificationPrompt },
          { role: 'user', content: message }
        ],
        stream: false,
        userId,
        temperature: 0.3, // Lower temperature for more consistent assessment
        model: 'gpt-4o-mini',
        provider: 'openai'
      }
    });

    if (error || !data?.message) {
      console.warn('[clarification] LLM call failed, proceeding without clarification:', error);
      return { needsClarification: false, confidence: 0.7 };
    }

    // Parse JSON response
    let result: any;
    try {
      const jsonText = data.message.trim()
        .replace(/^```json\s*/i, '')
        .replace(/\s*```$/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '');
      result = JSON.parse(jsonText);
    } catch (e) {
      console.warn('[clarification] Failed to parse JSON response, proceeding without clarification:', e);
      return { needsClarification: false, confidence: 0.7 };
    }

    console.log('[clarification] Result:', result);

    return {
      needsClarification: result.needsClarification === true,
      clarificationQuestion: result.clarificationQuestion || undefined,
      confidence: result.confidence ?? 0.7
    };

  } catch (e) {
    console.error('[clarification] Exception in clarification check:', e);
    // On error, proceed without clarification (fail gracefully)
    return { needsClarification: false, confidence: 0.7 };
  }
}

