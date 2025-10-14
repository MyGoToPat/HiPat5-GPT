# OpenAI Function Calling Implementation

## What Changed

I implemented **OpenAI Function Calling** (also called "Tool Use") so Pat can naturally understand conversation context and execute actions like logging food, just like ChatGPT does.

## The Problem You Described

**Before:**
```
User: "tell me the macros for a 10 oz new york steak"
Pat: [calculates and shows macros]
     "Next step: If you want to log this, say **Log**!"

User: "log it"
Pat: "Talk to me!" ❌ (Just text, no action taken)
```

Pat understood the intent was `food_log`, but **nothing actually happened**. The food wasn't logged to the database.

**Why:** The LLM was only generating text responses. There was no mechanism for it to actually **execute actions**.

## The Solution: OpenAI Function Calling

OpenAI's function calling lets the LLM **call functions** to take real actions, not just generate text.

### How It Works

1. **Define Tools** - We tell OpenAI what actions Pat can perform:
   - `log_meal(items, meal_slot)` - Log food to database
   - `get_remaining_macros()` - Check remaining calories/macros
   - `undo_last_meal()` - Delete last meal
   - `get_macros(food_description)` - Calculate macros (no logging)

2. **LLM Decides When to Use Tools** - OpenAI automatically decides:
   - User says "log it" → Call `log_meal()`
   - User says "how many calories left?" → Call `get_remaining_macros()`
   - User asks "macros for steak?" → Just answer (no tool needed)

3. **Execute & Respond** - When LLM calls a tool:
   - Our code executes the action (writes to database)
   - Returns result to LLM
   - LLM generates natural response with the result

### Example Flow

```
User: "tell me the macros for a 10 oz new york steak"

→ LLM uses its knowledge to calculate
→ Responds: "For a 10 oz New York steak:
   • Calories: 680 kcal
   • Protein: 82 g
   • Fat: 38 g
   • Carbs: 0 g"

User: "log it"

→ LLM recognizes context: user wants to log the steak
→ LLM CALLS TOOL: log_meal({
    items: [{
      name: "new york steak",
      quantity: 10,
      unit: "oz",
      macros: { kcal: 680, protein_g: 82, fat_g: 38, carbs_g: 0, fiber_g: 0 }
    }],
    meal_slot: "dinner"  // inferred from time of day
  })
→ Our code executes the log_meal RPC
→ Food is saved to database ✅
→ LLM responds: "Logged 10 oz New York steak. You have 1,320 calories remaining today."
```

## What Got Implemented

### 1. Tool Definitions (`tools.ts`)

Created JSON schemas that OpenAI uses to understand each tool:

```typescript
export const PAT_TOOLS = [
  {
    type: "function",
    function: {
      name: "log_meal",
      description: "Log food items to the user's meal log...",
      parameters: {
        // JSON schema defining structure
        items: [...],
        meal_slot: "breakfast" | "lunch" | "dinner" | "snack"
      }
    }
  },
  // ... other tools
];
```

### 2. Tool Executor (`tools.ts`)

Functions that actually execute each tool:

```typescript
async function logMealTool(args, userId, supabase) {
  // 1. Transform LLM output to database format
  const itemsForDb = args.items.map(item => ({
    name: item.name,
    quantity: String(item.quantity),
    unit: item.unit,
    energy_kcal: String(item.macros.kcal),
    // ... other macros
  }));

  // 2. Call Supabase RPC to save to database
  const { data: mealLogId, error } = await supabase.rpc('log_meal', {
    p_ts: timestamp || new Date().toISOString(),
    p_meal_slot_text: meal_slot,
    p_items: itemsForDb
  });

  // 3. Return result to LLM
  return {
    success: true,
    result: { meal_log_id: mealLogId, totals: {...} }
  };
}
```

### 3. Updated OpenAI Edge Function (`index.ts`)

Modified to support tool calling:

```typescript
// 1. Include tools in OpenAI API call
const response = await fetch('https://api.openai.com/v1/chat/completions', {
  body: JSON.stringify({
    model: 'gpt-4o-mini',
    messages: messagesWithSystem,
    tools: PAT_TOOLS,          // ← New: Available tools
    tool_choice: 'auto'        // ← Let LLM decide when to use them
  })
});

// 2. Check if LLM wants to call tools
if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
  // 3. Execute each tool call
  for (const toolCall of assistantMessage.tool_calls) {
    const result = await executeTool(toolCall.function.name, toolCall.function.arguments, {
      userId, supabaseUrl, supabaseKey
    });

    toolResults.push({
      tool_call_id: toolCall.id,
      role: 'tool',
      content: JSON.stringify(result)
    });
  }

  // 4. Call OpenAI again with tool results
  // LLM generates final response based on tool execution
}
```

### 4. Updated Client (`handleUserMessage.ts`)

Pass `userId` so edge function can execute tools on user's behalf:

```typescript
const { data, error } = await supabase.functions.invoke('openai-chat', {
  body: {
    messages,
    stream: false,
    userId // ← New: Required for tool execution
  }
});
```

## Why This Is Better

### Before (Intent Routing)
- **Manual routing**: Code had to detect "log" intent
- **No context**: Couldn't extract food from history
- **Brittle**: Required exact keywords
- **No action**: LLM just generated text

### After (Function Calling)
- **Natural understanding**: LLM reads conversation naturally
- **Context aware**: Extracts food items from previous messages
- **Flexible**: Works with "log it", "save that", "add to my diary"
- **Takes action**: Actually writes to database

## The Key Insight

You were right: **The LLM should think naturally and be dynamically intelligent**.

The old "intent routing" system was over-engineered. It tried to manually detect what the user wanted and then call specific code paths.

**OpenAI Function Calling** removes all that complexity. The LLM:
1. Reads the conversation naturally
2. Understands what the user wants
3. Decides which tools to use (if any)
4. Executes actions
5. Responds with results

It's exactly like ChatGPT with plugins/tools.

## Available Tools

Pat now has 4 tools:

1. **`log_meal`** - Log food items with macros
2. **`get_macros`** - Calculate nutrition (without logging)
3. **`get_remaining_macros`** - Check daily progress
4. **`undo_last_meal`** - Remove last logged meal

The LLM automatically decides when to use each one based on user intent.

## Testing

Try these scenarios:

```
# Scenario 1: Calculate then log
User: "tell me the macros for 10 oz ribeye steak"
Pat: [calculates and shows]
User: "log it"
Pat: [CALLS log_meal tool] "Logged! You have X calories remaining."

# Scenario 2: Direct logging
User: "I ate 2 eggs and a banana for breakfast"
Pat: [CALLS log_meal tool with calculated macros]

# Scenario 3: Check progress
User: "how many calories do I have left?"
Pat: [CALLS get_remaining_macros tool] "You have 1,450 calories remaining."

# Scenario 4: Undo mistake
User: "undo that last meal"
Pat: [CALLS undo_last_meal tool] "Removed your last meal entry."
```

## Files Modified

1. **`supabase/functions/openai-chat/tools.ts`** - New file with tool definitions and execution
2. **`supabase/functions/openai-chat/index.ts`** - Updated to support tool calling
3. **`src/core/chat/handleUserMessage.ts`** - Pass userId for tool execution
4. **`supabase/functions/_shared/tools/schemas.ts`** - Tool schemas (for reference)
5. **`supabase/functions/_shared/tools/executor.ts`** - Tool executor (for reference)

## Next Steps

The edge function has been updated with these changes. The next time you deploy or the function refreshes, Pat will be able to:

1. Understand "log it" commands naturally
2. Extract food from conversation history
3. Actually execute the logging action
4. Respond with confirmation and remaining macros

You were absolutely right - this is how it should work. The LLM should be smart enough to understand context and take actions, not require rigid keyword matching.
