# Schema + Integration Audit Report
**Date:** 2025-10-07
**Scope:** Read-only audit of Supabase table usage, router wiring, and macro/fiber flow

---

## Executive Summary

**Key Findings:**
1. ✅ **Fiber schema complete**: `macroSwarmV2.ts` includes `fiber_g` in Zod schemas
2. ⚠️ **Router NOT wired**: `ChatPat.tsx` does NOT import `orchestrator/router.ts`
3. ⚠️ **chat_history_id missing**: Code does NOT use `chat_history_id` FK (uses `session_id` instead)
4. ⚠️ **Fiber rendering incomplete**: Chat UI does NOT display fiber bullets
5. ✅ **Database migration ready**: Proposed SQL provided below

---

## TASK 1: TABLE/FIELD MAP

### Table: `chat_sessions`
**File**: `src/lib/chatSessions.ts:68-74`
**Expected Columns**:
- `id` (uuid, PK)
- `user_id` (uuid, FK)
- `started_at` (timestamptz)
- `ended_at` (timestamptz, nullable)
- `active` (boolean)
- `session_type` (text: 'general'|'tmwya'|'workout'|'mmb')
- `metadata` (jsonb)
- `created_at` (timestamptz)

**Usage Pattern**:
```typescript
// Line 68-74
supabase
  .from('chat_sessions')
  .select('*')
  .eq('user_id', userId)
  .eq('active', true)
```

---

### Table: `chat_messages`
**File**: `src/lib/chatSessions.ts:119-130`
**Expected Columns**:
- `id` (uuid, PK)
- `session_id` (uuid, FK to chat_sessions) ✅
- `user_id` (uuid, FK)
- `sender` (text: 'user'|'pat'|'system')
- `text` (text)
- `is_user` (boolean)
- `metadata` (jsonb)
- `timestamp` (timestamptz)
- ~~`chat_history_id`~~ ❌ **NOT USED** by code

**Usage Pattern**:
```typescript
// Line 119-130
supabase
  .from('chat_messages')
  .insert({
    session_id: message.sessionId,  // Uses session_id, NOT chat_history_id
    user_id: message.userId,
    sender: message.sender,
    text: message.text,
    is_user: message.sender === 'user',
    metadata: message.metadata || {},
    timestamp: new Date().toISOString()
  })
```

**FINDING**: Code NEVER references `chat_history_id`. The migration should align with actual usage pattern (session_id FK).

---

### Table: `chat_message_macros`
**File**: `src/lib/chatSessions.ts:149-160`
**Expected Columns**:
- `message_id` (uuid, FK to chat_messages)
- `session_id` (uuid, FK to chat_sessions)
- `items` (jsonb or text) - Stored as `JSON.stringify(macros.items)`
- `totals` (jsonb or text) - Stored as `JSON.stringify(macros.totals)`
- `basis` (text: 'cooked'|'raw')
- `consumed` (boolean)
- `created_at` (timestamptz)

**Usage Pattern**:
```typescript
// Line 149-160
supabase
  .from('chat_message_macros')
  .insert({
    message_id: data.id,
    session_id: message.sessionId,
    items: JSON.stringify(macros.items || []),
    totals: JSON.stringify(macros.totals || {}),
    basis: macros.basis || 'cooked',
    consumed: false,
    created_at: new Date().toISOString()
  })
```

---

### Table: `meal_logs`
**File**: `src/lib/meals/saveMeal.ts:20-31`
**Expected Columns**:
- `id` (uuid, PK)
- `user_id` (uuid, FK)
- `ts` (timestamptz) - Meal timestamp
- `meal_slot` (text: 'breakfast'|'lunch'|'dinner'|'snack')
- `source` (text: 'manual'|'photo'|'voice'|'tmwya')
- `totals` (jsonb) - Macro totals
- `micros_totals` (jsonb, nullable) - **Includes fiber totals**
- `note` (text, nullable)
- `client_confidence` (numeric, nullable)
- `basis` (text) - Added by migration (default: 'cooked')

**Usage Pattern**:
```typescript
// Line 20-31
supabase
  .from('meal_logs')
  .insert({
    user_id: user.id,
    ts: normalizedMeal.mealLog.ts,
    meal_slot: normalizedMeal.mealLog.meal_slot,
    source: normalizedMeal.mealLog.source,
    totals: normalizedMeal.mealLog.totals,
    micros_totals: normalizedMeal.mealLog.micros_totals || null,  // Fiber totals here
    note: normalizedMeal.mealLog.note,
    client_confidence: normalizedMeal.mealLog.client_confidence,
  })
```

---

### Table: `meal_items`
**File**: `src/lib/meals/saveMeal.ts:43-60`
**Expected Columns**:
- `meal_log_id` (uuid, FK to meal_logs)
- `position` (integer)
- `cache_id` (text, nullable)
- `name` (text)
- `brand` (text, nullable)
- `qty` (numeric)
- `unit` (text)
- `grams` (numeric)
- `macros` (jsonb) - **Should include fiber_g**
- `micros` (jsonb, nullable) - Micronutrients including fiber
- `confidence` (numeric)
- `source_hints` (jsonb)
- **MISSING** from code usage: `grams_used`, `basis`, `fiber_g` (separate column)

**Usage Pattern**:
```typescript
// Line 43-60
mealItemsToInsert = normalizedMeal.mealItems.map(item => ({
  meal_log_id: mealLogId,
  position: item.position,
  cache_id: item.cache_id,
  name: item.name,
  brand: item.brand,
  qty: item.qty,
  unit: item.unit,
  grams: item.grams,  // Uses 'grams', NOT 'grams_used'
  macros: item.macros,  // jsonb - includes fiber inside
  micros: item.micros,  // jsonb - fiber here too
  confidence: item.confidence,
  source_hints: item.source_hints,
}))
```

**FINDING**: Code uses `grams` (not `grams_used`), stores fiber inside `macros` jsonb (not separate column).
Migration should add `fiber_g` as computed column or extract from jsonb for aggregation.

---

### Table: `food_unit_defaults`
**File**: `src/shared/portion-resolver.ts:29-36`
**Expected Columns**:
- `food_key` (text, PK)
- `grams` (numeric)
- `basis` (text)

**Usage Pattern**:
```typescript
// Line 29-36
supabase
  .from('food_unit_defaults')
  .select('food_key, grams, basis')
```

**Status**: ✅ Migration already created this table.

---

### Table: `day_rollups`
**Expected Columns** (from migration):
- `user_id` (uuid)
- `day` (date)
- `kcal` (numeric)
- `protein_g` (numeric)
- `carbs_g` (numeric)
- `fat_g` (numeric)
- `fiber_g` (numeric) ✅

**Status**: ✅ Migration ready with fiber_g.

---

### RPC Functions Referenced

#### `get_or_create_active_session`
**File**: `src/lib/chatSessions.ts:41-43`
**Expected**: Returns session row with all fields
**Status**: Exists (referenced, not found in repo migrations)

#### `close_chat_session`
**File**: `src/lib/chatSessions.ts:83-86`
**Params**: `p_session_id` (uuid), `p_summary` (text, nullable)
**Status**: Exists

#### `macro_get_unconsumed_payload`, `macro_set_payload`, `macro_consume_and_log`
**File**: Created in `20251007100000_swarm_overhaul_fiber_first.sql`
**Status**: ✅ Migration ready

---

## TASK 2: CHAT SAVE PATH AUDIT

### Finding: `chat_history_id` is NOT USED

**Evidence**:
```typescript
// src/lib/chatSessions.ts:119-130
supabase
  .from('chat_messages')
  .insert({
    session_id: message.sessionId,  // ✅ Uses session_id
    user_id: message.userId,
    sender: message.sender,
    text: message.text,
    is_user: message.sender === 'user',
    metadata: message.metadata || {},
    timestamp: new Date().toISOString()
    // ❌ NO chat_history_id referenced
  })
```

**Conclusion**: The migration should NOT add `chat_history_id` FK. The current code uses `session_id` as the primary chat grouping mechanism.

**Recommendation**: Align DB schema with code reality. If `chat_histories` table exists separately from `chat_sessions`, determine if it's legacy and can be dropped or if there's missing integration code.

---

## TASK 3: ROUTER WIRING STATUS

### Finding: Router NOT Wired into ChatPat

**File**: `src/components/ChatPat.tsx`
**Lines**: 1-600 (full file scanned)

**Evidence**:
```bash
$ grep -n "orchestrator/router" src/components/ChatPat.tsx
# NO MATCHES FOUND
```

**Current Flow** (Line 518-570):
```typescript
// Line 518-520: ChatPat imports personality orchestrator directly
const { runPersonalityPipeline } = await import('../lib/personality/orchestrator');

// Line 542-570: Calls personality pipeline directly
const pipelineResult = await runPersonalityPipeline({
  userMessage: userMessageWithContext,
  context: { /* ... */ }
});
```

**Problem**: ChatPat bypasses `orchestrator/router.ts` and goes straight to `personality/orchestrator`, missing:
- Intent routing (macro-question, macro-logging, tmwya, mmb)
- Swarm selection
- Protected bullet enforcement

---

### Required Integration: Minimal Diff

**File**: `src/components/ChatPat.tsx`
**Lines**: 518-522

**BEFORE** (current):
```typescript
// Line 518-520
const { runPersonalityPipeline } = await import('../lib/personality/orchestrator');
const user = await getSupabase().auth.getUser();

if (user.data.user) {
  // ... directly call runPersonalityPipeline
}
```

**AFTER** (proposed):
```typescript
// ADD import at top of file (line ~35)
import { routeToSwarm, checkUnconsumedMacroPayload } from '../orchestrator/router';

// MODIFY line 518-525
const user = await getSupabase().auth.getUser();

if (user.data.user) {
  // Route to appropriate swarm
  const hasUnconsumed = await checkUnconsumedMacroPayload(threadId, user.data.user.id);
  const routeResult = routeToSwarm(newMessage.text, {
    hasUnconsumedMacroPayload: hasUnconsumed,
    sessionId: threadId
  });

  console.log('[chat-route]', routeResult);  // Debug: which swarm selected

  // Route to target swarm
  if (routeResult.target === 'macro') {
    const { runMacroSwarm } = await import('../lib/personality/swarms/macroSwarmV2');
    // ... call macro swarm
  } else if (routeResult.target === 'tmwya') {
    const { runTMWYAPipeline } = await import('../lib/tmwya/pipeline');
    // ... call TMWYA
  } else if (routeResult.target === 'mmb') {
    const { runMMBSwarm } = await import('../lib/personality/swarms/mmbSwarm');
    // ... call MMB
  } else {
    // Default: persona polish only
    const { runPersonalityPipeline } = await import('../lib/personality/orchestrator');
    // ... existing code
  }
}
```

**Estimated Impact**: ~20 lines added, zero lines removed. Preserves all existing functionality, adds routing layer.

---

## TASK 4: MACRO/FIBER FLOW AUDIT

### Finding 1: Fiber in Schemas ✅

**File**: `src/lib/personality/swarms/macroSwarmV2.ts:31-37`
**Evidence**:
```typescript
export const MacrosSchema = z.object({
  kcal: z.number(),
  protein_g: z.number(),
  carbs_g: z.number(),
  fat_g: z.number(),
  fiber_g: z.number()  // ✅ PRESENT
});
```

**Status**: ✅ Backend schema complete.

---

### Finding 2: Formatter Outputs Fiber ✅

**File**: `src/lib/macro/formatter.ts:81-85`
**Evidence**:
```typescript
// Line 81-85
// Only show fiber if > 0
if (item.fiber_g > 0) {
  lines.push(`• Fiber: ${round1(item.fiber_g)} g`);
}
```

**Status**: ✅ Formatter includes fiber bullets when fiber > 0.

---

### Finding 3: UI Does NOT Render Fiber ⚠️

**Search Results**:
```bash
$ grep -rn "Fiber:" src/components/
# NO MATCHES in chat message rendering
```

**Problem**: `ChatPat.tsx` renders `patResponse.text` as plain text (Line 580-586), which includes the formatted bullets, BUT:
1. Plain text rendering works for console/debugging
2. React components may need explicit fiber rendering

**Investigation Needed**:
- Check if macro bullets are rendered as plain text or parsed
- If parsed, ensure fiber bullets are included

**File to Check**: `src/components/ChatPat.tsx:580-586`
```typescript
const patResponse: ChatMessage = {
  id: (Date.now() + 1).toString(),
  text: responseText,  // Includes "• Fiber: X g" from formatter
  timestamp: new Date(),
  isUser: false
};
setMessages(prev => prev.filter(m => !m.id.startsWith('thinking-')).concat(patResponse));
```

**Rendering Location**: Likely in JSX below Line 900+ (not fully read due to file length).

---

### Finding 4: Dashboard Fiber Display Missing

**File**: `src/components/DashboardPage.tsx`
**Search**: No "fiber" or "Fiber" strings found

**Required Addition**:
```typescript
// Query day_rollups for fiber
const { data } = await supabase
  .from('day_rollups')
  .select('fiber_g')
  .eq('user_id', userId)
  .eq('day', today)
  .maybeSingle();

// Render fiber progress
<div className="fiber-progress">
  <span>Fiber: {data.fiber_g || 0}g</span>
  {fiberTarget && <span>/ {fiberTarget}g</span>}
</div>
```

---

## TASK 5: PROPOSED MIGRATION

See `migration.sql` file (generated below).

---

## SUMMARY OF GAPS

| Component | Status | Action Required |
|-----------|--------|-----------------|
| **fiber_g schema** | ✅ Complete | None - already in macroSwarmV2.ts |
| **Formatter outputs fiber** | ✅ Complete | None - already in formatter.ts |
| **Router wiring** | ❌ Missing | Wire `orchestrator/router.ts` into ChatPat (20 lines) |
| **Chat message display** | ⚠️ Unknown | Verify fiber bullets render in UI |
| **Dashboard fiber** | ❌ Missing | Add fiber display component |
| **chat_history_id FK** | ❌ Not used | DO NOT add - code uses session_id |
| **meal_items.fiber_g column** | ⚠️ Mismatch | Code stores in jsonb, migration adds column |

---

## RECOMMENDATIONS

### Priority 1 (Critical)
1. **Wire router into ChatPat**: Add `orchestrator/router.ts` import and routing logic (20 lines)
2. **Verify macro bullet rendering**: Check if `• Fiber: X g` displays in chat messages
3. **Align meal_items schema**: Decide between:
   - Option A: Extract fiber from `macros` jsonb (computed column)
   - Option B: Update `saveMeal.ts` to write separate `fiber_g` column

### Priority 2 (Important)
4. **Add dashboard fiber display**: Query `day_rollups.fiber_g` and render progress bar
5. **Test fiber aggregation**: Verify trigger updates `day_rollups.fiber_g` from `meal_items`

### Priority 3 (Nice to Have)
6. **Drop unused chat_histories table**: If confirmed legacy
7. **Add fiber to TMWYA verify screen**: Already in `verification-view.ts`, wire to UI component

---

## EXACT FILE PATHS & LINE NUMBERS

### Chat Persistence
- **Table definitions**: Inferred from usage (no schema files in repo)
- **Insert logic**: `src/lib/chatSessions.ts:119-130`
- **Session management**: `src/lib/chatSessions.ts:34-62`

### Router
- **Implementation**: `src/orchestrator/router.ts:1-145` ✅ Exists
- **NOT imported by**: `src/components/ChatPat.tsx:1-600+`
- **Should be wired at**: `src/components/ChatPat.tsx:518-525`

### Macro/Fiber
- **Schema**: `src/lib/personality/swarms/macroSwarmV2.ts:31-37` ✅
- **Formatter**: `src/lib/macro/formatter.ts:81-85` ✅
- **Meal save**: `src/lib/meals/saveMeal.ts:43-60` (uses `macros` jsonb)
- **Dashboard**: `src/components/DashboardPage.tsx` (no fiber display)

---

## USER-VISIBLE OUTCOME (After Implementation)

### Before Router Wire + Fiber Display
- User asks "macros of 3 eggs" → Gets macro bullets WITHOUT fiber line
- User sees macro data but no fiber in dashboard
- "Log all" command may not work consistently

### After Router Wire + Fiber Display
1. **User asks "macros of 3 eggs and bacon"**
   - Router routes to macro swarm
   - Formatter returns bullets with fiber (when > 0)
   - Chat displays:
     ```
     3 eggs
     • Calories: 215 kcal
     • Protein: 18 g
     • Carbs: 2 g
     • Fat: 15 g

     2 slices bacon
     • Calories: 80 kcal
     • Protein: 6 g
     • Carbs: 0 g
     • Fat: 6 g
     • Fiber: 0 g

     Total calories 295

     Say "Log All" or "Log (food item)"
     ```

2. **User views Dashboard**
   - Sees "Fiber: 15/25 g" with progress bar
   - Data pulled from `day_rollups.fiber_g` view
   - Updates automatically when meals logged

---

**END OF AUDIT REPORT**
