/**
 * Unit tests for Gemini Edge Function payload format
 * Ensures we build { foodName, canonicalName } correctly
 */

import { describe, it, expect } from 'vitest';

/**
 * Simulate the payload building logic from geminiCache.ts
 */
function buildGeminiPayload(q: {
  name: string;
  brand?: string;
  serving_label?: string;
  size_label?: string;
  country?: string;
}): { foodName: string; canonicalName?: string } {
  const foodName = q.name?.trim();
  if (!foodName) {
    throw new Error('foodName is required');
  }

  const canonicalName = [
    q.brand,
    q.name,
    q.serving_label,
    q.size_label
  ].filter(Boolean).join(' ').trim() || undefined;

  return {
    foodName,
    canonicalName
  };
}

describe('Gemini Edge Function Payload', () => {
  it('should build correct payload for branded item (McDonald\'s Big Mac)', () => {
    const payload = buildGeminiPayload({
      name: "Big Mac",
      brand: "McDonald's",
      serving_label: "1 sandwich"
    });

    expect(payload).toEqual({
      foodName: "Big Mac",
      canonicalName: "McDonald's Big Mac 1 sandwich"
    });
  });

  it('should build correct payload for generic item (oatmeal 1 cup)', () => {
    const payload = buildGeminiPayload({
      name: "oatmeal",
      serving_label: "1 cup"
    });

    expect(payload).toEqual({
      foodName: "oatmeal",
      canonicalName: "oatmeal 1 cup"
    });
  });

  it('should build correct payload for simple item (eggs)', () => {
    const payload = buildGeminiPayload({
      name: "eggs"
    });

    expect(payload).toEqual({
      foodName: "eggs",
      canonicalName: undefined // No optional fields
    });
  });

  it('should handle empty name and throw error', () => {
    expect(() => {
      buildGeminiPayload({
        name: "   ",
        brand: "McDonald's"
      });
    }).toThrow('foodName is required');
  });

  it('should handle McChicken with brand detection', () => {
    const payload = buildGeminiPayload({
      name: "McChicken",
      brand: "McDonald's",
      size_label: "regular"
    });

    expect(payload).toEqual({
      foodName: "McChicken",
      canonicalName: "McDonald's McChicken regular"
    });
  });

  it('should handle McNuggets with serving label', () => {
    const payload = buildGeminiPayload({
      name: "chicken mcnuggets",
      brand: "McDonald's",
      serving_label: "6-piece"
    });

    expect(payload).toEqual({
      foodName: "chicken mcnuggets",
      canonicalName: "McDonald's chicken mcnuggets 6-piece"
    });
  });

  it('should filter out falsy values in canonicalName', () => {
    const payload = buildGeminiPayload({
      name: "rice",
      brand: undefined,
      serving_label: "1 cup",
      size_label: null as any
    });

    expect(payload).toEqual({
      foodName: "rice",
      canonicalName: "rice 1 cup"
    });
  });
});

