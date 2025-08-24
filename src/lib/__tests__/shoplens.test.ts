import { describe, it, expect, beforeEach } from 'vitest';
import { analyzeLabel, fetchUserFeedback, getConfig, saveConfig } from '../shoplens';
import type { ShopLensConfig } from '../../types/shoplens';

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

describe('shoplens', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('analyzeLabel with banned ingredients returns avoid verdict', async () => {
    const config: ShopLensConfig = {
      sensitivity: 70,
      banned: ['yohimbine'],
      caution: [],
      intendedUse: 'performance',
      strictLabelMode: false,
      allowProprietaryBlends: true
    };

    const result = await analyzeLabel('Test Product\nWhey Protein, Yohimbine HCl, Natural Flavors', config);
    
    expect(result.verdict).toBe('avoid');
    expect(result.notes).toContain('Banned ingredients detected: Yohimbine HCl');
  });

  it('analyzeLabel with strict mode and proprietary blend returns caution', async () => {
    const config: ShopLensConfig = {
      sensitivity: 70,
      banned: [],
      caution: [],
      intendedUse: 'performance',
      strictLabelMode: true,
      allowProprietaryBlends: false
    };

    const result = await analyzeLabel('Test Product\nWhey Protein, Proprietary Blend (500mg)', config);
    
    expect(result.verdict).toBe('caution');
    expect(result.notes.some(note => note.includes('Proprietary blend detected in strict mode'))).toBe(true);
  });

  it('analyzeLabel with default config returns safe verdict', async () => {
    const result = await analyzeLabel('Simple Product\nWhey Protein Isolate, Natural Flavors');
    
    expect(result.verdict).toBe('safe');
    expect(result.notes).toContain('No concerning ingredients or patterns detected');
  });

  it('analyzeLabel returns deterministic results for protein products', async () => {
    const result = await analyzeLabel('WHEY PROTEIN ISOLATE\nWhey Protein Isolate, Natural Flavors, Sucralose');
    
    expect(result.productName).toBe('WHEY PROTEIN ISOLATE');
    expect(result.ingredients.length).toBeGreaterThan(0);
    expect(result.ingredients[0].name).toBe('Whey Protein Isolate');
    expect(result.ingredients[0].riskLevel).toBe('low');
    expect(result.confidence).toBe(0.85);
  });

  it('analyzeLabel handles empty input gracefully', async () => {
    const result = await analyzeLabel('');
    
    expect(result.productName).toBe('Unknown Product');
    expect(result.ingredients.length).toBeGreaterThanOrEqual(2);
    expect(result.claims).toHaveLength(0);
    expect(result.verdict).toBe('safe');
  });

  it('fetchUserFeedback returns protein-specific feedback', async () => {
    const feedback = await fetchUserFeedback('Protein Powder');
    
    expect(feedback).toHaveLength(2);
    expect(feedback[0].source).toBe('FitnessForum');
    expect(feedback[0].snippet).toContain('Great taste');
    expect(feedback[0].rating).toBe(4);
  });

  it('fetchUserFeedback returns generic feedback for non-protein products', async () => {
    const feedback = await fetchUserFeedback('Vitamin D');
    
    expect(feedback).toHaveLength(1);
    expect(feedback[0].source).toBe('HealthyLiving');
    expect(feedback[0].snippet).toBe('Mixed reviews on effectiveness');
    expect(feedback[0].rating).toBe(3);
  });

  it('getConfig returns defaults when no config stored', () => {
    const config = getConfig();
    
    expect(config.sensitivity).toBe(70);
    expect(config.banned).toEqual([]);
    expect(config.caution).toEqual(['artificial', 'synthetic']);
    expect(config.intendedUse).toBe('performance');
    expect(config.strictLabelMode).toBe(false);
    expect(config.allowProprietaryBlends).toBe(true);
  });

  it('saveConfig and getConfig persist configuration', () => {
    const testConfig: ShopLensConfig = {
      sensitivity: 90,
      banned: ['dmaa', 'ephedra'],
      caution: ['proprietary'],
      intendedUse: 'health',
      strictLabelMode: true,
      allowProprietaryBlends: false
    };

    saveConfig(testConfig);
    const loaded = getConfig();
    
    expect(loaded).toEqual(testConfig);
  });

  it('analyzeLabel with caution keywords returns caution verdict', async () => {
    const config: ShopLensConfig = {
      sensitivity: 70,
      banned: [],
      caution: ['artificial'],
      intendedUse: 'performance',
      strictLabelMode: false,
      allowProprietaryBlends: true
    };

    const result = await analyzeLabel('Test Product\nWhey Protein, Artificial Flavors', config);
    
    expect(result.verdict).toBe('caution');
    expect(result.notes.some(note => note.includes('Contains caution keywords'))).toBe(true);
  });
});