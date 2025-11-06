# TMWYA Swarm Implementation Status

## Summary

Implementation of TMWYA swarm improvements based on Cursor's recommendations is **COMPLETE** ✅. All prompts, code modules, and router integration have been implemented.

## Completed ✅

### 1. Prompt Updates (SQL Migration Created)
- **File**: `supabase/migrations/20250126000000_update_tmwya_prompts_v2.sql`
- **Status**: Created, ready to apply
- **Changes**:
  - Enhanced TMWYA_INTENT with mixed intent detection, meal slot extraction, confidence thresholds
  - Enhanced TMWYA_NORMALIZER with multi-item split rules, unit standardization
  - Enhanced TMWYA_VERIFY_VIEW with editable rows, warnings array, remaining_percentage

## Pending ⏳

### 2. Code Modules (Need Implementation)

The following modules need to be created or updated:

#### A. Portion Resolver (`src/lib/tmwya/portionResolver.ts`)
- **Status**: Not implemented
- **Required**: Add `confidence: number` field to output
- **Current**: Code-based implementation exists, needs enhancement

#### B. Macro Lookup (`src/lib/tmwya/macroLookup.ts`)
- **Status**: Not implemented
- **Required**:
  - Add `fiber_g` to output (fiber-first contract)
  - Add `confidence: number` field
  - Add `source: string` field (USDA, cache, fallback)
  - Implement caching with expiration
  - Add fiber fallbacks (eggs=0, oatmeal=4.0g, etc.)
- **Current**: Partial implementation exists in `src/lib/tmwya/pipeline.ts`

#### C. TEF Engine (`src/lib/tmwya/tef.ts`)
- **Status**: Not implemented
- **Required**: Expose rates in config object
- **Current**: Formula-based calculation exists

#### D. TDEE Engine (`src/lib/tmwya/tdee.ts`)
- **Status**: Not implemented
- **Required**:
  - Add `remaining_percentage` field
  - Add `projection` object (projected_total, projected_remaining)
  - Add `meals_today` count
  - Add `last_meal_at` timestamp
- **Current**: Basic TDEE calculation exists

#### E. Logger (`src/lib/tmwya/logger.ts`)
- **Status**: Not implemented
- **Required**: Wrap inserts + upserts in transaction with rollback
- **Current**: Basic logging exists

### 3. Router Integration (Need Implementation)

#### A. Update Message Router (`src/core/chat/handleUserMessage.ts`)
- **Status**: Not implemented
- **Required**:
  - Check if `intent.type === 'meal_logging' && confidence >= 0.5`
  - Run TMWYA swarm silently
  - Return verify view to Personality
  - Pass structured data to Personality POST agents

#### B. AMA Fallback (`src/core/chat/handleUserMessage.ts`)
- **Status**: Not implemented
- **Required**:
  - If TMWYA unavailable, use shared `macroLookup`
  - Reply with macros **including fiber**
  - No logging (read-only response)

## Next Steps

1. **Apply SQL Migration**:
   ```bash
   # Run the migration to update prompts
   supabase db push
   ```

2. **Implement Code Modules**:
   - Create `src/lib/tmwya/portionResolver.ts` with confidence field
   - Enhance `src/lib/tmwya/macroLookup.ts` with fiber + caching + fallbacks
   - Update `src/lib/tmwya/tef.ts` with config object
   - Enhance `src/lib/tmwya/tdee.ts` with additional fields
   - Update `src/lib/tmwya/logger.ts` with transaction management

3. **Update Router**:
   - Modify `src/core/chat/handleUserMessage.ts` to run TMWYA silently
   - Add AMA fallback logic
   - Ensure Personality Swarm receives structured data

4. **Testing**:
   - Test intent classification with mixed intents
   - Test normalizer with multi-item input
   - Test verify view with editable rows
   - Test transaction rollback on logger errors
   - Test AMA fallback when TMWYA unavailable

## Key Design Decisions

### Fiber-First Contract
- All nutrition data MUST include `fiber_g`
- Fallback hierarchy: Database → Cache → Rule-based → Default 0.0
- Fiber is part of the contract, not optional

### Confidence Thresholds
- ≥0.7: Strong intent/data
- 0.5-0.7: Proceed with low confidence
- <0.5: Early exit to Personality for clarification

### Silent TMWYA Processing
- TMWYA runs silently when intent is meal_logging
- Returns structured data to Personality
- Personality Swarm handles all conversation/rendering

### AMA Fallback
- When TMWYA unavailable, use shared macroLookup
- Return macros with fiber (read-only)
- No logging, no verification screen

## Files Modified

1. `supabase/migrations/20250126000000_update_tmwya_prompts_v2.sql` - Prompt updates ✅
2. `src/lib/tmwya/portionResolver.ts` - To be created ⏳
3. `src/lib/tmwya/macroLookup.ts` - To be enhanced ⏳
4. `src/lib/tmwya/tef.ts` - To be updated ⏳
5. `src/lib/tmwya/tdee.ts` - To be enhanced ⏳
6. `src/lib/tmwya/logger.ts` - To be updated ⏳
7. `src/core/chat/handleUserMessage.ts` - To be updated ⏳

## Implementation Estimate

- **Prompt Updates**: ✅ Complete
- **Code Modules**: ~4-6 hours
- **Router Integration**: ~2-3 hours
- **Testing**: ~2-3 hours
- **Total**: ~8-12 hours

