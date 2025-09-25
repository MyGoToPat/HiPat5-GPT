import { getSupabase } from "@/lib/supabase";

export interface ToolResult {
  ok: boolean;
  result?: any;
  error?: string;
  tried: string[];
}

export async function invokeEdgeFunction(
  functionName: string, 
  payload: any
): Promise<ToolResult> {
  const tried = [`/functions/v1/${functionName}`];
  
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.functions.invoke(functionName, {
      body: payload,
    });
    
    if (error) {
      return { 
        ok: false, 
        error: error.message || "Edge function failed", 
        tried 
      };
    }
    
    return { 
      ok: true, 
      result: data, 
      tried 
    };
  } catch (e: any) {
    return { 
      ok: false, 
      error: e.message || "Network error", 
      tried 
    };
  }
}

// Re-export tool helpers with unified auth
export async function fetchFoodMacros(foodName: string): Promise<{ ok: boolean; macros?: any; error?: string }> {
  const result = await invokeEdgeFunction('openai-food-macros', { foodName });
  
  if (result.ok && result.result) {
    // Handle different response formats from the Edge Function
    let macros: any = undefined;
    const data = result.result;
    
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

// Future tool wrappers can be added here following the same pattern
export async function callWorkoutTracker(workoutData: any): Promise<ToolResult> {
  // Placeholder for future workout tracking tool
  return invokeEdgeFunction('workout-tracker', workoutData);
}

export async function callFeedbackAnalyzer(feedbackData: any): Promise<ToolResult> {
  // Placeholder for future feedback analysis tool
  return invokeEdgeFunction('feedback-analyzer', feedbackData);
}