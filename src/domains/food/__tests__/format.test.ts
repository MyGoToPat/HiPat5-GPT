/**
 * EXACT FORMAT TEST
 * Verifies formatMacrosUSDA produces the exact required output
 */

import { describe, it, expect } from 'vitest';
import { formatMacrosUSDA, type FoodResult } from '../format';

describe('formatMacrosUSDA', () => {
  it('produces exact format for canonical example', () => {
    const input: FoodResult = {
      items: [
        {
          name: 'ribeye',
          quantity: 10,
          unit: 'oz',
          assumptions: ['cooked'],
          macros: {
            protein_g: 63,
            fat_g: 61,
            carbs_g: 0,
            kcal: 757
          }
        },
        {
          name: 'eggs',
          quantity: 3,
          unit: 'large',
          macros: {
            protein_g: 18,
            fat_g: 15,
            carbs_g: 1,
            kcal: 213
          }
        },
        {
          name: 'oatmeal',
          quantity: 1,
          unit: 'cup',
          macros: {
            protein_g: 6,
            fat_g: 3,
            carbs_g: 27,
            kcal: 158
          }
        },
        {
          name: 'skim milk',
          quantity: 0.5,
          unit: 'cup',
          macros: {
            protein_g: 4,
            fat_g: 0,
            carbs_g: 6,
            kcal: 42
          }
        }
      ],
      totals: {
        protein_g: 91,
        fat_g: 79,
        carbs_g: 34,
        kcal: 1210
      }
    };

    const expected = `I calculated macros using standard USDA values.

Ribeye (10 oz cooked)
• Protein 63 g
• Fat 61 g
• Carbs 0 g

Eggs (3 large)
• Protein 18 g
• Fat 15 g
• Carbs 1 g

Oatmeal (1 cup cooked)
• Protein 6 g
• Fat 3 g
• Carbs 27 g

Skim milk (0.5 cup)
• Protein 4 g
• Fat 0 g
• Carbs 6 g

Totals
• Protein 91 g
• Fat 79 g
• Carbs 34 g
• Calories ≈ 1 210 kcal

Type "Log" to log all or "Log (items)" to log your choices — or do you have any questions?`;

    const actual = formatMacrosUSDA(input);

    expect(actual).toBe(expected);
  });

  it('handles non-cooked items correctly', () => {
    const input: FoodResult = {
      items: [
        {
          name: 'apple',
          quantity: 1,
          unit: 'medium',
          macros: {
            protein_g: 0,
            fat_g: 0,
            carbs_g: 25,
            kcal: 95
          }
        }
      ],
      totals: {
        protein_g: 0,
        fat_g: 0,
        carbs_g: 25,
        kcal: 95
      }
    };

    const result = formatMacrosUSDA(input);

    expect(result).toContain('Apple (1 medium)');
    expect(result).not.toContain('cooked');
  });

  it('handles numbers with thousand separator', () => {
    const input: FoodResult = {
      items: [
        {
          name: 'pizza',
          quantity: 2,
          unit: 'large',
          macros: {
            protein_g: 100,
            fat_g: 100,
            carbs_g: 200,
            kcal: 2100
          }
        }
      ],
      totals: {
        protein_g: 100,
        fat_g: 100,
        carbs_g: 200,
        kcal: 2100
      }
    };

    const result = formatMacrosUSDA(input);

    expect(result).toContain('2 100 kcal');
  });
});
