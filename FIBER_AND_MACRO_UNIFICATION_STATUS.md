# Fiber & Macro Unification Implementation Status

## ✅ COMPLETED (Phases 1-3)

### Phase 1: State & DB Integrity
- ✅ **Migration 20251007000001**: Fixed session_type constraint to use 'general' consistently
- ✅ **Client Code Updated**: `src/lib/chatSessions.ts` now uses `'general' | 'tmwya' | 'workout' | 'mmb'`
- ✅ **Legacy Trigger**: Existing trigger `chat_messages_backfill_fk()` already has safe column existence check (no changes needed)

### Phase 2: Single Nutrition Resolver with Fiber
- ✅ **Extended nutrition-resolver**: `supabase/functions/nutrition-resolver/index.ts`
  - Accepts both single (`{foodName}`) and batch (`{items: [...]}`) requests
  - Returns `fiber_g` in all responses
  - Basis changed from `raw_per_100g` to `cooked` (default) or `as-served` (branded foods)
  - Centralized unit conversions (eggs=50g, bacon slice=10g, sourdough slice=50g)
- ✅ **Migration 20251007000002**: Added `fiber_g` column to `portion_defaults` table
- ✅ **Migration 20251007000003**: Added `fiber_g_target` to `user_metrics` for user goals

### Phase 3: Deterministic Macro Formatter with Fiber
- ✅ **Extended macroFormatter.ts**: `src/lib/personality/postAgents/macroFormatter.ts`
  - MacroItem interface includes `fiber_g` (optional for backward compat)
  - Per-item fiber line only shown when `fiber_g > 0`
  - Total fiber line always shown (even if 0g)
  - Protected block tags remain: `[[PROTECT_BULLETS_START]]` ... `[[PROTECT_BULLETS_END]]`

## 🔨 IN PROGRESS / PENDING

### Phase 4: Logging Parity & Adjustments
**Status**: NOT YET IMPLEMENTED
**Required**:
- Update logging flow to include fiber in `meal_logs.micros_totals` and `meal_items.micros`
- No new edge function - reuse existing TMWYA/client logging code
- Support quantity adjustments with linear scaling

### Phase 5: Time & Meal Slot Handling
**Status**: NOT YET IMPLEMENTED
**Required**:
- Parse natural time references ("at 9 AM today", "yesterday 10 PM")
- Use user's stored timezone (fallback to America/Toronto if not set)
- DO NOT hardcode America/Los_Angeles

### Phase 6: Storage & Retention (with Fiber)
**Status**: NOT YET IMPLEMENTED
**Required**:
- Update `chat_messages.metadata` to include fiber_g in macro payloads
- Update `chat_message_macros` items/totals JSONB to include fiber_g
- NO schema changes needed (JSONB is schema-less)
- Add 48h actionable window logic
- Ensure metadata immutability from post-agents

### Phase 7: Routing Guardrails
**Status**: ALREADY CORRECT
**No changes needed**: `src/lib/personality/routingTable.ts` has correct guardrails

### Phase 8: Dashboard & Profile (Fiber Surfacing)
**Status**: NOT YET IMPLEMENTED
**Required Files to Modify**:
- `src/components/DashboardPage.tsx` - extend query to fetch `SUM(micros_totals->>'fiber_g')`
- `src/components/dashboard/DailySummary.tsx` - display "Fiber: Xg" in Today's totals card
- `src/components/ProfilePage.tsx` - add fiber target input field
- `src/components/profile/MacrosTab.tsx` - display fiber goal with optional progress bar

### Phase 9: Acceptance Tests
**Status**: NOT YET IMPLEMENTED
**Required**:
- Create test files:
  - `__tests__/integration/macro-unification.test.ts`
  - `__tests__/integration/fiber-tracking.test.ts`
  - `__tests__/integration/logging-parity.test.ts`
- Implement 6 key test cases (see plan document)

## 🔑 KEY CORRECTIONS APPLIED

1. ✅ **Single resolver endpoint** - No separate batch function, unified in nutrition-resolver
2. ✅ **Fiber in eggs corrected** - Tests should NOT expect 3.6g fiber from eggs (eggs have 0g fiber)
3. ✅ **Per-item fiber logic** - Show fiber line ONLY when > 0 (no "Fiber: 0 g" for bacon/eggs)
4. ✅ **Total fiber line** - ALWAYS shown (even if 0g)
5. ✅ **Basis rules** - Default to `cooked`, not `raw`. Only use `raw` when user explicitly says "raw"
6. ✅ **Session type consistency** - Client now uses 'general' matching DB constraint
7. ✅ **Timezone handling** - Plan specifies user's stored timezone (not hardcoded LA)
8. ✅ **No new edge function for logging** - Reuse existing TMWYA/client flow

## 📋 NEXT STEPS FOR COMPLETION

To finish the implementation:

1. **Phase 4**: Update meal logging code to include fiber in micros/micros_totals
2. **Phase 5**: Add time parsing logic with user timezone support
3. **Phase 6**: Extend chat metadata schema to include fiber_g in payloads
4. **Phase 8**: Update Dashboard and Profile UI to display fiber
5. **Phase 9**: Write and run acceptance tests
6. **Final**: Run `npm run build` to verify all TypeScript compiles

## 📁 FILES MODIFIED SO FAR

### Database Migrations (3 new):
1. `supabase/migrations/20251007000001_fix_session_type_use_general.sql`
2. `supabase/migrations/20251007000002_add_fiber_to_portion_defaults.sql`
3. `supabase/migrations/20251007000003_add_fiber_target_to_user_metrics.sql`

### Edge Functions (1 modified):
1. `supabase/functions/nutrition-resolver/index.ts` - Extended for batch + fiber

### Client Code (2 modified):
1. `src/lib/chatSessions.ts` - Updated session_type to 'general'
2. `src/lib/personality/postAgents/macroFormatter.ts` - Added fiber display logic

## 🎯 ESTIMATED REMAINING WORK

- Phase 4 (Logging): 4-5 hours
- Phase 5 (Time): 3-4 hours
- Phase 6 (Metadata): 2-3 hours
- Phase 8 (UI): 6-8 hours
- Phase 9 (Tests): 6-8 hours
- **Total**: 21-28 hours remaining

## ✅ CRITICAL SUCCESS CRITERIA

Before marking complete:
- [ ] All 6 acceptance tests pass
- [ ] No `chat_history_id` errors in logs
- [ ] Macro numbers identical between Chat and TMWYA
- [ ] Fiber displays correctly (only when > 0 per item, always in totals)
- [ ] Dashboard shows fiber totals
- [ ] Profile allows setting fiber target
- [ ] Protected blocks prevent post-agent modifications
- [ ] `npm run build` succeeds
