/**
 * Sanitize Normalized Items
 * Post-processes LLM normalizer output to fix quantity/serving_label issues
 */

import type { NormalizedItem } from '../../agents/shared/nutrition/providers/types';
import { detectBrandFromItemName } from '../../agents/shared/nutrition/providers/brandServings';

export interface ParsedItem {
  name: string;
  amount: number | null;
  unit: string | null;
}

/**
 * Sanitize normalized items with quantity/serving rules
 * 
 * Rules:
 * - "10-piece" → qty=1, serving_label="10-piece"
 * - "two 10-piece" / "2 orders of 10-piece" → qty=2, serving_label="10-piece"
 * - "20-piece" → qty=1, serving_label="20-piece"
 * - "large fries" → qty=1, size_label="large"
 */
export function sanitizeNormalizedItems(
  items: ParsedItem[],
  brands: Map<string, string> = new Map() // From clarification layer
): NormalizedItem[] {
  return items.map(item => {
    const normalized: NormalizedItem = {
      name: item.name.toLowerCase().trim(),
      amount: item.amount ?? 1,
      unit: item.unit,
      is_branded: false,
      brand: null,
      serving_label: null,
      size_label: null
    };
    
    // Detect brand from name or from brands map
    // ✅ Apply brand normalization early
    const detectedBrand = detectBrand(normalized.name, brands) || detectBrandFromItemName(normalized.name);
    if (detectedBrand) {
      normalized.brand = detectedBrand;
      normalized.is_branded = true;
    }
    
    // ✅ Force brand detection for common fast food chains even if not explicitly detected
    if (!normalized.is_branded) {
      const brandPattern = /mcdonald|starbucks|wendy|burger.?king|subway|taco.?bell|costco|kirkland/i;
      if (brandPattern.test(normalized.name)) {
        // Extract brand name from pattern match
        const matched = normalized.name.match(brandPattern);
        if (matched) {
          const matchedText = matched[0].toLowerCase();
          if (matchedText.includes('mcdonald')) normalized.brand = "McDonald's";
          else if (matchedText.includes('starbucks')) normalized.brand = "Starbucks";
          else if (matchedText.includes('wendy')) normalized.brand = "Wendy's";
          else if (matchedText.includes('burger') || matchedText.includes('king')) normalized.brand = "Burger King";
          else if (matchedText.includes('subway')) normalized.brand = "Subway";
          else if (matchedText.includes('taco') || matchedText.includes('bell')) normalized.brand = "Taco Bell";
          else if (matchedText.includes('costco') || matchedText.includes('kirkland')) normalized.brand = "Costco";
          
          if (normalized.brand) {
            normalized.is_branded = true;
          }
        }
      }
    }
    
    // Parse "N-piece" patterns (e.g., "10-piece", "20-piece")
    const pieceMatch = normalized.name.match(/(\d{1,3})[- ]?(?:piece|pc|pcs|pieces)\b/i);
    if (pieceMatch) {
      const pieces = parseInt(pieceMatch[1]);
      normalized.serving_label = `${pieces}-piece`;
      // Remove the "10-piece" from name
      normalized.name = normalized.name.replace(/\d{1,3}[- ]?(?:piece|pc|pcs|pieces)\b/i, '').trim();
      // If amount was the piece count, reset to 1 (e.g., "10-piece" → qty=1, serving="10-piece")
      if (normalized.amount === pieces && (normalized.unit === 'piece' || normalized.unit === null)) {
        normalized.amount = 1;
        normalized.unit = null;
      }
    }
    
    // Parse "N orders of M-piece" patterns (e.g., "two 10-piece", "2 orders of 10-piece")
    const orderMatch = normalized.name.match(/(\d+)\s*(?:orders?|boxes?)\s*(?:of\s*)?(\d+)[- ]?(?:piece|pc)/i);
    if (orderMatch) {
      normalized.amount = parseInt(orderMatch[1]);
      normalized.serving_label = `${orderMatch[2]}-piece`;
      normalized.name = normalized.name.replace(/\d+\s*(?:orders?|boxes?)\s*(?:of\s*)?\d+[- ]?(?:piece|pc)/i, '').trim();
    }
    
    // ✅ Parse size labels (e.g., "large fries", "small fries")
    // Enhanced to handle more items and normalize fries name
    const sizeMatch = normalized.name.match(/\b(small|medium|large|extra.?large|xl|kids?)\b/i);
    if (sizeMatch && (
      normalized.name.includes('fries') || 
      normalized.name.includes('drink') || 
      normalized.name.includes('shake') ||
      normalized.name.includes('soda') ||
      normalized.name.includes('coffee') ||
      normalized.name.includes('beverage')
    )) {
      normalized.size_label = sizeMatch[1].toLowerCase();
      // ✅ Remove size from name but keep it for lookup
      normalized.name = normalized.name.replace(/\b(small|medium|large|extra.?large|xl|kids?)\b/i, '').trim();
      
      // ✅ Normalize fries name after size extraction
      if (normalized.name.includes('fries')) {
        normalized.name = 'fries';  // Normalize to just "fries"
      }
    }
    
    // Clean up name (remove extra spaces)
    normalized.name = normalized.name.replace(/\s+/g, ' ').trim();
    
    return normalized;
  });
}

/**
 * Detect brand from item name or brands map
 */
function detectBrand(name: string, brands: Map<string, string>): string | null {
  // Check brands map first (from clarification layer)
  for (const [itemKey, brand] of brands.entries()) {
    if (name.toLowerCase().includes(itemKey.toLowerCase())) {
      return brand;
    }
  }
  
  // ✅ Brand normalization from product cues is handled by detectBrandFromItemName
  // which is called before this function
  
  // Pattern matching for common brands (keep as fallback)
  const brandPatterns: Array<[RegExp, string]> = [
    [/mcdonalds|mcd|mickey/i, "McDonald's"],
    [/starbucks|sbux/i, "Starbucks"],
    [/wendy/i, "Wendy's"],
    [/burger.?king|bk/i, "Burger King"],
    [/subway/i, "Subway"],
    [/taco.?bell/i, "Taco Bell"]
  ];
  
  for (const [pattern, brand] of brandPatterns) {
    if (pattern.test(name)) {
      return brand;
    }
  }
  
  return null;
}






