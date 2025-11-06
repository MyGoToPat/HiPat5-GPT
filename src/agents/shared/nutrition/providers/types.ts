/**
 * Provider Registry for Macro Lookups
 * Seam for future MCP integration
 */

export interface NormalizedItem {
  name: string;
  amount: number | null;
  unit: string | null;
  brand?: string | null;
  serving_label?: string | null;
  size_label?: string | null;
  is_branded?: boolean;
}

export interface MacroResult {
  name: string;
  serving_label: string;
  grams_per_serving: number;
  macros: {
    kcal: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    fiber_g: number;
  };
  confidence: number;
  source: string;
}

export interface MacroProvider {
  id: 'gemini' | 'brandMap' | 'generic' | 'mcp-nutrition';
  supports(item: NormalizedItem, userId?: string): boolean;
  fetch(item: NormalizedItem, userId?: string): Promise<MacroResult | null>;
  priority: number; // Lower = higher priority
}

class ProviderRegistry {
  private providers: MacroProvider[] = [];
  
  register(provider: MacroProvider): void {
    // Remove existing provider with same id if present
    this.providers = this.providers.filter(p => p.id !== provider.id);
    this.providers.push(provider);
    this.providers.sort((a, b) => a.priority - b.priority);
  }
  
  async lookup(item: NormalizedItem, userId?: string): Promise<MacroResult | null> {
    for (const provider of this.providers) {
      if (provider.supports(item, userId)) {
        const result = await provider.fetch(item, userId);
        if (result) {
          console.log(`[macroLookup.trace] item="${item.name}" path=${provider.id} serving="${result.serving_label}" qty=${item.amount ?? 1} kcal=${result.macros.kcal}`);
          return result;
        }
      }
    }
    return null;
  }
  
  getProviders(): MacroProvider[] {
    return [...this.providers];
  }
}

export const providerRegistry = new ProviderRegistry();

