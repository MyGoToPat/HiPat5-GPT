/* Unified tool invocation via absolute Supabase URLs with proper auth headers */

const BASE = import.meta.env.VITE_SUPABASE_URL;
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY;

function authHeaders(): Record<string, string> {
  const h: Record<string, string> = { 
    "Content-Type": "application/json", 
    "apikey": ANON ?? "" 
  };
  
  // Attach session token if available (optional)
  try {
    const raw = localStorage.getItem("sb-jdtogitfqptdrxkczdbw-auth-token");
    const token = raw ? JSON.parse(raw)?.currentSession?.access_token : null;
    if (token) h["Authorization"] = `Bearer ${token}`;
    else h["Authorization"] = `Bearer ${ANON}`;
  } catch {
    h["Authorization"] = `Bearer ${ANON}`;
  }
  return h;
}

export async function invokeEdgeFunction(path: string, body: any) {
  const cleanPath = path.replace(/^\/+|functions\/v1\/+/g, "");
  const url = `${BASE}/functions/v1/${cleanPath}`;
  
  const res = await fetch(url, { 
    method: "POST", 
    headers: authHeaders(), 
    body: JSON.stringify(body) 
  });
  
  const text = await res.text();
  try { 
    return { ok: res.ok, status: res.status, json: JSON.parse(text), text }; 
  } catch { 
    return { ok: res.ok, status: res.status, text }; 
  }
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