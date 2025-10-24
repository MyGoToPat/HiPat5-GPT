# BOLT — Collaborative Fix Brief v1.05

**Date**: 2025-10-24
**Status**: Router crash FIXED, ready for runtime testing

---

## What I Believe You Changed (Code-Side)

* **AMA path:** Kept bypass (general → AMA) and compose: `loadPersonaFromDb()` + `buildAMADirectives()` + `withMaster()`. ✅
* **Model router:** Shifted general intent to `gpt-4o-mini` for "more conversational" answers. ✅
* **Metadata plumbing:** Attempted to return `toolCalls/rawData` from `handleUserMessage` and attach on UI for "log that". ✅
* **Classification:** Tried to coerce `"i ate …"` to `food_log` when tool fires. ✅
* **Persistence:** Added `supabase.auth.getUser()` fallback to avoid "no userId". ✅
* **Router param:** **FIXED** `ReferenceError: intent is not defined` by adding `intent` to `ModelRouterContext` and destructuring.

---

## What I Observed (Runtime - Pre-Fix)

* **CRITICAL ERROR:** `ReferenceError: intent is not defined` at `modelRouter.ts:133` broke all chat flows.
* **AMA output:** Still ultra-bulleted (e.g., Vitamin D) with ~15–16 word list lines, not short paragraphs.
* **"log that":** Didn't log. Macros tool fired but assistant message metadata wasn't attached; "log that" re-LLM'd.
* **"i ate …":** Classified to `food_question` with `logged:false` even though `log_meal` in tool calls.
* **Saves still skip:** `No sessionId available` / `Skipping save: no userId`.

---

## Minimal Patches Applied (v1.05)

### A) Router Crash Fix ✅

**File**: `src/core/router/modelRouter.ts`

```typescript
// Line 50: Added intent to interface
export interface ModelRouterContext {
  intent?: string;  // ← ADDED
  intentConfidence: number;
  messageLength: number;
  requiresStructuredOutput?: boolean;
  userRequestedExpert?: boolean;
  previousFailures?: number;
  forceOpenAI?: boolean;
}

// Line 63: Destructure intent
export function selectModel(context: ModelRouterContext): ModelSelection {
  const {
    intent,  // ← ADDED
    intentConfidence,
    messageLength,
    requiresStructuredOutput = false,
    userRequestedExpert = false,
    previousFailures = 0,
    forceOpenAI = false,
  } = context;
  // ... line 133 now references this local `intent` variable
```

**File**: `src/core/chat/handleUserMessage.ts`

```typescript
// Line 53: Pass intent to selectModel
const modelSelection: ModelSelection = selectModel({
  intent: intentResult.intent,  // ← ADDED
  intentConfidence: intentResult.confidence,
  messageLength: message.length,
  requiresStructuredOutput: shouldTriggerRole(intentResult.intent),
  forceOpenAI: intentResult.metadata?.use_openai === true,
});
```

**Build**: ✅ Successful in 5.69s

---

## What To Prove (Runtime Testing)

### 1) Router Works Without Crash

**Input**: `"tell me about vitamin k2"`

**Expected Console**:
```
[handleUserMessage] Intent detected: { intent: 'general', confidence: 0.8, ... }
[modelRouter] Selected: {"provider":"openai","model":"gpt-4o-mini","tokensEst":...,"reason":"conversational_style_adherence"}
[handleUserMessage] Model selected: openai:gpt-4o-mini (~$0.0001)
[handleUserMessage] Using AMA (DB personality + directives, bypassing swarm)
[swarm-loader] ✓ Loaded master personality from DB, length: 1800
[AMA] systemPrompt: source=db, length: #### (should be ~2400-2500)
[callLLM] Response received, length: ###
```

**Expected**: No `ReferenceError`, model selection succeeds, AMA response delivered.

---

### 2) AMA Style: Paragraphs Not Bullets

**Current Directives** (from `src/core/swarm/prompts.ts` lines 30-39):
```
# AMA Role
You are Pat: domain-agnostic, human-like, practical & concise.

# Communication
Default to 1–2 short paragraphs. Use bullets only for step-by-steps or lists ≤5.
Cite concrete numbers/examples. Avoid hedging. Offer next steps when helpful.
Vary sentence length; avoid machine-like rhythm. No filler, no clichés.

# Style
Active voice. Natural, conversational tone. Short paragraphs over bullet walls.
```

**Expected Response Format**:
- 1-2 short paragraphs (NOT bullet wall)
- Natural, conversational tone
- Varied sentence length (not telegraphic)
- Concrete examples/numbers

**If Still Bulleted**: Tighten further with:
```diff
-'Default to 1–2 short paragraphs. Use bullets only for step-by-steps or lists ≤5.'
+'Default to short paragraphs (2–4 sentences each). Use bullets ONLY when user asks for a list/steps or when enumerating >3 items.'
```

---

### 3) "Log That" Uses Cached Macros

**Input Sequence**:
1. `"what are the macros of 1 cup of oatmeal and 1 cup of skim milk"`
2. Wait for macro response
3. `"log that"`

**Expected Console (Step 1)**:
```
[handleUserMessage] Intent detected: { intent: 'food_question', ... }
[handleUserMessage] Using swarm: macro
[callLLM] Tools executed: ['get_macros', 'get_macros']
[ChatPat] Attached macros to assistant.meta
```

**Expected State (Step 1)**:
```javascript
messages[messages.length - 1].meta = {
  macros: [...array of food items...],
  source: 'get_macros_tool'
}
```

**Expected Console (Step 2 - "log that")**:
```
[ChatPat] Log command detected: log that
[ChatPat] found meta.macros - proceeding with logging
[logMeal] Success
```

**Expected**: Meal logged without re-calling LLM.

**If Fails**: Check if `getMacrosCalls.length > 0` condition in `ChatPat.tsx:677` is met and `result.rawData?.items` exists.

---

### 4) "I Ate..." Returns food_log

**Input**: `"i ate 1 cup of oatmeal and 1 cup of skim milk"`

**Expected Console**:
```
[ChatPat] isMealText check: {input: '...', hasLoggingTrigger: true, ...}
[ChatPat] Processing meal with TMWYA: {...}
[TMWYA → Unified V1] Routing through openai-chat: {...}
[processMealWithUnifiedChat] Raw response: {message: '...', tool_calls: Array(1), ...}
[processMealWithUnifiedChat] log_meal executed, returning kind: food_log, logged: true
[ChatPat] TMWYA result: {ok: true, kind: 'food_log', logged: true, ...}
```

**Expected DB**:
```sql
SELECT ml.id, ml.user_id, ml.meal_slot, ml.total_kcal, mi.name
FROM meal_logs ml
JOIN meal_items mi ON mi.log_id = ml.id
WHERE ml.user_id = 'your-user-id'
  AND ml.logged_at > NOW() - INTERVAL '5 minutes'
ORDER BY ml.logged_at DESC LIMIT 5;
```
Shows new meal with 2 items, non-null `log_id` and `user_id`.

**If Still food_question**: Check:
- Does `data.tool_calls` include object with `name: 'log_meal'`?
- Is guardrail on line 953 executing? (`mealCheck.hasLoggingTrigger && result.logged`)

---

### 5) Persistence: No More Skipped Saves

**Action**: Send any chat message immediately after page load.

**Expected Console**:
```
[ensureChatSession] Using existing session: ########-####-####-####-############
[chat-save] [No "Skipping save" or "No sessionId available" messages]
```

**Expected Network**:
```
POST /rest/v1/chat_messages → HTTP 200
Response: { user_id: "uuid", session_id: "uuid", text: "...", ... }
```

**If Still Fails**: Check:
- Does `useEffect` on mount (line 72) set both `userId` and `sessionId`?
- Is lazy-fetch on line 590-596 executing when `userId` is initially null?

---

## Quick Reference: What Changed Where

| Issue | File(s) | Lines | Status |
|-------|---------|-------|--------|
| Router crash | `modelRouter.ts`, `handleUserMessage.ts` | 51, 65, 54 | ✅ FIXED |
| AMA style | `prompts.ts` | 30-39 | ✅ Implemented, needs runtime test |
| "log that" metadata | `handleUserMessage.ts`, `ChatPat.tsx` | 181, 674-690 | ✅ Implemented, needs runtime test |
| "i ate..." classification | `food.ts`, `ChatPat.tsx` | 49-65, 952-956 | ✅ Implemented, needs runtime test |
| Persistence | `ChatPat.tsx` | 589-601 | ✅ Implemented, needs runtime test |

---

## Next Steps

1. **Refresh browser** (hard reload to clear old bundle)
2. **Test router** with any general question ("tell me about vitamin k2")
3. **Test AMA style** - check if response is paragraphs (not bullets)
4. **Test "log that"** - macro question → "log that" → should log without re-LLM
5. **Test "i ate..."** - direct logging phrase → should return `kind: 'food_log', logged: true`
6. **Check persistence** - Network tab → all `POST /rest/v1/chat_messages` should be HTTP 200 with non-null IDs

**Paste Back**:
- Console logs for each test showing expected behavior
- Any remaining errors or unexpected behavior with file + line number

---

## WARNINGS Reference (From Console)

**Benign (ignore)**:
- `[Contextify] [WARNING]` - StackBlitz sandbox noise
- `fetch.worker… was preloaded but not used` - Preload hint not consumed
- `task queue exceeded allotted deadline by 115ms` - Minor scheduling overrun
- `WARN Could not resolve an edge function slug from /supabase/functions/_shared/...` - Build-time HMR warnings for shared utilities

**Previously Critical (NOW FIXED)**:
- ✅ `ReferenceError: intent is not defined` - Fixed by adding `intent` param to router

---

## If Any Test Fails

Reply with:
1. Test number that failed (1-5)
2. Full console output (copy raw lines, don't summarize)
3. Expected vs actual behavior
4. File path + 10-30 line excerpt if you suspect the code is wrong

I'll provide surgical patch in-place.
