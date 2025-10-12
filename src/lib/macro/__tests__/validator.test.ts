import { describe, it, expect } from 'vitest';
import { validateMacros, validateMacroRatios, isWithinTolerance } from '../validator';
import type { USDAMacros } from '../formatter';

describe('Macro Validator', () => {
  describe('validateMacros', () => {
    it('should pass when macros are within tolerance', () => {
      const actual: USDAMacros = {
        kcal: 200,
        protein_g: 20,
        carbs_g: 15,
        fat_g: 8
      };

      const expected: USDAMacros = {
        kcal: 202,
        protein_g: 20.3,
        carbs_g: 14.8,
        fat_g: 8.2
      };

      const result = validateMacros(actual, expected);
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should fail when kcal is off by more than tolerance', () => {
      const actual: USDAMacros = {
        kcal: 200,
        protein_g: 20,
        carbs_g: 15,
        fat_g: 8
      };

      const expected: USDAMacros = {
        kcal: 250, // Off by 50 kcal
        protein_g: 20,
        carbs_g: 15,
        fat_g: 8
      };

      const result = validateMacros(actual, expected);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].field).toBe('kcal');
    });

    it('should fail when protein is off by more than tolerance', () => {
      const actual: USDAMacros = {
        kcal: 200,
        protein_g: 20,
        carbs_g: 15,
        fat_g: 8
      };

      const expected: USDAMacros = {
        kcal: 200,
        protein_g: 22, // Off by 2g
        carbs_g: 15,
        fat_g: 8
      };

      const result = validateMacros(actual, expected);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].field).toBe('protein_g');
    });

    it('should warn about kcal mismatch with calculated macros', () => {
      const actual: USDAMacros = {
        kcal: 300, // Stated 300 kcal
        protein_g: 20,  // 80 kcal
        carbs_g: 15,    // 60 kcal
        fat_g: 8        // 72 kcal
        // Total: 212 kcal, but stated 300 kcal (88 kcal difference)
      };

      const expected: USDAMacros = {
        kcal: 300,
        protein_g: 20,
        carbs_g: 15,
        fat_g: 8
      };

      const result = validateMacros(actual, expected);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0].field).toBe('kcal');
    });
  });

  describe('validateMacroRatios', () => {
    it('should pass for normal macro ratios', () => {
      const macros: USDAMacros = {
        kcal: 200,
        protein_g: 20,  // 80 kcal = 40%
        carbs_g: 15,    // 60 kcal = 30%
        fat_g: 8        // 72 kcal = 36%
      };

      const result = validateMacroRatios(macros);
      expect(result.valid).toBe(true);
    });

    it('should fail when total is zero', () => {
      const macros: USDAMacros = {
        kcal: 0,
        protein_g: 0,
        carbs_g: 0,
        fat_g: 0
      };

      const result = validateMacroRatios(macros);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('isWithinTolerance', () => {
    it('should return true when within tolerance', () => {
      expect(isWithinTolerance(100, 102, 5)).toBe(true);
      expect(isWithinTolerance(102, 100, 5)).toBe(true);
      expect(isWithinTolerance(100, 100, 5)).toBe(true);
    });

    it('should return false when outside tolerance', () => {
      expect(isWithinTolerance(100, 110, 5)).toBe(false);
      expect(isWithinTolerance(110, 100, 5)).toBe(false);
    });
  });
});
