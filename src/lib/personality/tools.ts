/* Unified tool invocation via absolute Supabase URLs with proper auth headers */

import { getSupabase } from '../supabase';
const BASE = import.meta.env.VITE_SUPABASE_URL;
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY;

async function buildAuthHeaders(): Promise<Record<string,string>> {
  const sb = getSupabase();
  const { data: { session } } = await sb.auth.getSession();
  const jwt = session?.access_token;
  return {
    'Content-Type': 'application/json',
    'apikey': ANON ?? '',
    'Authorization': `Bearer ${jwt ?? ANON}`, // prefer session, fall back to anon
  };
}

export async function invokeEdgeFunction(path: string, body: any) {
  const cleanPath = path.replace(/^\/+|functions\/v1\/+/g, '');
  const url = `${BASE}/functions/v1/${cleanPath}`;
  const headers = await buildAuthHeaders();

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body ?? {}),
  });

  const text = await res.text();
  let json: any = null;
  try { json = JSON.parse(text); } catch {}
  return {
    ok: res.ok,
    status: res.status,
    text,
    json,
  };
}

export async function callOpenAIChat(payload: any) {
  return invokeEdgeFunction("openai-chat", payload);
}

export async function callFoodMacros(params: { foodName: string }) {
  return invokeEdgeFunction("openai-food-macros", params);
}

export interface InvokeResult<T = any> {
  ok: boolean;
  result?: T;
  error?: string;
  status?: number;
}

export async function callEdgeTool(
  toolName: string,
  params: Record<string, any>
): Promise<InvokeResult> {
  if (toolName === "openai-food-macros") {
    return callFoodMacros({ foodName: params?.foodName });
  }
  return { ok: false, error: `Unknown tool: ${toolName}` };
}

// Re-export food macros helper with unified auth
export async function fetchFoodMacros(foodName: string): Promise<{ ok: boolean; macros?: any; error?: string }> {
  const result = await callFoodMacros({ foodName });
  
  if (result.ok && result.json) {
    // Handle different response formats from the Edge Function
    let macros: any = undefined;
    const data = result.json;
    
    if (data && typeof data === 'object') {
      // Check if data has macro properties directly
      if (typeof data.kcal === 'number') {
        macros = {
          calories: data.kcal, // Map kcal to calories for consistency
          protein_g: data.protein_g,
          carbs_g: data.carbs_g,
          fat_g: data.fat_g,
          confidence: data.confidence
        };
      } else if (data.macros) {
        macros = data.macros;
      }
    }
    
    if (!macros) {
      return { ok: false, error: 'No macro data in edge response' };
    }
    
    return { ok: true, macros };
  }
  
  return { ok: false, error: result.text || 'Tool call failed' };
}