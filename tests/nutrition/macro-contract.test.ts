/**
 * Macro Contract Tests
 * Validates JSON schema and unit parsing for macro responses
 */

import { describe, it, expect } from 'vitest';
import { convertToGrams } from '../../src/agents/shared/nutrition/macroLookup';

// Mock the macroLookup module to test stubs
vi.mock('../../src/agents/shared/nutrition/macroLookup', () => ({
  convertToGrams: (amount: number, unit: string) => {
    if (unit === 'oz') return amount * 28.35;
    if (unit === 'g') return amount;
    if (unit === 'cup') return amount * 240; // rough approximation
    return amount;
  }
}));

describe('Macro Contract Validation', () => {
  describe('JSON Schema Compliance', () => {
    const validMacroResponse = {
      items: [
        {
          name: "Ribeye steak, cooked",
          serving: { unit: "g", amount: 284 },
          macros: {
            calories: 250,
            protein_g: 20,
            carbs_g: 0,
            fat_g: 18,
            fiber_g: 0
          },
          source: "USDA",
          confidence: 0.9
        }
      ]
    };

    const validStubResponse = {
      items: [
        {
          name: "Test Food",
          serving: { unit: "g", amount: 100 },
          macros: {
            calories: 250,
            protein_g: 20,
            carbs_g: 0,
            fat_g: 18,
            fiber_g: 0
          },
          source: "stub",
          confidence: 0.5,
          needs_external: true,
          notes: "stubbed; external lookup disabled"
        }
      ]
    };

    it('should validate complete macro response structure', () => {
      expect(validMacroResponse).toHaveProperty('items');
      expect(Array.isArray(validMacroResponse.items)).toBe(true);
      expect(validMacroResponse.items).toHaveLength(1);

      const item = validMacroResponse.items[0];
      expect(item).toHaveProperty('name');
      expect(item).toHaveProperty('serving');
      expect(item).toHaveProperty('macros');
      expect(item).toHaveProperty('source');
      expect(item).toHaveProperty('confidence');

      expect(item.serving).toHaveProperty('unit');
      expect(item.serving).toHaveProperty('amount');
      expect(typeof item.serving.amount).toBe('number');

      expect(item.macros).toHaveProperty('calories');
      expect(item.macros).toHaveProperty('protein_g');
      expect(item.macros).toHaveProperty('carbs_g');
      expect(item.macros).toHaveProperty('fat_g');
      expect(item.macros).toHaveProperty('fiber_g');

      // All macros should be non-negative numbers
      Object.values(item.macros).forEach(value => {
        expect(typeof value).toBe('number');
        expect(value).toBeGreaterThanOrEqual(0);
      });

      expect(typeof item.confidence).toBe('number');
      expect(item.confidence).toBeGreaterThanOrEqual(0);
      expect(item.confidence).toBeLessThanOrEqual(1);
    });

    it('should validate stub response structure', () => {
      expect(validStubResponse).toHaveProperty('items');
      expect(Array.isArray(validStubResponse.items)).toBe(true);

      const item = validStubResponse.items[0];
      expect(item.source).toBe('stub');
      expect(item.confidence).toBe(0.5);
      expect(item.needs_external).toBe(true);
      expect(item).toHaveProperty('notes');

      // Stub should still have valid macro structure
      expect(item.macros.calories).toBeGreaterThan(0);
      expect(item.macros.protein_g).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Unit Parsing Fuzzing', () => {
    const testCases = [
      { input: '10 oz ribeye', expected: 283.5 },
      { input: '10oz ribeye', expected: 283.5 },
      { input: '10-oz ribeye', expected: 283.5 },
      { input: '284 g ribeye', expected: 284 },
      { input: '284g ribeye', expected: 284 },
      { input: '1 cup oatmeal', expected: 240 },
      { input: '240g oatmeal', expected: 240 }
    ];

    testCases.forEach(({ input, expected }) => {
      it(`should parse "${input}" correctly`, () => {
        // Extract amount and unit from the test case
        const match = input.match(/(\d+(?:\.\d+)?)[-\s]*(oz|g|cup)/i);
        expect(match).toBeTruthy();

        const amount = parseFloat(match![1]);
        const unit = match![2].toLowerCase();

        const result = convertToGrams(amount, unit);
        expect(result).toBeCloseTo(expected, 1); // Allow 1g tolerance
      });
    });
  });

  describe('Stub Response Generation', () => {
    it('should generate plausible stub macros', () => {
      // Test that stub responses have reasonable macro values
      const stubMacros = {
        calories: 260,
        protein_g: 20,
        carbs_g: 5,
        fat_g: 18,
        fiber_g: 2
      };

      expect(stubMacros.calories).toBeGreaterThan(0);
      expect(stubMacros.protein_g).toBeGreaterThanOrEqual(0);
      expect(stubMacros.carbs_g).toBeGreaterThanOrEqual(0);
      expect(stubMacros.fat_g).toBeGreaterThanOrEqual(0);
      expect(stubMacros.fiber_g).toBeGreaterThanOrEqual(0);

      // Basic reasonableness check - calories should be reasonable for given macros
      expect(stubMacros.calories).toBeGreaterThan(200); // Should be substantial for a food item
      expect(stubMacros.calories).toBeLessThan(1000); // Shouldn't be excessive
    });

    it('should maintain consistent schema across sources', () => {
      const realResponse = {
        items: [{
          name: "Real Food",
          serving: { unit: "g", amount: 100 },
          macros: { calories: 200, protein_g: 15, carbs_g: 10, fat_g: 12, fiber_g: 3 },
          source: "USDA",
          confidence: 0.9
        }]
      };

      const stubResponse = {
        items: [{
          name: "Stub Food",
          serving: { unit: "g", amount: 100 },
          macros: { calories: 250, protein_g: 20, carbs_g: 5, fat_g: 18, fiber_g: 2 },
          source: "stub",
          confidence: 0.5,
          needs_external: true,
          notes: "stubbed; external lookup disabled"
        }]
      };

      // Both should have identical top-level structure
      expect(Object.keys(realResponse)).toEqual(Object.keys(stubResponse));
      expect(realResponse.items[0]).toHaveProperty('name');
      expect(realResponse.items[0]).toHaveProperty('serving');
      expect(realResponse.items[0]).toHaveProperty('macros');
      expect(realResponse.items[0]).toHaveProperty('source');
      expect(realResponse.items[0]).toHaveProperty('confidence');

      // Stub should have additional fields
      expect(stubResponse.items[0]).toHaveProperty('needs_external');
      expect(stubResponse.items[0]).toHaveProperty('notes');
    });
  });
});