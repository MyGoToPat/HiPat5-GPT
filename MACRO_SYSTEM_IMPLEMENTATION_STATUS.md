# Macro System Implementation Status

**Date:** 2025-10-06
**Task:** Make Chat with Pat and Talk with Pat produce identical, reliable macro answers and logging behavior

---

## ✅ COMPLETED PHASES (1-6)

### Phase 1: Database Foundation ✅
- Fixed `session_type` constraint to accept `('general', 'tmwya', 'workout', 'mmb')`
- Created `chat_message_macros` table with RLS policies
- Added indexes for performance (session_id+time, message_id, unconsumed lookups)
- Created `mark_macro_payload_consumed()` helper function
- Updated `get_or_create_active_session()` RPC to use 'general' type
- Verified `food_units` table exists with 14 entries
- Rollback migration available: `20251006040904_rollback_session_type_and_macros.sql`

### Phase 2: Routing & Intent Detection ✅
- Added `macro-logging` route to `routingTable.ts` with 3 patterns
- Created `macroAgents.ts` with 3 new agents:
  - `macro-question`: Handles informational macro queries
  - `macro-logging`: Handles logging commands (stub for Phase 7)
  - `macro-formatter-enhanced`: Ensures consistent formatting
- Updated `agentsRegistry.ts` to import and register new agents
- Enhanced guardrail logic: macro-logging takes priority
- Updated intent-router agent prompt

### Phase 3: Nutrition Resolution ✅
- Extended `ResolvedNutrition` interface with per-unit values
- Added `adjustItemQuantity()` for quantity modifications
- Added `findItemByName()` for fuzzy item matching
- Added `detectBrand()` for restaurant/brand foods → `as-served` basis
- Enhanced `parseNaturalQuantity()` to detect brands
- Updated `resolveViaSupabase()` to calculate per-unit values
- Enhanced telemetry logging

### Phase 4: Orchestrator Metadata Preservation ✅
- Updated `finishWithPostAgents()` to accept and return meta
- Disabled destructive post-agents for macro responses
- Added macro-logging handler stub to orchestrator
- Meta flows intact from resolver → orchestrator → formatter

### Phase 5: Macro Formatter Enhancement ✅
- Updated `macroFormatter.ts` to match exact requirements:
  - Individual items with quantities ("10 Oz Ribeye", "3 Whole Eggs")
  - "Total calories NNN" line after all items
  - 'Say "Log All" or "Log (Food item)"' hint
  - Protected markers `[[PROTECT_BULLETS_START/END]]`

### Phase 6: Message Storage with Metadata ✅
- Updated `ChatManager.saveMessage()` to accept metadata parameter
- Updated `ChatSessions.saveMessage()` to:
  - Store metadata in `chat_messages.metadata` column
  - Automatically save macro payloads to `chat_message_macros` table
- Updated ChatPat to pass `pipelineResult.meta` to saveMessage
- Macro payloads now stored in database for 48h+ retention

---

## 🔄 PENDING PHASES (7-11)

### Phase 7: Logging Command Implementation
**Status:** Stub created, needs implementation

**Required Work:**
1. Implement macro-logging handler in orchestrator.ts:
   - Retrieve last unconsumed macro payload from `chat_message_macros`
   - Parse command ("log all", "log ribeye", "log ribeye with 4 eggs")
   - Handle quantity adjustments using `adjustItemQuantity()`
   - Check user's remaining daily calories and warn if over
   - Save to `meal_logs` with proper `meal_time`
   - Mark payload as consumed via `mark_macro_payload_consumed()`

2. Create helper functions:
   - `getLastUnconsumedMacroPayload(sessionId, userId)`
   - `parseLoggingCommand(userMessage, macroPayload)`
   - `checkCalorieBudget(userId, totalCalories)`
   - `saveMealFromMacros(userId, items, meal_time)`

**Estimated Effort:** 2-3 hours

### Phase 8: Time & Meal Slot Handling
**Status:** Not started

**Required Work:**
1. Add time parsing to meal logging:
   - Parse: "at 9 AM today", "for breakfast", "last night at 10 PM"
   - Extract: date, time, meal_slot
   - Default to current time if not specified

2. Update `saveMeal` function to accept `meal_time` parameter
3. Use user's timezone from context
4. Verify dashboard display logic (Today's meals vs past days)

**Estimated Effort:** 1-2 hours

### Phase 9: Edge Functions Migration
**Status:** Errors visible in console, needs fixing

**Required Work:**
1. Update `chat-summarize-session` edge function:
   - Replace any remaining `chat_history_id` with `session_id`
   - Add feature flag: `SUMMARIZE_ENABLED=false` by default
   - Add sections: "Foods discussed" and "Foods logged"

2. Fix CORS errors in nutrition-resolver edge function
3. Test edge function deployment

**Estimated Effort:** 1 hour

### Phase 10: Telemetry & Debug Mode
**Status:** Partially complete, needs UI

**Required Work:**
1. Telemetry already logging:
   - ✅ Route decisions
   - ✅ Resolver calls, duration, basis_used
   - ✅ Formatter execution

2. Implement DEBUG_MACRO panel:
   - Add environment variable gate: `DEBUG_MACRO=true`
   - Show collapsible panel in ChatPat (admin/dev only)
   - Display: route, macros payload, consumed flag, timestamps
   - Never spoken in voice mode

3. Create telemetry dashboard query (SQL view)

**Estimated Effort:** 2 hours

### Phase 11: Testing & Validation
**Status:** Not started

**Required Work:**
Run all 5 acceptance tests:

1. **Test 1:** "Tell me the macros of 3 slices of bacon and 2 slices sourdough"
   - Verify macro-question route
   - Check per-item bullets + total + hint
   - Telemetry shows `formatter_ran=true`
   - "log all" → verify card → log succeeds

2. **Test 2:** "Tell me the macros of 3 large eggs and a 10 oz ribeye" → "log the ribeye with 4 eggs"
   - Eggs scaled 3→4 without resolver call
   - Verify card shows adjustment notice
   - Log succeeds with correct values

3. **Test 3:** "I ate 2 whole eggs for breakfast at 9:00 AM today"
   - Logs to today at 9 AM
   - Appears in Today's Meals
   - "I forgot last night at 10 PM: 1 cup cooked rice" → logs to yesterday

4. **Test 4:** Force fallback error
   - Formatter still runs
   - Bullets render + total + hint
   - Telemetry logs error

5. **Test 5:** Proactive calorie warning
   - User with 200 kcal remaining asks for 800 kcal meal
   - "log it" → warning about exceeding budget
   - Confirmation required

**Estimated Effort:** 2-3 hours

---

## 🎯 CRITICAL PATH TO COMPLETION

**To make the system fully functional:**

1. **Phase 7 (Logging)** - HIGHEST PRIORITY
   - This is the key feature users need
   - All foundation is in place
   - ~2-3 hours of focused work

2. **Phase 8 (Time Handling)** - HIGH PRIORITY
   - Enhances logging accuracy
   - Required for proper meal timing
   - ~1-2 hours

3. **Phase 9 (Edge Functions)** - MEDIUM PRIORITY
   - Fixes console errors
   - Not blocking core functionality
   - ~1 hour

4. **Phase 10-11 (Telemetry & Testing)** - MEDIUM PRIORITY
   - Debugging support
   - Validation
   - ~4-5 hours

**Total Remaining:** ~8-13 hours of focused implementation

---

## 🔧 HOW TO CONTINUE

**Step 1: Implement Phase 7 (Logging)**
```bash
# Edit orchestrator.ts, find the macro-logging handler
# Replace the stub with full implementation
# Create helper functions in src/lib/meals/logMacroPayload.ts
```

**Step 2: Test the core flow**
```bash
# 1. Ask Pat: "tell me the macros of 3 eggs and 2 slices bacon"
# 2. Verify response shows bullets + total + hint
# 3. Say: "log all"
# 4. Verify meal appears in dashboard
```

**Step 3: Complete remaining phases**
- Follow the order: 7 → 8 → 9 → 10 → 11
- Test after each phase
- Update this document with status

---

## 📊 BUILD STATUS

**Latest Build:** ✅ Success (Phase 6 complete)
```bash
npm run build
# ✓ built in 8.52s
```

**Known Issues:**
- Edge function CORS errors (will fix in Phase 9)
- macro-logging returns stub message (will fix in Phase 7)

---

## 🎉 ACHIEVEMENTS SO FAR

1. **Database Foundation:** Rock solid schema with proper RLS
2. **Routing:** Deterministic intent detection working
3. **Nutrition Resolution:** Per-unit scaling implemented
4. **Metadata Flow:** Structured payloads flow end-to-end
5. **Consistent Formatting:** Exact output format as specified
6. **Persistent Storage:** Macro payloads saved to database

**The hard architectural work is DONE.** What remains is implementing the business logic for logging commands and testing the complete flow.
