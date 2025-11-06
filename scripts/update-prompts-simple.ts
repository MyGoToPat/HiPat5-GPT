/**
 * Update TMWYA Prompts - Simple Version
 * Run this via: npx tsx scripts/update-prompts-simple.ts
 */

import { getSupabase } from '../src/lib/supabase';

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

**CRITICAL:** Return ONLY the JSON object. No explanations, no markdown fences.`,
    model: 'gpt-4o-mini',
    phase: 'pre',
    exec_order: 5,
    status: 'published',
    version: 3
  }
];

async function main() {
  console.log('🔧 Updating TMWYA prompts...\n');

  const supabase = getSupabase();

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.error('❌ Not authenticated');
    return;
  }

  console.log(`✅ User: ${user.id}\n`);

  for (const prompt of prompts) {
    console.log(`📝 Updating ${prompt.agent_id} v${prompt.version}...`);

    // Try insert
    const { error } = await supabase
      .from('agent_prompts')
      .insert({
        ...prompt,
        created_by: user.id
      });

    if (error) {
      if (error.code === '23505') {
        // Version exists, update it
        console.log(`   ↻ Updating existing...`);
        const { error: updateError } = await supabase
          .from('agent_prompts')
          .update({
            content: prompt.content,
            status: 'published'
          })
          .eq('agent_id', prompt.agent_id)
          .eq('version', prompt.version);

        if (updateError) {
          console.error(`   ❌ ${updateError.message}`);
        } else {
          console.log(`   ✅ Updated`);
        }
      } else {
        console.error(`   ❌ ${error.message}`);
      }
    } else {
      console.log(`   ✅ Created`);
    }
  }

  console.log('\n✅ Done! Test: "i ate 3 eggs"\n');
}

main().catch(console.error);

