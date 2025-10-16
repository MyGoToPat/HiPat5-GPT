import type { ResponseObject } from '../../types/swarm';
import { getSupabase } from '../../lib/supabase';

export interface FilterResult {
  annotations: Array<{ field: string; message: string; severity: 'info' | 'warning' | 'error' }>;
  substitutions: Array<{ original: string; suggested: string; reason: string }>;
  warnings: string[];
}

export interface UserDietaryPrefs {
  diet_type: string;
  macro_overrides: Record<string, any>;
  allergens: string[];
  religious_restrictions: string[];
}

export interface DietaryFilterRule {
  id: string;
  type: string;
  condition: Record<string, any>;
  annotations: any[];
  substitutions: any[];
  enabled: boolean;
}

export abstract class DietaryFilter {
  constructor(
    protected rules: DietaryFilterRule[],
    protected userPrefs: UserDietaryPrefs
  ) {}

  abstract apply(payload: Record<string, any>, personaOverride?: boolean): Promise<FilterResult>;

  protected createResult(): FilterResult {
    return {
      annotations: [],
      substitutions: [],
      warnings: []
    };
  }
}

export class KetoFilter extends DietaryFilter {
  async apply(payload: Record<string, any>, personaOverride = false): Promise<FilterResult> {
    const result = this.createResult();

    if (personaOverride || this.userPrefs.diet_type !== 'keto') {
      return result;
    }

    const rule = this.rules.find(r => r.type === 'keto');
    if (!rule) return result;

    const maxCarbs = rule.condition.carb_grams_max || 20;

    if (payload.totals?.carbs_g > maxCarbs) {
      result.annotations.push({
        field: 'totals.carbs_g',
        message: `This meal has ${payload.totals.carbs_g}g carbs, which exceeds your keto limit of ${maxCarbs}g.`,
        severity: 'warning'
      });

      result.warnings.push(
        `⚠️ Keto Alert: ${payload.totals.carbs_g}g carbs exceeds ${maxCarbs}g limit.`
      );
    }

    if (payload.items) {
      for (const item of payload.items) {
        if (item.carbs_g > 5) {
          result.annotations.push({
            field: `item.${item.name}`,
            message: `${item.name} contains ${item.carbs_g}g carbs (high for keto).`,
            severity: 'info'
          });
        }
      }
    }

    return result;
  }
}

export class LowCarbFilter extends DietaryFilter {
  async apply(payload: Record<string, any>, personaOverride = false): Promise<FilterResult> {
    const result = this.createResult();

    if (personaOverride || this.userPrefs.diet_type !== 'low_carb') {
      return result;
    }

    const rule = this.rules.find(r => r.type === 'low_carb');
    if (!rule) return result;

    const maxCarbs = rule.condition.carb_grams_max || 100;

    if (payload.totals?.carbs_g > maxCarbs) {
      result.annotations.push({
        field: 'totals.carbs_g',
        message: `This meal has ${payload.totals.carbs_g}g carbs, which exceeds your low-carb limit of ${maxCarbs}g.`,
        severity: 'warning'
      });

      result.warnings.push(
        `⚠️ Low-Carb Alert: ${payload.totals.carbs_g}g carbs exceeds ${maxCarbs}g limit.`
      );
    }

    return result;
  }
}

export class CarnivoreFilter extends DietaryFilter {
  private plantBasedKeywords = [
    'bread', 'rice', 'pasta', 'quinoa', 'oat', 'wheat', 'grain',
    'bean', 'lentil', 'chickpea', 'tofu', 'tempeh',
    'fruit', 'vegetable', 'salad', 'broccoli', 'spinach'
  ];

  async apply(payload: Record<string, any>, personaOverride = false): Promise<FilterResult> {
    const result = this.createResult();

    if (personaOverride || this.userPrefs.diet_type !== 'carnivore') {
      return result;
    }

    if (payload.items) {
      for (const item of payload.items) {
        const itemName = item.name?.toLowerCase() || '';
        const isPlantBased = this.plantBasedKeywords.some(kw => itemName.includes(kw));

        if (isPlantBased) {
          result.annotations.push({
            field: `item.${item.name}`,
            message: `${item.name} may not align with carnivore diet (plant-based).`,
            severity: 'warning'
          });

          result.substitutions.push({
            original: item.name,
            suggested: 'Consider animal-based alternatives (meat, eggs, dairy)',
            reason: 'Carnivore diet excludes plant foods'
          });
        }
      }
    }

    if (result.annotations.length > 0) {
      result.warnings.push(
        `⚠️ Carnivore Alert: Some items may not align with your carnivore diet.`
      );
    }

    return result;
  }
}

export class AllergenFilter extends DietaryFilter {
  private allergenKeywords: Record<string, string[]> = {
    gluten: ['wheat', 'bread', 'pasta', 'flour', 'barley', 'rye'],
    dairy: ['milk', 'cheese', 'yogurt', 'butter', 'cream', 'whey', 'casein'],
    nuts: ['peanut', 'almond', 'cashew', 'walnut', 'pecan', 'hazelnut'],
    soy: ['soy', 'tofu', 'tempeh', 'edamame', 'miso'],
    shellfish: ['shrimp', 'crab', 'lobster', 'oyster', 'clam'],
    fish: ['salmon', 'tuna', 'cod', 'tilapia', 'trout'],
    eggs: ['egg']
  };

  async apply(payload: Record<string, any>, personaOverride = false): Promise<FilterResult> {
    const result = this.createResult();

    if (personaOverride || !this.userPrefs.allergens || this.userPrefs.allergens.length === 0) {
      return result;
    }

    if (payload.items) {
      for (const item of payload.items) {
        const itemName = item.name?.toLowerCase() || '';

        for (const allergen of this.userPrefs.allergens) {
          const keywords = this.allergenKeywords[allergen.toLowerCase()] || [allergen.toLowerCase()];
          const containsAllergen = keywords.some(kw => itemName.includes(kw));

          if (containsAllergen) {
            result.annotations.push({
              field: `item.${item.name}`,
              message: `${item.name} may contain ${allergen} (allergen).`,
              severity: 'error'
            });

            result.warnings.push(
              `🚨 Allergen Alert: ${item.name} may contain ${allergen}!`
            );
          }
        }
      }
    }

    return result;
  }
}

export class FilterPipeline {
  private filters: DietaryFilter[] = [];

  constructor(
    private rules: DietaryFilterRule[],
    private userPrefs: UserDietaryPrefs
  ) {
    this.filters = [
      new KetoFilter(rules, userPrefs),
      new LowCarbFilter(rules, userPrefs),
      new CarnivoreFilter(rules, userPrefs),
      new AllergenFilter(rules, userPrefs)
    ];
  }

  async applyAll(
    payload: Record<string, any>,
    personaOverride = false
  ): Promise<FilterResult> {
    const combinedResult: FilterResult = {
      annotations: [],
      substitutions: [],
      warnings: []
    };

    for (const filter of this.filters) {
      const result = await filter.apply(payload, personaOverride);
      combinedResult.annotations.push(...result.annotations);
      combinedResult.substitutions.push(...result.substitutions);
      combinedResult.warnings.push(...result.warnings);
    }

    return combinedResult;
  }

  static async create(userId: string): Promise<FilterPipeline | null> {
    try {
      const supabase = getSupabase();

      const [rulesRes, prefsRes] = await Promise.all([
        supabase.from('dietary_filter_rules').select('*').eq('enabled', true),
        supabase.from('user_preferences').select('diet_type, macro_overrides, allergens, religious_restrictions').eq('user_id', userId).single()
      ]);

      if (rulesRes.error) throw rulesRes.error;

      const rules = rulesRes.data || [];
      const prefs = prefsRes.data || {
        diet_type: 'balanced',
        macro_overrides: {},
        allergens: [],
        religious_restrictions: []
      };

      return new FilterPipeline(rules, prefs);
    } catch (e) {
      console.error('Failed to create filter pipeline:', e);
      return null;
    }
  }
}
