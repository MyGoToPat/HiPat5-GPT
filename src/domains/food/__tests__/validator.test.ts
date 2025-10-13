import { describe, it, expect } from 'vitest';
import { validateMacros } from '../validator';
import { FoodResult } from '../format';

describe('validateMacros', () => {
  it('should pass validation for correct totals', () => {
    const input: FoodResult = {
      items: [
        {
          name: 'test1',
          quantity: 1,
          unit: 'serving',
          macros: { kcal: 102, protein_g: 10, fat_g: 5, carbs_g: 8, fiber_g: 2 }
        },
        {
          name: 'test2',
          quantity: 1,
          unit: 'serving',
          macros: { kcal: 202, protein_g: 20, fat_g: 10, carbs_g: 16, fiber_g: 4 }
        }
      ],
      totals: { kcal: 304, protein_g: 30, fat_g: 15, carbs_g: 24, fiber_g: 6 }
    };

    const warnings = validateMacros(input);
    expect(warnings).toHaveLength(0);
  });

  it('should detect sum mismatch beyond 10% tolerance', () => {
    const input: FoodResult = {
      items: [
        {
          name: 'test',
          quantity: 1,
          unit: 'serving',
          macros: { kcal: 100, protein_g: 10, fat_g: 5, carbs_g: 8, fiber_g: 2 }
        }
      ],
      totals: { kcal: 100, protein_g: 20, fat_g: 5, carbs_g: 8, fiber_g: 2 }
    };

    const warnings = validateMacros(input);
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings[0].type).toBe('sum_mismatch');
    expect(warnings[0].message).toContain('Protein');
  });

  it('should detect calorie formula mismatch', () => {
    const input: FoodResult = {
      items: [
        {
          name: 'test',
          quantity: 1,
          unit: 'serving',
          macros: { kcal: 100, protein_g: 10, fat_g: 5, carbs_g: 8, fiber_g: 2 }
        }
      ],
      totals: { kcal: 500, protein_g: 10, fat_g: 5, carbs_g: 8, fiber_g: 2 }
    };

    const warnings = validateMacros(input);
    expect(warnings.some(w => w.type === 'calorie_formula_mismatch')).toBe(true);
  });
});
