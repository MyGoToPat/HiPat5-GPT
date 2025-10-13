import { describe, it, expect } from 'vitest';
import { formatMacrosUSDA, FoodResult } from '../format';

describe('formatMacrosUSDA', () => {
  it('should format exact macro block as specified', () => {
    const input: FoodResult = {
      items: [
        {
          name: 'ribeye',
          quantity: 10,
          unit: 'oz',
          assumptions: ['cooked'],
          macros: { kcal: 610, protein_g: 63, fat_g: 61, carbs_g: 0, fiber_g: 0 }
        },
        {
          name: 'eggs',
          quantity: 3,
          unit: 'large',
          macros: { kcal: 210, protein_g: 18, fat_g: 15, carbs_g: 1, fiber_g: 0 }
        },
        {
          name: 'oatmeal',
          quantity: 1,
          unit: 'cup',
          macros: { kcal: 150, protein_g: 6, fat_g: 3, carbs_g: 27, fiber_g: 4 }
        },
        {
          name: 'skim milk',
          quantity: 0.5,
          unit: 'cup',
          macros: { kcal: 40, protein_g: 4, fat_g: 0, carbs_g: 6, fiber_g: 0 }
        }
      ],
      totals: { kcal: 1210, protein_g: 91, fat_g: 79, carbs_g: 34, fiber_g: 4 }
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
});
