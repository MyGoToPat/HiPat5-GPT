/**
 * PERSONALITY ROUTER AGENT
 * Pat's intelligent routing system that decides AMA vs Role and model selection
 */

import { getSupabase } from '../../lib/supabase';

export type RouterDecision = {
  intent: "ama" | "tmwya" | "workout" | "camera";
  route_to: "ama" | "tmwya" | "workout" | "camera";
  use_gemini: boolean;
  reason: "database_can_answer" | "requires_web_search" | "requires_visual" | "conversational" | "role_task";
  needs_clarification: boolean;
  clarifier: string | null;
  confidence: number;
};

const SYSTEM_PROMPT = [
  "You are PERSONALITY_ROUTER for Pat.",
  "Decide AMA vs role and whether Gemini is required.",
  "Return STRICT JSON. No prose.",
  "Schema: { intent, route_to, use_gemini, reason, needs_clarification, clarifier, confidence }"
].join("\n");

function tryParse<T>(s: string): T | null {
  try {
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
}

const INTENT_ALIASES: Record<string, string> = {
  'AMA': 'ama',
  'log_meal': 'meal_logging',
  'food_log': 'meal_logging',
  'ask_me_anything': 'ama',
  'food_question': 'meal_logging', // nutrition questions should route to TMWYA
};

export function normalizeIntent(intent: string): string {
  return INTENT_ALIASES[intent] || intent;
}

function stripMarkdownJSON(raw: string): string {
  if (!raw) return raw;
  let s = raw.trim();
  
  // Remove markdown code fences
  s = s.replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
  s = s.replace(/^```\s*/i, '').replace(/\s*```$/i, '');
  
  // Extract JSON object if wrapped in text
  const jsonMatch = s.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    s = jsonMatch[0];
  }
  
  return s.trim();
}

/**
 * Run Pat's personality router to get intelligent routing decision
 * Uses OpenAI gpt-4o-mini (cheap, deterministic) - NOT Gemini to avoid circular choice
 */
export async function runPersonalityRouter(userText: string): Promise<RouterDecision | null> {
  if (!userText || !userText.trim()) {
    console.warn('[router] Empty user text');
    return null;
  }

  const messages = [
    { role: "system" as const, content: SYSTEM_PROMPT },
    { role: "user" as const, content: userText.trim() }
  ];

  try {
    const supabase = getSupabase();
    
    // Use OpenAI for router (cheap, deterministic) - NOT Gemini to avoid circular choice
    const { data, error } = await supabase.functions.invoke("openai-chat", {
      body: {
        messages,
        temperature: 0.1, // Low temperature for deterministic routing
        model: "gpt-4o-mini",
        provider: "openai"
      }
    });

    if (error || !data?.message) {
      console.warn("[router] openai-chat error", error);
      return null;
    }

    const raw = String(data.message).trim();
    const cleaned = stripMarkdownJSON(raw);
    const json = tryParse<RouterDecision>(cleaned);

    if (!json) {
      console.warn("[router] invalid JSON", raw);
      return null;
    }

    // Validate required fields
    if (typeof json.confidence !== "number" || json.confidence < 0 || json.confidence > 1) {
      console.warn("[router] bad confidence", json);
      return null;
    }

    // Normalize intents before validation
    json.intent = normalizeIntent(json.intent) as any;
    json.route_to = normalizeIntent(json.route_to) as any;

    if (!["ama", "tmwya", "workout", "camera", "meal_logging"].includes(json.intent)) {
      console.warn("[router] invalid intent after normalization", json.intent);
      return null;
    }

    if (!["ama", "tmwya", "workout", "camera", "meal_logging"].includes(json.route_to)) {
      console.warn("[router] invalid route_to after normalization", json.route_to);
      return null;
    }

    if (typeof json.use_gemini !== "boolean") {
      console.warn("[router] invalid use_gemini", json.use_gemini);
      return null;
    }

    console.info("[router] decision", json);
    return json;
  } catch (e) {
    console.error("[router] Exception", e);
    return null;
  }
}

