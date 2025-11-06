/**
 * TMWYA Pipeline End-to-End Tests
 * Tests the complete flow from user input to personality-injected response
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { handleUserMessage } from '../../src/core/chat/handleUserMessage';
import { parseMealLocal as parseMeal } from '../../src/shared/meal-nlu';

// Mock external dependencies
vi.mock('../../../lib/supabase', () => ({
  getSupabase: () => ({
    functions: {
      invoke: vi.fn().mockImplementation((fnName: string, options: any) => {
        // Mock nutrition-gemini for McChicken & McNuggets
        if (fnName === 'nutrition-gemini') {
          const body = options?.body || {};
          if (body.foodName?.toLowerCase().includes('mcchicken') || body.foodName?.toLowerCase().includes('mcnuggets')) {
            return Promise.resolve({
              data: {
                name: body.foodName,
                serving_label: '1 sandwich',
                grams_per_serving: 100,
                macros: { kcal: 365, protein_g: 15, carbs_g: 35, fat_g: 15, fiber_g: 2 },
                confidence: 0.9,
                source: 'gemini'
              },
              error: null
            });
          }
          return Promise.resolve({ data: null, error: null });
        }
        
        // Mock openai-chat for conversational responses
        if (fnName === 'openai-chat') {
          return Promise.resolve({
            data: {
              message: "I've calculated your meal macros. Review the details below and confirm if correct.",
              usage: { total_tokens: 245 }
            },
            error: null
          });
        }
        
        return Promise.resolve({
          data: {
            message: "I found your meal information. Here's what I calculated:\n\n2 eggs: 140 calories, 12g protein, 1g carbs, 10g fat\n½ cup oatmeal: 150 calories, 5g protein, 27g carbs, 3g fat\n\nTotal: 290 calories, 17g protein, 28g carbs, 13g fat\n\nWould you like me to log this meal for you?",
            usage: { total_tokens: 245 }
          },
          error: null
        });
      })
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: vi.fn().mockResolvedValue({ data: null })
        })
      })
    })
  })
}));

// Mock the providers to return stub responses
vi.mock('../../src/agents/shared/nutrition/providers', () => ({
  PROVIDERS: {
    brand: vi.fn().mockResolvedValue({
      name: "Test Food",
      serving_label: "serving",
      grams_per_serving: 100,
      macros: { calories: 250, protein_g: 20, carbs_g: 0, fat_g: 18, fiber_g: 0 },
      confidence: 0.5,
      source: "stub"
    }),
    gemini: vi.fn().mockResolvedValue(null),
    generic: vi.fn().mockResolvedValue({
      name: "Test Food",
      serving_label: "serving",
      grams_per_serving: 100,
      macros: { calories: 250, protein_g: 20, carbs_g: 0, fat_g: 18, fiber_g: 0 },
      confidence: 0.5,
      source: "stub"
    })
  }
}));

vi.mock('../../src/core/personality/patSystem', () => ({
  PAT_SYSTEM_PROMPT: 'You are Pat, the user\'s Hyper Intelligent Personal Assistant Team.'
}));

vi.mock('../../src/core/chat/store', () => ({
  storeMessage: vi.fn().mockResolvedValue('message-id'),
  loadRecentMessages: vi.fn().mockResolvedValue([])
}));

vi.mock('../../src/core/chat/sessions', () => ({
  ensureChatSession: vi.fn().mockResolvedValue('session-id')
}));

describe('TMWYA Pipeline E2E', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Case A: "I ate 2 eggs and 1/2 cup oatmeal"', () => {
    it('should trigger food_search → macro_lookup with personality injection', async () => {
      // First verify parser is working (fail fast if not)
      const parsed = parseMeal("2 eggs and 1/2 cup oatmeal");
      expect(parsed.items).toHaveLength(2); // Fail fast if parser broken
      expect(parsed.items[0].name.toLowerCase()).toContain('egg');
      expect(parsed.items[1].name.toLowerCase()).toContain('oatmeal');

      const result = await handleUserMessage("I ate 2 eggs and 1/2 cup oatmeal", {
        userId: 'test-user-id',
        messageHistory: [],
        userContext: {
          personality: {
            id: 'pat-v3',
            name: 'Pat',
            version: '3.0.0'
          }
        },
        mode: 'text'
      });

      // Verify response structure for TMWYA verify (returns roleData instead of text)
      expect(result).toHaveProperty('roleData');
      expect(result.roleData).toHaveProperty('type', 'tmwya.verify');
      expect(result.roleData).toHaveProperty('items');
      expect(result.roleData).toHaveProperty('skills_fired');
      expect(result).toHaveProperty('intent', 'meal_logging');
      expect(result).toHaveProperty('intentConfidence');

      // ✅ For TMWYA verify, response should now contain conversational text (not empty)
      expect(result.response).toBeTruthy();
      expect(result.response).toMatch(/^I /); // First-person tone
      expect(result.response).not.toMatch(/[😀🎉⭐🌟🎊]/); // No emojis

      // Verify metadata logging (this will be populated by our implementation)
      expect(result).toHaveProperty('meta');
      expect(result.meta).toMatchObject({
        personality_id: 'pat-v3',
        personality_name: 'Pat',
        personality_version: '3.0.0',
        agent: 'AskMeAnything', // or 'TellMeWhatYouAte' if exists
        routes_hit: expect.arrayContaining(['i ate']),
        skills_fired: expect.arrayContaining(['food_search', 'macro_lookup']),
        model: expect.any(String),
        tokens: expect.any(Number),
        cost_cents: expect.any(Number)
      });

      // If fallback, verify reason
      if (result.meta.agent === 'AskMeAnything' && result.meta.fallback_reason) {
        expect(result.meta.fallback_reason).toBe('TMWYA_missing');
      }
    });
  });

  describe('Case B: "Tell me the macros for a Big Mac"', () => {
    it('should trigger macro_lookup with proper metadata', async () => {
      const result = await handleUserMessage("Tell me the macros for a Big Mac", {
        userId: 'test-user-id',
        messageHistory: [],
        userContext: {
          personality: {
            id: 'pat-v3',
            name: 'Pat',
            version: '3.0.0'
          }
        },
        mode: 'text'
      });

      expect(result).toHaveProperty('response');
      expect(result.intent).toBe('food_question');

      // ✅ Verify personality tone (first-person, no emojis)
      expect(result.response).toMatch(/^I /);
      expect(result.response).not.toMatch(/[😀🎉⭐🌟🎊]/);

      // Verify metadata
      expect(result.meta).toMatchObject({
        personality_id: 'pat-v3',
        personality_name: 'Pat',
        personality_version: '3.0.0',
        agent: 'AskMeAnything',
        routes_hit: expect.arrayContaining(['macros']),
        skills_fired: expect.arrayContaining(['macro_lookup'])
      });
    });
  });

  describe('Case C: "Explain why ribeye is tender"', () => {
    it('should use AMA only with no skills fired', async () => {
      const result = await handleUserMessage("Explain why ribeye is tender", {
        userId: 'test-user-id',
        messageHistory: [],
        userContext: {
          personality: {
            id: 'pat-v3',
            name: 'Pat',
            version: '3.0.0'
          }
        },
        mode: 'text'
      });

      expect(result).toHaveProperty('response');
      expect(result.intent).toBe('general_chat');

      // ✅ Verify personality tone (first-person, no emojis)
      expect(result.response).toMatch(/^I /);
      expect(result.response).not.toMatch(/[😀🎉⭐🌟🎊]/);

      // Verify no skills fired
      expect(result.meta).toMatchObject({
        personality_id: 'pat-v3',
        personality_name: 'Pat',
        personality_version: '3.0.0',
        agent: 'AskMeAnything',
        routes_hit: [], // No routes hit
        skills_fired: [] // No skills fired
      });
    });
  });
});