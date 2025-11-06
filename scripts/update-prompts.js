#!/usr/bin/env node
/**
 * Update TMWYA Prompts in Supabase
 * Fixes normalizer prompt that returns empty arrays
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Get authenticated user ID
async function getUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.error('❌ Not authenticated. Please log in first.');
    process.exit(1);
  }
  return user.id;
}

// Improved TMWYA Prompts
const prompts = [
  {
    agent_id: 'tmwya-normalizer',
    title: 'TMWYA Food Normalizer',
    content: `You are a food text normalizer. Parse messy meal descriptions into structured JSON.

**OUTPUT FORMAT (JSON ONLY, NO MARKDOWN):**
{
  "items": [
    {"name": "food_name", "amount": number_or_null, "unit": "unit_or_null"}
  ]
}

**RULES:**
1. Split on: commas, "and", "with", "plus"
2. Extract quantities: "3 eggs" → amount:3
3. Infer units when obvious:
   - eggs → "piece"
   - oatmeal, oats → "cup"
   - milk → "cup"
   - bread, toast, sourdough → "slice"
   - meat (chicken, beef, steak, ribeye) → "oz"
4. If no quantity: amount:null
5. If no unit: unit:null
6. Clean names: "large eggs" → "eggs", "skim milk" → "milk"

**EXAMPLES:**

Input: "i ate 3 whole eggs"
Output: {"items":[{"name":"eggs","amount":3,"unit":"piece"}]}

Input: "1 cup oatmeal with 1/2 cup skim milk"
Output: {"items":[{"name":"oatmeal","amount":1,"unit":"cup"},{"name":"milk","amount":0.5,"unit":"cup"}]}

Input: "2 slices sourdough bread"
Output: {"items":[{"name":"bread","amount":2,"unit":"slice"}]}

Input: "10 oz ribeye steak"
Output: {"items":[{"name":"ribeye","amount":10,"unit":"oz"}]}

Input: "eggs and toast" (no quantities)
Output: {"items":[{"name":"eggs","amount":null,"unit":"piece"},{"name":"toast","amount":null,"unit":"slice"}]}

**CRITICAL:** Return ONLY the JSON object. No explanations, no markdown fences, no \`\`\`json blocks.`,
    model: 'gpt-4o-mini',
    phase: 'pre',
    exec_order: 5,
    status: 'published',
    version: 3
  },
  {
    agent_id: 'tmwya-intent',
    title: 'TMWYA Intent Classifier',
    content: `Classify if user text is about logging a meal they ate.

**OUTPUT (JSON ONLY):**
{"type":"meal_logging"}
OR
{"type":"not_meal"}

**MEAL_LOGGING signals:**
- "i ate", "i had", "i just ate"
- "for breakfast/lunch/dinner"
- "consumed", "finished"
- Past tense food mentions

**NOT_MEAL signals:**
- "what are the macros" (question about food, not logging)
- "tell me the nutrition"
- Future tense: "i will eat", "should i eat"
- General questions

**EXAMPLES:**

Input: "i ate 3 eggs"
Output: {"type":"meal_logging"}

Input: "what are the macros of 3 eggs"
Output: {"type":"not_meal"}

Input: "i had oatmeal for breakfast"
Output: {"type":"meal_logging"}

Input: "tell me the nutrition for oatmeal"
Output: {"type":"not_meal"}

Return ONLY the JSON. No explanations.`,
    model: 'gpt-4o-mini',
    phase: 'pre',
    exec_order: 0,
    status: 'published',
    version: 2
  }
];

async function main() {
  console.log('🔧 Updating TMWYA prompts...\n');

  const userId = await getUserId();
  console.log(`✅ Authenticated as user: ${userId}\n`);

  for (const prompt of prompts) {
    console.log(`📝 Updating ${prompt.agent_id} v${prompt.version}...`);

    const { data, error } = await supabase
      .from('agent_prompts')
      .insert({
        ...prompt,
        created_by: userId
      });

    if (error) {
      if (error.code === '23505') {
        // Unique constraint violation - version already exists, update it
        console.log(`   ↻ Version exists, updating content...`);
        const { error: updateError } = await supabase
          .from('agent_prompts')
          .update({
            content: prompt.content,
            status: 'published',
            updated_at: new Date().toISOString()
          })
          .eq('agent_id', prompt.agent_id)
          .eq('version', prompt.version);

        if (updateError) {
          console.error(`   ❌ Update failed:`, updateError.message);
        } else {
          console.log(`   ✅ Updated successfully`);
        }
      } else {
        console.error(`   ❌ Insert failed:`, error.message);
      }
    } else {
      console.log(`   ✅ Created successfully`);
    }
  }

  console.log('\n🎉 Prompt updates complete!');
  console.log('\n📋 Verifying published prompts...\n');

  // Verify
  const { data: published, error: verifyError } = await supabase
    .from('agent_prompts_latest_published')
    .select('agent_id, version, model, phase, exec_order')
    .in('agent_id', prompts.map(p => p.agent_id))
    .order('agent_id');

  if (verifyError) {
    console.error('❌ Verification failed:', verifyError.message);
  } else {
    console.table(published);
  }

  console.log('\n✅ Done! Refresh your browser and test:');
  console.log('   1. Type: "i ate 3 eggs"');
  console.log('   2. Check console for: [nutrition] Normalizer parsed items: Array(1)');
  console.log('   3. Macros should appear (not all 0s)\n');
}

main().catch(console.error);

