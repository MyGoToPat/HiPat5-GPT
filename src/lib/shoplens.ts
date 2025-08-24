import type { Analysis, UserFeedback, ShopLensConfig, Ingredient, Claim, Verdict } from '../types/shoplens';

const DEFAULT_CONFIG: ShopLensConfig = {
  sensitivity: 70,
  banned: [],
  caution: ['artificial', 'synthetic'],
  intendedUse: 'performance',
  strictLabelMode: false,
  allowProprietaryBlends: true
};

export function getConfig(): ShopLensConfig {
  try {
    const stored = localStorage.getItem('hipat:shoplens:config');
    if (stored) {
      return { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
    }
  } catch (error) {
    console.warn('Failed to load ShopLens config:', error);
  }
  return DEFAULT_CONFIG;
}

export function saveConfig(config: ShopLensConfig): void {
  try {
    localStorage.setItem('hipat:shoplens:config', JSON.stringify(config));
  } catch (error) {
    console.warn('Failed to save ShopLens config:', error);
  }
}

export async function analyzeLabel(labelText: string, config?: ShopLensConfig): Promise<Analysis> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  const activeConfig = config || getConfig();
  
  // Deterministic parsing based on input content
  const productName = extractProductName(labelText);
  const ingredients = parseIngredients(labelText);
  const claims = extractClaims(labelText);
  const { verdict, notes } = determineVerdictWithConfig(ingredients, labelText, activeConfig);
  
  return {
    productName,
    ingredients,
    claims,
    verdict,
    notes,
    confidence: 0.85
  };
}

export async function fetchUserFeedback(productName: string): Promise<UserFeedback[]> {
  await new Promise(resolve => setTimeout(resolve, 800));
  
  // Deterministic stub based on product name
  if (productName.toLowerCase().includes('protein')) {
    return [
      {
        source: 'FitnessForum',
        snippet: 'Great taste and mixability, no stomach issues',
        rating: 4,
        timestamp: new Date('2024-01-15')
      },
      {
        source: 'SupplementReviews',
        snippet: 'Good amino acid profile, reasonably priced',
        rating: 4,
        timestamp: new Date('2024-01-10')
      }
    ];
  }
  
  return [
    {
      source: 'HealthyLiving',
      snippet: 'Mixed reviews on effectiveness',
      rating: 3,
      timestamp: new Date('2024-01-12')
    }
  ];
}

// Helper functions for deterministic parsing
function extractProductName(text: string): string {
  // Look for common product name patterns
  const lines = text.split('\n');
  const firstLine = lines[0]?.trim() || 'Unknown Product';
  return firstLine.length > 50 ? firstLine.substring(0, 47) + '...' : firstLine;
}

function parseIngredients(text: string): Ingredient[] {
  // Simple deterministic parsing
  const baseIngredients = [
    { name: 'Whey Protein Isolate', amount: 25, unit: 'g', riskLevel: 'low' as const },
    { name: 'Natural Flavors', riskLevel: 'low' as const },
    { name: 'Sucralose', riskLevel: 'low' as const, notes: 'Artificial sweetener' },
    { name: 'Lecithin', riskLevel: 'low' as const },
    { name: 'Xanthan Gum', riskLevel: 'low' as const }
  ];
  
  // Add test ingredients based on text content
  const detectedIngredients = [...baseIngredients];
  
  if (text.toLowerCase().includes('yohimbine')) {
    detectedIngredients.push({ name: 'Yohimbine HCl', amount: 2.5, unit: 'mg', riskLevel: 'high', notes: 'Stimulant - may cause side effects' });
  }
  
  if (text.toLowerCase().includes('proprietary blend')) {
    detectedIngredients.push({ name: 'Proprietary Blend', amount: 500, unit: 'mg', riskLevel: 'medium', notes: 'Undisclosed ingredient amounts' });
  }
  
  return detectedIngredients;
}

function extractClaims(text: string): Claim[] {
  const claims: Claim[] = [];
  if (text.toLowerCase().includes('build muscle')) {
    claims.push({ text: 'Builds lean muscle', category: 'performance', credibility: 'verified' });
  }
  if (text.toLowerCase().includes('weight loss')) {
    claims.push({ text: 'Supports weight loss', category: 'weight', credibility: 'questionable' });
  }
  if (text.toLowerCase().includes('energy')) {
    claims.push({ text: 'Boosts energy levels', category: 'performance', credibility: 'questionable' });
  }
  return claims;
}

function determineVerdictWithConfig(ingredients: Ingredient[], labelText: string, config: ShopLensConfig): { verdict: Verdict; notes: string[] } {
  const notes: string[] = [];
  
  // Check banned ingredients
  const bannedFound = ingredients.filter(ing => 
    config.banned.some(banned => 
      ing.name.toLowerCase().includes(banned.toLowerCase())
    )
  );
  
  if (bannedFound.length > 0) {
    notes.push(`Banned ingredients detected: ${bannedFound.map(ing => ing.name).join(', ')}`);
    return { verdict: 'avoid', notes };
  }
  
  // Check caution conditions
  let cautionReasons: string[] = [];
  
  // Caution keywords
  const cautionFound = config.caution.some(keyword => 
    labelText.toLowerCase().includes(keyword.toLowerCase())
  );
  if (cautionFound) {
    cautionReasons.push('Contains caution keywords');
  }
  
  // Strict label mode + proprietary blends
  if (config.strictLabelMode && !config.allowProprietaryBlends) {
    if (labelText.toLowerCase().includes('proprietary blend')) {
      cautionReasons.push('Proprietary blend detected in strict mode');
    }
  }
  
  // Medium/high risk ingredients
  const riskIngredients = ingredients.filter(ing => ing.riskLevel === 'medium' || ing.riskLevel === 'high');
  if (riskIngredients.length > 0) {
    cautionReasons.push(`${riskIngredients.length} ingredient(s) need attention`);
  }
  
  if (cautionReasons.length > 0) {
    notes.push(...cautionReasons);
    return { verdict: 'caution', notes };
  }
  
  notes.push('No concerning ingredients or patterns detected');
  return { verdict: 'safe', notes };
}