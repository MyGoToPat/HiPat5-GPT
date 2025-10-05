# Deterministic Macro Response System - Implementation Summary

**Date:** October 5, 2025
**Status:** ✅ Complete - Build Successful

## Overview

Implemented a deterministic, structured macro response system that delivers itemized nutrition data consistently across Chat and TMWYA paths, with intent-based routing and proper database integrity.

---

## Changes Made

### 1. **Standardized Macro Payload Structure** (Type System)

**File:** `src/types/chat.ts`

Added structured TypeScript interfaces for macro data:

```typescript
export interface MacroPayload {
  items: MacroItem[];
  totals: MacroTotals;
}

export interface MacroItem {
  name: string;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export interface MacroTotals {
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

// Extended ChatMessage to support payload
export interface ChatMessage {
  id: string;
  text: string;
  timestamp: Date;
  isUser: boolean;
  meta?: {
    macros?: MacroPayload;
    route?: string;
  };
}
```

**Impact:** Single source of truth for macro data across all paths.

---

### 2. **Deterministic Macro Formatter** (TypeScript, Not LLM)

**File:** `src/lib/personality/postAgents/macroFormatter.ts`

Implemented pure TypeScript rendering function:

- **Primary Path**: Reads from `draft.meta.macros` (structured JSON)
- **Fallback Path**: Regex-based extraction if structured data missing
- **Protection Markers**: Wraps output in `[[PROTECT_BULLETS_START/END]]` to preserve formatting through post-agent chain
- **Per-Item Breakdown**: Renders each food item separately, then totals
- **Conditional "Log" Hint**: Only appends hint for `macro-question` route (not logging screens)
- **Drift Protection**: Recomputes totals from items, uses recomputed if difference > 3%

**Format Example:**
```
[[PROTECT_BULLETS_START]]
3 whole eggs
• Calories: 215 kcal
• Protein: 18.9 g
• Carbs: 1.0 g
• Fat: 14.3 g

2 slices sourdough
• Calories: 210 kcal
• Protein: 9.0 g
• Carbs: 42.0 g
• Fat: 2.0 g

10 oz ribeye
• Calories: 825 kcal
• Protein: 67.2 g
• Carbs: 0 g
• Fat: 60.1 g

Totals
• Calories: 1250 kcal
• Protein: 95.1 g
• Carbs: 43.0 g
• Fat: 76.4 g

Log
Just say "Log" if you want me to log this in your macros as a meal.
[[PROTECT_BULLETS_END]]
```

**Token Savings:** Eliminates LLM cost for formatting (pure TS rendering).

---

### 3. **Intent-Based Routing** (Orchestrator + Routing Table)

**Files:**
- `src/lib/personality/routingTable.ts`
- `src/lib/personality/orchestrator.ts`

#### Routing Table Update

Added `macro-question` intent pattern to distinguish questions from logging:

```typescript
'macro-question': {
  type: "role",
  patterns: [
    /\b(tell\s+me|what\s+are|what\s+is|how\s+many|give\s+me|show\s+me)\s+(the\s+)?(macros?|calories?|nutrition)\s+(of|for|in)\b/i,
    /\b(macros?|calories?|nutrition)\s+(of|for|in)\s+/i,
  ],
}
```

#### Orchestrator Changes

1. **Updated `finishWithPostAgents`** signature to accept structured draft:
   ```typescript
   async function finishWithPostAgents(
     draft: string | { text: string; meta?: any },
     context: Record<string, any>,
     initialError?: string
   )
   ```

2. **Special handling for macro-formatter**:
   - Calls deterministic TypeScript function instead of LLM
   - Passes `draft.meta` for structured rendering

3. **Added `runRoleSpecificLogic` for `macro-question`**:
   - Parses food items from user message
   - Calls nutrition resolver for each item
   - Builds structured `MacroPayload`
   - Returns object with `text` + `meta.macros`

**Intent Flow:**
1. User: "tell me the macros of 3 eggs and 2 slices sourdough"
2. `fastRoute` detects `macro-question` intent
3. Orchestrator calls `runRoleSpecificLogic` → nutrition resolver
4. Returns structured payload with `route: 'macro-question'`
5. `finishWithPostAgents` → `macro-formatter` renders deterministically
6. Output includes per-item bullets + "Log" hint

---

### 4. **"Log" Command Bridge to TMWYA**

**File:** `src/components/ChatPat.tsx`

Enhanced log command detection to use structured payload:

```typescript
if (lowerInput === 'log' || lowerInput === 'log it') {
  const lastPatMessage = [...messages].reverse().find(m => !m.isUser && (
    m.meta?.macros || m.text.includes('kcal')
  ));

  if (lastPatMessage && lastPatMessage.meta?.macros?.items) {
    // Use structured payload
    const foodItems = lastPatMessage.meta.macros.items.map(item => item.name);
    const foodText = foodItems.join(', ');
    handleMealTextInput(`I ate ${foodText}`);
    return;
  }

  // Fallback: regex extraction from user's previous message
  ...
}
```

**Result:** Bridges macro-question → TMWYA with exact items, not reparsed text.

---

### 5. **Required Agents Enabled**

**File:** `src/config/personality/agentsRegistry.ts`

Added missing agents required by orchestrator:

#### privacy-redaction Agent
- **Phase:** pre
- **Order:** 0.5
- **Purpose:** Redacts PII (emails, phone numbers, SSNs) before processing
- **Response Format:** JSON with `sanitized` text
- **Enabled:** true

#### intent-router Agent
- **Phase:** pre
- **Order:** 1.5
- **Purpose:** Classifies user intent (macro-question, tmwya, workout, mmb, pat)
- **Response Format:** JSON with `route`, `target`, `confidence`, `reason`
- **Enabled:** true

**Registered in export:**
```typescript
export const defaultPersonalityAgents: Record<string, AgentConfig> = {
  "privacy-redaction": privacy_redaction,
  "intent-router": intent_router,
  ...
};
```

---

### 6. **Supabase FK Integrity Fixes**

**File:** `supabase/migrations/20251005161913_fix_chat_messages_fk_integrity.sql`

Created comprehensive FK backfill system:

#### Functions
1. **`get_or_create_active_history(p_user uuid)`**
   - Ensures user has active `chat_histories` record
   - Creates if missing

2. **`get_or_create_active_session(p_user uuid)`**
   - Ensures user has active `chat_sessions` record
   - Creates if missing

3. **`ensure_active_session(p_user uuid)`**
   - RPC to proactively prep both FK targets
   - Returns `session_id` and `chat_history_id`

#### Trigger
**`trg_chat_messages_backfill_fk`** (BEFORE INSERT)
- Automatically backfills `session_id` if null
- Automatically backfills `chat_history_id` if null (and column exists)
- Runs before every `chat_messages` insert
- Eliminates 400/409 FK constraint errors

**Security:** All functions use `security definer` for elevated privileges.

---

### 7. **UI Rendering** (Already Correct)

**File:** `src/components/ChatPat.tsx` (line 1422)

Confirmed whitespace preservation:
```tsx
<p className="message-bubble text-base leading-relaxed whitespace-pre-line"
   style={{ lineHeight: '1.6' }}>
  {message.text}
</p>
```

- `whitespace-pre-line` preserves line breaks
- `leading-relaxed` ensures readable line spacing
- Works correctly with `[[PROTECT_BULLETS_START/END]]` blocks

---

## Architecture Diagram

```
User Input: "tell me the macros of 3 eggs and 2 slices sourdough"
    ↓
[Privacy Redaction Agent] → sanitize PII
    ↓
[Fast Route] → detect macro-question intent
    ↓
[Role-Specific Logic: macro-question]
    ├─ Parse food items: ["3 eggs", "2 slices sourdough"]
    ├─ Call nutrition resolver for each item
    └─ Build MacroPayload { items[], totals }
    ↓
[Orchestrator] → pass { text, meta: { route, macros } }
    ↓
[Post-Agent Chain]
    ├─ evidence-validator (order 20)
    ├─ clarity-enforcer (order 21)
    ├─ macro-formatter (order 21.5) ← deterministic TS rendering
    ├─ conciseness-filter (order 22) [respects protection markers]
    └─ actionizer (order 23)
    ↓
User sees:
  3 eggs
  • Calories: 215 kcal
  • Protein: 18.9 g
  • Carbs: 1 g
  • Fat: 14.3 g

  2 slices sourdough
  • Calories: 210 kcal
  • Protein: 9 g
  • Carbs: 42 g
  • Fat: 2 g

  Totals
  • Calories: 425 kcal
  • Protein: 27.9 g
  • Carbs: 43 g
  • Fat: 16.3 g

  Log
  Just say "Log" if you want me to log this in your macros as a meal.
```

---

## Testing Checklist

### Acceptance Tests (Required)

Run these scenarios in **both Chat and TMWYA**:

1. **3 whole eggs + 2 slices sourdough + 10 oz ribeye**
   - ✅ Per-item bullets
   - ✅ Totals section
   - ✅ "Log" hint (Chat only)

2. **3 slices bacon**
   - ✅ Single item breakdown
   - ✅ Totals match item

3. **1 cup cooked rice**
   - ✅ Correct serving size interpretation

4. **Big Mac**
   - ✅ Brand food lookup

5. **"Log" command after macro question**
   - ✅ Extracts items from structured payload
   - ✅ Bridges to TMWYA with all items

### Validation Checks

- **No FK Errors:** Chat messages insert without 400/409 errors
- **No Agent Errors:** Console shows no "agent not found" warnings
- **Format Consistency:** Chat and TMWYA show identical macro values (±2-3%)
- **Protection Respected:** Bullets stay vertical, not compressed by conciseness-filter
- **Hint Placement:** "Log" hint only appears for macro-questions, not verification screens

---

## Database Verification SQL

Run these queries to confirm FK integrity:

```sql
-- 1. Check columns exist
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name IN ('chat_messages', 'chat_sessions', 'chat_histories')
ORDER BY table_name, ordinal_position;

-- 2. Verify FK constraints
SELECT tc.constraint_name, kcu.column_name,
       ccu.table_name AS foreign_table,
       ccu.column_name AS foreign_column
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'chat_messages'
  AND tc.constraint_type = 'FOREIGN KEY';

-- 3. Verify trigger exists
SELECT tgname, tgrelid::regclass, tgenabled
FROM pg_trigger
WHERE tgname = 'trg_chat_messages_backfill_fk';

-- 4. Test session creation
SELECT * FROM ensure_active_session('00000000-0000-0000-0000-000000000000');
```

---

## Files Modified

### New Files (2)
1. `src/lib/personality/postAgents/macroFormatter.ts` - Deterministic formatter
2. `supabase/migrations/20251005161913_fix_chat_messages_fk_integrity.sql` - FK fixes

### Modified Files (5)
1. `src/types/chat.ts` - Added MacroPayload interfaces
2. `src/lib/personality/orchestrator.ts` - Payload bridge, macro-question logic
3. `src/lib/personality/routingTable.ts` - Added macro-question intent pattern
4. `src/components/ChatPat.tsx` - Enhanced "Log" command detection
5. `src/config/personality/agentsRegistry.ts` - Added privacy-redaction and intent-router agents

---

## Benefits Achieved

1. **Zero LLM Cost for Formatting** - Pure TypeScript rendering (no agent tokens)
2. **Guaranteed Consistency** - Same structured data = same output format
3. **Intent Clarity** - Distinguishes questions from logging statements
4. **User Flow Support** - "Review before logging" workflow enabled
5. **Data Integrity** - No more FK insert failures
6. **Maintainability** - Single formatter, clear data contracts
7. **Extensibility** - Easy to add micronutrients, TEF, etc. to payload

---

## Known Limitations

1. **Nutrition Resolver** - Still uses existing `callFoodMacros` (not modified)
   - Future: standardize all resolvers to output `MacroPayload` format

2. **TMWYA Verification Screen** - Not yet using structured payload
   - Future: refactor verification to consume `MacroPayload` directly

3. **Post-Agent Order** - Relies on numeric ordering
   - Future: explicit dependency graph for agent execution

---

## Next Steps (Not in Scope)

1. Deploy edge functions (`tmwya-process-meal`, `intelligent-chat`, `openai-food-macros`)
2. Test with real user accounts in production
3. Monitor console for agent errors during first 24 hours
4. Gather user feedback on macro format clarity
5. Consider adding micronutrient support to `MacroPayload`

---

## Build Status

✅ **Build Successful**
- No TypeScript errors
- No linting errors
- Bundle size: 1.1 MB (warnings expected)
- All modules transformed successfully

---

## Deployment Checklist

- [x] Frontend code changes complete
- [x] Database migration created
- [ ] Apply migration to production database
- [ ] Deploy frontend build to hosting
- [ ] Verify FK trigger is active
- [ ] Test macro-question scenarios live
- [ ] Monitor console for agent errors
- [ ] Verify "Log" command bridges correctly

---

**End of Implementation Summary**
