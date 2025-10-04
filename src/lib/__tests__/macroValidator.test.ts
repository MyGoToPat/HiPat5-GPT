import { describe, it, expect } from 'vitest';
import {
  validateMacroBulletFormat,
  extractMacrosFromBullets,
  formatMacrosBullet,
  isMacroResponse
} from '../personality/macroValidator';

describe('macroValidator', () => {
  describe('validateMacroBulletFormat', () => {
    it('should validate correct bullet format', () => {
      const response = `• Calories: 107 kcal
• Protein: 23 g
• Carbs: 0 g
• Fat: 1.2 g

Log`;

      const result = validateMacroBulletFormat(response);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.macros).toEqual({
        calories: 107,
        protein: 23,
        carbs: 0,
        fat: 1.2
      });
    });

    it('should reject format without bullet characters', () => {
      const response = `Calories: 107 kcal
Protein: 23 g
Carbs: 0 g
Fat: 1.2 g

Log`;

      const result = validateMacroBulletFormat(response);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Missing bullet character "•"');
    });

    it('should reject format missing "Log"', () => {
      const response = `• Calories: 107 kcal
• Protein: 23 g
• Carbs: 0 g
• Fat: 1.2 g`;

      const result = validateMacroBulletFormat(response);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Response must end with "Log"');
    });

    it('should reject format with missing labels', () => {
      const response = `• Calories: 107 kcal
• Protein: 23 g
• Fat: 1.2 g

Log`;

      const result = validateMacroBulletFormat(response);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Missing label: Carbs:');
    });
  });

  describe('extractMacrosFromBullets', () => {
    it('should extract macros from valid bullet format', () => {
      const response = `• Calories: 107 kcal
• Protein: 23 g
• Carbs: 0 g
• Fat: 1.2 g

Log`;

      const macros = extractMacrosFromBullets(response);
      expect(macros).toEqual({
        calories: 107,
        protein: 23,
        carbs: 0,
        fat: 1.2
      });
    });

    it('should handle decimal values', () => {
      const response = `• Calories: 165.5 kcal
• Protein: 23.8 g
• Carbs: 0.5 g
• Fat: 1.2 g

Log`;

      const macros = extractMacrosFromBullets(response);
      expect(macros).toEqual({
        calories: 165.5,
        protein: 23.8,
        carbs: 0.5,
        fat: 1.2
      });
    });

    it('should return null for invalid format', () => {
      const response = `Calories: 107
Protein: 23
Missing carbs and fat`;

      const macros = extractMacrosFromBullets(response);
      expect(macros).toBeNull();
    });
  });

  describe('formatMacrosBullet', () => {
    it('should format macros into bullet format', () => {
      const macros = {
        calories: 107,
        protein: 23,
        carbs: 0,
        fat: 1.2
      };

      const formatted = formatMacrosBullet(macros);
      expect(formatted).toBe(`• Calories: 107 kcal
• Protein: 23 g
• Carbs: 0 g
• Fat: 1.2 g

Log`);
    });
  });

  describe('isMacroResponse', () => {
    it('should detect macro responses', () => {
      const response = `• Calories: 107 kcal
• Protein: 23 g
• Carbs: 0 g
• Fat: 1.2 g

Log`;

      expect(isMacroResponse(response)).toBe(true);
    });

    it('should detect non-macro responses', () => {
      const response = `Here's some general advice about fitness and nutrition. Make sure to stay hydrated and get enough sleep.`;

      expect(isMacroResponse(response)).toBe(false);
    });

    it('should require at least 3 macro keywords', () => {
      const response = `This meal has 100 calories and some protein.`;

      expect(isMacroResponse(response)).toBe(false);
    });
  });
});
