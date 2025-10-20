import type { V1FoodItem } from '../../../src/types/foodlog.ts';
import type { ParsedMeal } from './mealHandler.ts';

const MEAL_PARSING_SYSTEM_PROMPT = `You are a food parsing expert. Extract structured food data from user messages.

Return JSON in this exact format:
{
  "items": [
    {
      "name": "egg",
      "quantity": 3,
      "unit": "whole",
      "brand": null,
      "macros": {
        "calories": 215,
        "protein": 19,
        "carbs": 1,
        "fat": 15,
        "fiber": 0
      },
      "confidence": 0.95
    }
  ],
  "confidence": 0.95
}

Rules:
1. Extract all food items mentioned
2. Parse quantity and unit (oz, cup, grams, whole, slice, etc)
3. If brand mentioned, include it
4. Estimate macros if you know them (use your training data)
5. Confidence 0-1: 0.9+ = very confident, 0.7-0.9 = need clarification, <0.7 = need verification
6. For unknown foods, set macros to null and confidence < 0.7
7. Normalize food names to simple terms (e.g., "large eggs" → "egg")
8. Always return valid JSON, never explanatory text

Examples:
User: "3 whole eggs"
{"items":[{"name":"egg","quantity":3,"unit":"whole","brand":null,"macros":{"calories":215,"protein":19,"carbs":1,"fat":15,"fiber":0},"confidence":0.95}],"confidence":0.95}

User: "protein shake with milk"
{"items":[{"name":"protein powder","quantity":1,"unit":"scoop","brand":null,"macros":null,"confidence":0.5},{"name":"milk","quantity":1,"unit":"cup","brand":null,"macros":null,"confidence":0.6}],"confidence":0.5}`;

/**
 * Parse user message into structured food items using OpenAI
 */
export async function parseMealWithOpenAI(userMessage: string): Promise<ParsedMeal> {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: MEAL_PARSING_SYSTEM_PROMPT },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    const parsed = JSON.parse(content);

    return {
      items: parsed.items || [],
      llmConfidence: parsed.confidence || 0.5,
      rawResponse: content,
    };
  } catch (error) {
    console.error('[mealParser] Error:', error);
    // Return empty result on error
    return {
      items: [],
      llmConfidence: 0,
      rawResponse: '',
    };
  }
}

/**
 * Detect if message is a meal logging intent
 */
export function isMealLoggingIntent(message: string): boolean {
  const lowerMessage = message.toLowerCase();

  // Trigger phrases
  const triggers = [
    'i ate',
    'i had',
    'i consumed',
    'just ate',
    'just had',
    'for breakfast',
    'for lunch',
    'for dinner',
    'log it',
    'log that',
    'save it',
    'add it',
    'track it',
  ];

  // Food-related keywords
  const foodKeywords = [
    'egg', 'chicken', 'protein', 'shake', 'milk', 'bread', 'rice',
    'pasta', 'salad', 'sandwich', 'burger', 'pizza', 'fruit',
    'vegetable', 'beef', 'fish', 'cheese', 'yogurt', 'oatmeal',
  ];

  // Check for triggers
  const hasTrigger = triggers.some(trigger => lowerMessage.includes(trigger));

  // Check for food keywords with quantity indicators
  const hasQuantity = /\d+/.test(message);
  const hasFoodKeyword = foodKeywords.some(keyword => lowerMessage.includes(keyword));

  return hasTrigger || (hasQuantity && hasFoodKeyword);
}

/**
 * Detect if message is asking for macros (not logging)
 */
export function isMacroQuestion(message: string): boolean {
  const lowerMessage = message.toLowerCase();

  const questionWords = ['what', 'how many', 'how much', 'tell me', 'show me'];
  const macroWords = ['macro', 'calorie', 'protein', 'carb', 'fat', 'nutrition'];

  const hasQuestion = questionWords.some(q => lowerMessage.includes(q));
  const hasMacroWord = macroWords.some(m => lowerMessage.includes(m));

  // Don't confuse "log it" commands with questions
  if (lowerMessage.includes('log') || lowerMessage.includes('save') || lowerMessage.includes('add')) {
    return false;
  }

  return hasQuestion && hasMacroWord;
}
