import { describe, it, expect, beforeEach } from 'vitest';
import { parseMeal, getFoodLogConfig, saveFoodLogConfig, saveEntry, listEntries, undoLast } from '../foodlog';
import type { FoodLogConfig, FoodLogEntry } from '../../types/foodlog';

// Mock localStorage for tests
const localStorageMock = {
  store: {} as Record<string, string>,
  getItem(key: string) {
    return this.store[key] || null;
  },
  setItem(key: string, value: string) {
    this.store[key] = value;
  },
  removeItem(key: string) {
    delete this.store[key];
  },
  clear() {
    this.store = {};
  }
};

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock
});

describe('foodlog', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('parseMeal handles "2 eggs, toast w/ butter, black coffee" correctly', () => {
    const config: FoodLogConfig = {
      dietStyle: 'standard',
      units: 'us',
      defaultServing: 1,
      timezone: 'UTC',
      strictParsing: false
    };

    const result = parseMeal('2 eggs, toast w/ butter, black coffee', config);
    
    // Check items count
    expect(result.items).toHaveLength(4);
    
    // Check individual items
    const egg = result.items.find(item => item.name.toLowerCase().includes('egg'));
    const toast = result.items.find(item => item.name.toLowerCase().includes('toast'));
    const butter = result.items.find(item => item.name.toLowerCase().includes('butter'));
    const coffee = result.items.find(item => item.name.toLowerCase().includes('coffee'));
    
    expect(egg).toBeDefined();
    expect(egg!.qty).toBe(2);
    expect(toast).toBeDefined();
    expect(butter).toBeDefined();
    expect(coffee).toBeDefined();
    
    // Check totals (±0.1 tolerance)
    expect(result.totals.kcal).toBeCloseTo(272, 1);
    expect(result.totals.protein).toBeCloseTo(15.0, 1);
    expect(result.totals.carbs).toBeCloseTo(15.2, 1);
    expect(result.totals.fat).toBeCloseTo(15.0, 1);
  });

  it('strict mode flags unknown tokens and excludes from totals', () => {
    const config: FoodLogConfig = {
      dietStyle: 'standard',
      units: 'us',
      defaultServing: 1,
      timezone: 'UTC',
      strictParsing: true
    };

    const result = parseMeal('1 egg, goji drizzle', config);
    
    // Should have 1 item (egg) and notes about unknown
    expect(result.items).toHaveLength(1);
    expect(result.items[0].name.toLowerCase()).toContain('egg');
    expect(result.notes.some(note => note.includes('goji drizzle'))).toBe(true);
    
    // Totals should only include egg (78 kcal, P6, C0.6, F5)
    expect(result.totals.kcal).toBeCloseTo(78, 1);
    expect(result.totals.protein).toBeCloseTo(6, 1);
  });

  it('saveEntry and listEntries round-trip correctly', () => {
    const config: FoodLogConfig = {
      dietStyle: 'standard',
      units: 'us',
      defaultServing: 1,
      timezone: 'UTC',
      strictParsing: false
    };

    const entry: FoodLogEntry = {
      id: 'test-entry',
      timestamp: new Date().toISOString(),
      items: [{
        id: 'test-item',
        name: 'Test Food',
        qty: 1,
        unit: 'each',
        kcal: 100,
        protein: 10,
        carbs: 5,
        fat: 2,
        confidence: 1.0
      }],
      totals: { kcal: 100, protein: 10, carbs: 5, fat: 2 },
      notes: []
    };

    const today = new Date().toISOString().split('T')[0];
    
    // Save entry
    saveEntry(entry, config);
    
    // List entries
    const retrieved = listEntries(today, config);
    expect(retrieved).toHaveLength(1);
    expect(retrieved[0].id).toBe('test-entry');
    expect(retrieved[0].totals.kcal).toBe(100);
  });

  it('undoLast removes most recent entry', () => {
    const config: FoodLogConfig = {
      dietStyle: 'standard',
      units: 'us',
      defaultServing: 1,
      timezone: 'UTC',
      strictParsing: false
    };

    const today = new Date().toISOString().split('T')[0];
    
    // Save two entries
    const entry1: FoodLogEntry = {
      id: 'entry-1',
      timestamp: new Date().toISOString(),
      items: [],
      totals: { kcal: 100, protein: 10, carbs: 5, fat: 2 },
      notes: []
    };
    
    const entry2: FoodLogEntry = {
      id: 'entry-2',
      timestamp: new Date().toISOString(),
      items: [],
      totals: { kcal: 200, protein: 20, carbs: 10, fat: 4 },
      notes: []
    };

    saveEntry(entry1, config);
    saveEntry(entry2, config);
    
    // Should have 2 entries
    expect(listEntries(today, config)).toHaveLength(2);
    
    // Undo last
    undoLast(today, config);
    
    // Should have 1 entry (entry-1)
    const remaining = listEntries(today, config);
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe('entry-1');
  });

  it('units influence parsing for metric chicken breast', () => {
    const metricConfig: FoodLogConfig = {
      dietStyle: 'standard',
      units: 'metric',
      defaultServing: 1,
      timezone: 'UTC',
      strictParsing: false
    };

    // 100g chicken breast vs base 4 oz (113.4g)
    const result = parseMeal('100 g chicken breast', metricConfig);
    
    expect(result.items).toHaveLength(1);
    const chicken = result.items[0];
    
    // Should be scaled down from base 4 oz portion
    // Base: 187 kcal, P35, C0, F4 for 4 oz (113.4g)
    // 100g should be: 187 * (100/113.4) = ~165 kcal, P~31
    expect(chicken.kcal).toBeGreaterThan(150);
    expect(chicken.kcal).toBeLessThan(187);
    expect(chicken.protein).toBeGreaterThan(25);
    expect(chicken.protein).toBeLessThan(35);
  });

  it('getFoodLogConfig returns defaults when no config stored', () => {
    const config = getFoodLogConfig();
    
    expect(config.dietStyle).toBe('standard');
    expect(config.units).toBe('us');
    expect(config.defaultServing).toBe(1);
    expect(config.strictParsing).toBe(false);
    expect(config.timezone).toBeTruthy();
  });

  it('saveFoodLogConfig and getFoodLogConfig persist configuration', () => {
    const testConfig: FoodLogConfig = {
      dietStyle: 'lowcarb',
      units: 'metric',
      defaultServing: 2,
      timezone: 'America/New_York',
      strictParsing: true
    };

    saveFoodLogConfig(testConfig);
    const loaded = getFoodLogConfig();
    
    expect(loaded).toEqual(testConfig);
  });
});