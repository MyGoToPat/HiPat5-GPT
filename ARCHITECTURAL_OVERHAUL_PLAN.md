# Architectural Overhaul: LLM-First Design

## Current Problems

### 1. Dual Competing Pathways
**Frontend (ChatPat.tsx)**:
- Manually detects "I ate..." → calls TMWYA
- Manually detects "tell me macros" → calls handleUserMessage
- Manually detects "log it" → checks for recent macros → FAILS

**Backend (OpenAI Function Calling)**:
- Has `log_meal` tool defined
- Never gets called because frontend intercepts everything
- Can't access conversation history from other pathway

### 2. Context Loss
```
User: "tell me the macros for 4 whole eggs"
→ Goes to handleUserMessage (no tools called, just text response)

User: "log it"
→ Frontend checks: "has logging trigger? NO (just 'log it')"
→ Goes to handleUserMessage (LLM has no access to TMWYA analysis)
→ RESULT: "No recent macro discussion to log" ❌
```

### 3. Button Failures
```
User: Clicks "Tell me what you ate" button
→ Calls setConversationMode('food_log')
→ ERROR: setConversationMode is not a function
```

## The Root Cause

**The frontend is trying to be smart instead of letting the LLM be smart.**

## The Solution: LLM-First Architecture

### Principle
**Send EVERYTHING to the LLM with tools. Let IT decide what to do.**

### New Flow
```
User: Any message
  ↓
ChatPat.tsx (UI only - no decision logic)
  ↓
handleUserMessage() with OpenAI Function Calling
  ↓
LLM decides:
  - Just answer? → Returns text
  - Need nutrition data? → Calls get_macros OR log_meal tool
  - Log food? → Calls log_meal tool (with history context)
  - Check progress? → Calls get_remaining_macros tool
  ↓
Tools execute TMWYA/database operations
  ↓
LLM responds with natural language + tool results
```

### Key Changes

#### 1. Remove Frontend Decision Logic
```typescript
// ❌ OLD: ChatPat decides
if (isMealText(input)) {
  processMealWithTMWYA(); // Direct TMWYA call
} else {
  handleUserMessage(); // Chat handler
}

// ✅ NEW: Always send to LLM
handleUserMessage(input, { userId, sessionId });
// LLM decides if it needs TMWYA via log_meal tool
```

#### 2. Enhanced Tool: `log_meal`
Make it handle BOTH scenarios:
- **Scenario A**: User provides macros: `"log 4 eggs with 280 cal, 24g protein"`
  → LLM extracts values, calls tool with structured data

- **Scenario B**: User provides description: `"log 4 whole eggs"`
  → Tool internally calls TMWYA to get nutrition data
  → Then logs to database

#### 3. New Tool: `calculate_macros_for_logging`
```typescript
{
  name: "calculate_macros_for_logging",
  description: "Calculate nutrition for food when user wants to log but didn't provide macros. Returns calculated values ready for logging.",
  parameters: {
    food_description: string // "4 whole eggs", "10 oz ribeye steak"
  }
}
```

This calls TMWYA, returns structured data, then LLM can immediately call `log_meal` with the results.

#### 4. Conversation Button Actions
```typescript
// ❌ OLD: Set a "mode"
<button onClick={() => setConversationMode('food_log')}>

// ✅ NEW: Send a message
<button onClick={() => sendMessage("Tell me what you ate today")}>
```

The LLM sees "Tell me what you ate today" and responds naturally.

## Implementation Steps

### Step 1: Update Tools (Backend)
1. Keep `log_meal` for when macros are known
2. Add `calculate_and_log_meal` that:
   - Accepts food description
   - Calls TMWYA internally
   - Shows verification screen
   - Logs to database
   - Returns confirmation

### Step 2: Simplify ChatPat (Frontend)
1. Remove `isMealText()` check
2. Remove `processMealWithTMWYA()` direct calls
3. Remove conversation mode logic
4. **Always** call `handleUserMessage()`
5. Handle tool responses (show verification screen if needed)

### Step 3: Update System Prompt
Tell the LLM:
```
When users mention food they ate or want to log:
1. If they provide macros → call log_meal directly
2. If they just describe food → call calculate_and_log_meal
3. If they say "log it" after you told them macros → call log_meal with the values from your previous response

You remember the conversation. Extract food items from your previous messages.
```

### Step 4: Handle Verification Screen
When `calculate_and_log_meal` tool returns, it includes:
```json
{
  "needs_verification": true,
  "analysis_result": { ... },
  "message_for_user": "I calculated the macros. Review and confirm?"
}
```

ChatPat shows verification screen, user confirms, then we complete the log.

## Example Flows

### Flow 1: Ask Macros Then Log
```
User: "tell me the macros for 4 whole eggs"
→ LLM: Calls get_macros("4 whole eggs")
→ Tool: Returns { kcal: 280, protein: 24, ... }
→ LLM: "For 4 whole eggs: • Calories: 280 kcal • Protein: 24g..."

User: "log it"
→ LLM: (reads history, sees "4 whole eggs" with macros)
→ LLM: Calls log_meal([{name: "egg", quantity: 4, macros: {...}}])
→ Tool: Saves to database
→ LLM: "Logged 4 eggs. You have 1,720 calories remaining."
```

### Flow 2: Direct Logging
```
User: "i ate 4 whole eggs"
→ LLM: Calls calculate_and_log_meal("4 whole eggs")
→ Tool: Calls TMWYA → Returns verification data
→ ChatPat: Shows verification screen
User: Confirms
→ Completes log_meal call
→ LLM: "Logged! You have 1,720 calories remaining."
```

### Flow 3: Button Click
```
User: Clicks "Tell me what you ate"
→ Sends message: "Tell me what you ate today"
→ LLM: "What did you eat today? I'll calculate the macros and log it for you."

User: "4 eggs and bacon"
→ LLM: Calls calculate_and_log_meal("4 eggs and bacon")
→ (verification flow)
```

## Benefits

1. **Context Preserved**: LLM has full conversation history
2. **Natural Language**: Handles any phrasing ("log it", "save that", "add to my log")
3. **No Frontend Logic**: ChatPat just displays, doesn't decide
4. **Unified Path**: One path through handleUserMessage
5. **Tool Composition**: LLM can chain tools (calculate → log)

## Migration Strategy

1. **Phase 1**: Add new enhanced tools
2. **Phase 2**: Update ChatPat to always use handleUserMessage
3. **Phase 3**: Remove old TMWYA direct calls
4. **Phase 4**: Test all scenarios
5. **Phase 5**: Remove dead code

## Key Insight

You were right: **Let the LLM think naturally and be dynamically intelligent.**

The frontend should be dumb:
- Display messages
- Show verification screens
- Handle button clicks by sending messages

The LLM should be smart:
- Understand intent
- Extract context from history
- Decide which tools to use
- Chain tool calls
- Respond naturally

This is how ChatGPT works. This is how Pat should work.
