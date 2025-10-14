# Testing Guide: "Log It" Feature

## Pre-Testing Setup

1. **Open Browser DevTools**
   - Press F12 or Right-click → Inspect
   - Navigate to Console tab
   - Filter for: `[handleUserMessage]`, `[callLLM]`, or `[ChatPat]`

2. **Clear Chat History** (optional)
   - Start with a fresh session to see clean logs

3. **Verify Edge Function is Deployed**
   - Check that openai-chat edge function is live
   - Should have tools enabled (log_meal, get_macros, etc.)

## Test Scenarios

### Scenario 1: Basic Single Food Item

**Purpose:** Verify basic "log it" flow with one food item

**Steps:**
```
1. Type: "what are the macros for 4 whole eggs"
2. Wait for Pat's response
3. Type: "log it"
4. Verify success
```

**Expected Console Output:**
```
[handleUserMessage] Message history loaded: 2 messages
[callLLM] Last 3 messages: ['user: what are the macros...']
[callLLM] Response received, length: 134
[ChatPat] Log command detected: log it
[ChatPat] No meta.macros - passing to LLM for tool-based logging
[handleUserMessage] Message history loaded: 4 messages
[callLLM] Last 3 messages: [
  'user: what are the macros for 4 whole eggs',
  'assistant: For 4 whole eggs: • Calories: 280 kcal...',
  'user: log it'
]
[callLLM] Tools executed: ['log_meal']
```

**Expected User Experience:**
```
You: what are the macros for 4 whole eggs

Pat: For 4 whole eggs:
• Calories: 280 kcal
• Protein: 24 g
• Carbs: 2 g
• Fat: 20 g

You: log it

Pat: Logged 4 eggs (280 kcal). You have 1720 calories remaining today.
```

**Database Verification:**
```sql
-- Check meal was logged
SELECT * FROM meal_logs
WHERE user_id = '<your-user-id>'
ORDER BY ts DESC
LIMIT 1;

-- Check meal items
SELECT * FROM meal_items
WHERE log_id = '<meal-log-id>';

-- Check day rollup updated
SELECT * FROM day_rollups
WHERE user_id = '<your-user-id>'
AND day_date = CURRENT_DATE;
```

### Scenario 2: Multiple Food Items

**Purpose:** Verify complex meals with multiple items

**Steps:**
```
1. Type: "tell me the macros for 3 whole eggs and 10 oz ribeye"
2. Wait for Pat's response
3. Type: "save it"
4. Verify success
```

**Expected Behavior:**
- Pat calculates combined totals
- "save it" extracts BOTH food items
- Both items appear as separate meal_items
- day_rollups shows combined totals

### Scenario 3: Command Variations

**Purpose:** Verify all command variations work

**Test Each:**
```
- "log it"
- "log that"
- "save it"
- "add it"
- "log"
```

**Expected:** All should trigger the same flow

### Scenario 4: Error Case - No Prior Discussion

**Purpose:** Verify graceful handling when no macros discussed

**Steps:**
```
1. Start fresh chat
2. Type: "log it"
3. Verify error handling
```

**Expected:**
- Pat asks: "What would you like to log?" or similar
- No crash, graceful response

### Scenario 5: Fallback Path (Legacy)

**Purpose:** Verify client-side fallback works if meta.macros exists

**Setup:** This requires message.meta.macros to be set (legacy flow)

**Expected Console:**
```
[ChatPat] Log command detected: log it
[ChatPat] Using client-side fallback - meta.macros found
```

**Note:** This is backup path, primary flow should use tools

## Console Log Reference

### Success Indicators

✅ **Message history loaded**
```
[handleUserMessage] Message history loaded: 6 messages
```
- Should be > 2 for "log it" to work
- Should include assistant's macro response

✅ **History shows previous exchange**
```
[callLLM] Last 3 messages: [
  'user: what are the macros for 4 whole eggs',
  'assistant: For 4 whole eggs: • Calories: 280...',
  'user: log it'
]
```

✅ **Tool was called**
```
[callLLM] Tools executed: ['log_meal']
```

### Failure Indicators

❌ **Missing history**
```
[handleUserMessage] Message history loaded: 0 messages
```
- Means session not loading correctly

❌ **No tool execution**
```
[callLLM] Response received, length: 87
// No "Tools executed" line
```
- LLM didn't recognize "log it" command
- Check system prompt is being used

❌ **Edge function error**
```
[callLLM] Edge function error: { ... }
```
- Check edge function deployment
- Verify OpenAI API key

## Troubleshooting

### Issue: "log it" shows generic response, no logging

**Diagnosis:**
```
[ChatPat] No meta.macros - passing to LLM for tool-based logging
[callLLM] Response received, length: 45
// No "Tools executed" line
```

**Cause:** LLM didn't call log_meal tool

**Fix:**
1. Verify edge function has tools.ts with log_meal definition
2. Check system prompt includes "log it" instructions
3. Ensure message history includes prior macro discussion

### Issue: No message history loaded

**Diagnosis:**
```
[handleUserMessage] Message history loaded: 0 messages
```

**Cause:** Session not created or messages not persisted

**Fix:**
1. Check chat_messages table has rows
2. Verify storeMessage() is being called
3. Check sessionId is valid UUID

### Issue: Tool execution fails

**Diagnosis:**
```
[callLLM] Tools executed: ['log_meal']
[callLLM] Response received: "I encountered an error..."
```

**Cause:** log_meal RPC failed

**Fix:**
1. Check meal_logs table exists
2. Verify log_meal RPC function exists in database
3. Check RPC parameters match tool schema

## Performance Expectations

- **Message history load:** < 50ms
- **LLM response time:** 1-3 seconds
- **Tool execution:** < 500ms
- **Total "log it" flow:** 2-4 seconds

## Success Criteria

✅ All 5 test scenarios pass
✅ Console logs show tool execution
✅ Database shows meal_logs entries
✅ day_rollups updated correctly
✅ No TypeScript or runtime errors
✅ User experience is smooth and fast

## Reporting Issues

If issues found, capture:
1. Console logs (full output)
2. Network tab showing edge function call
3. Database state (meal_logs, meal_items, day_rollups)
4. User's exact input sequence
5. Expected vs actual behavior

---

**Happy Testing! 🎉**
