import type { V1FoodItem, ClarificationPlan } from '../../../src/types/foodlog.ts';

export interface FoodTypePattern {
  keywords: string[];
  requiredFields: string[];
  questionTemplates: { [key: string]: string };
  priority: number; // Higher = ask first
}

const FOOD_TYPE_PATTERNS: FoodTypePattern[] = [
  // Protein shakes - highest priority for clarification
  {
    keywords: ['protein', 'whey', 'shake', 'smoothie', 'powder'],
    requiredFields: ['protein_brand', 'protein_macros', 'milk_type', 'milk_amount'],
    questionTemplates: {
      protein_brand: 'Which protein powder? Brand + flavor.',
      protein_macros: 'What are the macros per scoop on its label?',
      milk_type: 'Skim, 1%, 2%, or whole milk?',
      milk_amount: 'How much milk? (cup/oz/ml)',
    },
    priority: 10,
  },
  // Sandwiches/bread items
  {
    keywords: ['sandwich', 'bread', 'toast', 'bagel', 'wrap', 'tortilla'],
    requiredFields: ['bread_type', 'bread_quantity', 'toppings'],
    questionTemplates: {
      bread_type: 'What type of bread? (white/wheat/sourdough/etc)',
      bread_quantity: 'How many slices or pieces?',
      toppings: 'What toppings or fillings?',
    },
    priority: 8,
  },
  // Bowls/mixed dishes
  {
    keywords: ['bowl', 'salad', 'stir-fry', 'pasta', 'rice'],
    requiredFields: ['base_type', 'base_amount', 'protein_type', 'protein_amount'],
    questionTemplates: {
      base_type: 'What base? (rice/pasta/greens/etc)',
      base_amount: 'How much base? (cups/oz)',
      protein_type: 'What protein?',
      protein_amount: 'How much protein? (oz/grams)',
    },
    priority: 7,
  },
  // Generic missing fields
  {
    keywords: [],
    requiredFields: ['quantity', 'unit', 'brand', 'macros'],
    questionTemplates: {
      quantity: 'How much?',
      unit: 'What unit? (oz/cup/grams/etc)',
      brand: 'What brand?',
      macros: 'What are the macros on the label?',
    },
    priority: 1,
  },
];

/**
 * Generate clarification questions based on missing fields and food type
 * Maximum 2 questions per turn, prioritized by impact
 */
export function generateClarificationPlan(
  items: V1FoodItem[],
  missingFields: string[]
): ClarificationPlan {
  if (missingFields.length === 0) {
    return {
      missing: [],
      questions: [],
      max_followups: 1,
    };
  }

  // Detect food type from item names
  const foodType = detectFoodType(items);
  const questions: string[] = [];
  const prioritizedMissing: Array<{ field: string; priority: number; question: string }> = [];

  // Map missing fields to questions with priorities
  for (const field of missingFields) {
    const template = foodType?.questionTemplates[field] ||
      FOOD_TYPE_PATTERNS[FOOD_TYPE_PATTERNS.length - 1].questionTemplates[field];

    if (template) {
      prioritizedMissing.push({
        field,
        priority: foodType?.priority || 1,
        question: template,
      });
    } else {
      // Generic fallback
      prioritizedMissing.push({
        field,
        priority: 0,
        question: `Can you provide ${field.replace(/_/g, ' ')}?`,
      });
    }
  }

  // Sort by priority and take top 2
  prioritizedMissing.sort((a, b) => b.priority - a.priority);
  const topQuestions = prioritizedMissing.slice(0, 2);

  return {
    missing: topQuestions.map((q) => q.field),
    questions: topQuestions.map((q) => q.question),
    max_followups: 1,
  };
}

/**
 * Detect food type from item names to apply appropriate templates
 */
function detectFoodType(items: V1FoodItem[]): FoodTypePattern | null {
  const combinedText = items
    .map((item) => item.name.toLowerCase())
    .join(' ');

  // Find highest priority matching pattern
  let bestMatch: FoodTypePattern | null = null;
  let highestPriority = 0;

  for (const pattern of FOOD_TYPE_PATTERNS) {
    if (pattern.keywords.length === 0) continue; // Skip generic pattern

    const matchCount = pattern.keywords.filter((keyword) =>
      combinedText.includes(keyword)
    ).length;

    if (matchCount > 0 && pattern.priority > highestPriority) {
      bestMatch = pattern;
      highestPriority = pattern.priority;
    }
  }

  return bestMatch;
}

/**
 * Check if item is a protein shake (needs special handling)
 */
export function isProteinShake(item: V1FoodItem): boolean {
  const name = item.name.toLowerCase();
  const shakeKeywords = ['protein', 'whey', 'shake', 'powder'];
  return shakeKeywords.some((keyword) => name.includes(keyword));
}

/**
 * Generate specific questions for protein shakes
 */
export function getProteinShakeQuestions(item: V1FoodItem): string[] {
  const questions: string[] = [];

  // Check what's missing
  if (!item.brand) {
    questions.push('Which protein powder? Brand + flavor.');
  }

  if (!item.macros || !item.macros.calories) {
    questions.push('What are the macros per scoop on its label?');
  }

  // Check for milk-related info
  const hasMilk = item.name.toLowerCase().includes('milk');
  if (hasMilk) {
    // Need milk type and amount
    questions.push('How much milk? (cup/oz/ml)');
    if (questions.length < 2) {
      questions.push('Skim, 1%, 2%, or whole?');
    }
  }

  return questions.slice(0, 2); // Max 2 questions
}

/**
 * Check if we should ask about milk separately for protein shakes
 */
export function needsMilkClarification(items: V1FoodItem[]): boolean {
  return items.some((item) => {
    const name = item.name.toLowerCase();
    return (
      isProteinShake(item) &&
      (name.includes('with') || name.includes('milk') || name.includes('water'))
    );
  });
}

/**
 * Generate follow-up questions after initial clarification
 * Used when first response still leaves confidence < 0.90
 */
export function generateFollowUpQuestions(
  items: V1FoodItem[],
  previousMissing: string[]
): ClarificationPlan {
  // On follow-up, ask remaining questions not covered in first round
  const stillMissing = identifyStillMissingFields(items);
  const newMissing = stillMissing.filter((field) => !previousMissing.includes(field));

  if (newMissing.length === 0) {
    // No new questions - should open verify screen
    return {
      missing: stillMissing,
      questions: [],
      max_followups: 0,
    };
  }

  return generateClarificationPlan(items, newMissing);
}

/**
 * Identify fields that are still missing after clarification attempt
 */
function identifyStillMissingFields(items: V1FoodItem[]): string[] {
  const missing: string[] = [];

  for (const item of items) {
    if (!item.quantity || item.quantity <= 0) missing.push('quantity');
    if (!item.unit) missing.push('unit');
    if (!item.macros) {
      if (!item.brand) {
        missing.push('brand_or_macros');
      } else {
        missing.push('macros');
      }
    }
  }

  return [...new Set(missing)];
}

/**
 * Parse clarification response and update items
 * Returns updated items array
 */
export function applyClarificationResponse(
  items: V1FoodItem[],
  clarificationText: string
): V1FoodItem[] {
  // This is a simplified parser - in production, this would use LLM to extract structured data
  const updated = [...items];

  // Extract common patterns
  const brandMatch = clarificationText.match(/(?:brand|powder)[\s:]+([^\n,]+)/i);
  const quantityMatch = clarificationText.match(/(\d+(?:\.\d+)?)\s*(cup|oz|ml|g|scoop|slice)/i);
  const milkTypeMatch = clarificationText.match(/(skim|1%|2%|whole)\s*milk/i);

  // Apply updates to first item (simplified)
  if (updated.length > 0) {
    if (brandMatch) updated[0].brand = brandMatch[1].trim();
    if (quantityMatch) {
      updated[0].quantity = parseFloat(quantityMatch[1]);
      updated[0].unit = quantityMatch[2];
    }
    if (milkTypeMatch) {
      // Could add milk as separate item or update metadata
      updated[0].name += ` with ${milkTypeMatch[1]} milk`;
    }
  }

  return updated;
}
