/* Unified tool invocation via Supabase functions to ensure auth headers (UI-only). */
import { getSupabase } from '../supabase';

export interface InvokeResult<T = any> {
  ok: boolean;
  data?: T;
  error?: string;
  status?: number;
}

export async function invokeEdgeFunction<T = any>(
  name: string,
  payload: Record<string, any>
): Promise<InvokeResult<T>> {
  try {
    const supabase = getSupabase?.();
    if (!supabase?.functions) {
      return { ok: false, error: "Supabase client not available" };
    }
    const { data, error } = await supabase.functions.invoke(name, { body: payload });
    if (error) return { ok: false, error: error.message, status: (error as any)?.status ?? 500 };
    return { ok: true, data: data as T, status: 200 };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "invoke error" };
  }
}

export async function callFoodMacros(params: { foodName: string }): Promise<InvokeResult> {
  if (!params?.foodName) return { ok: false, error: "foodName required" };
  return invokeEdgeFunction("openai-food-macros", { foodName: params.foodName });
}

export async function callEdgeTool(
  toolName: string,
  params: Record<string, any>
): Promise<InvokeResult> {
  if (toolName === "openai-food-macros") return callFoodMacros({ foodName: params?.foodName });
  return { ok: false, error: `Unknown tool: ${toolName}` };
}

// Re-export food macros helper with unified auth
export async function fetchFoodMacros(foodName: string): Promise<{ ok: boolean; macros?: any; error?: string }> {
  const result = await invokeEdgeFunction('openai-food-macros', { foodName });
  
  if (result.ok && result.data) {
    // Handle different response formats from the Edge Function
    let macros: any = undefined;
    const data = result.data;
    
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
  
  return { ok: false, error: result.error || 'Tool call failed' };
}