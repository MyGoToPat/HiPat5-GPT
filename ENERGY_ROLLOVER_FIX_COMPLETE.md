# Energy Rollover Fix - Complete Implementation

## Problem Summary
The dashboard was displaying **3,257 calories** from October 14th meals instead of showing only **1,221 calories** from today's (October 15th) meals. The energy metrics were not resetting at midnight in the user's timezone (America/New_York).

## Root Cause Analysis

### Primary Issue: Empty Day Boundaries
The `get_user_day_boundaries()` RPC function was returning an empty object `{}` instead of proper `day_start` and `day_end` timestamps. This caused the dashboard query to:
- Load ALL meal items (no date filtering)
- Show old data from previous days
- Display incorrect calorie totals

### Contributing Factors
1. **Service Worker Caching** - The unregistered service worker was caching stale API responses
2. **No Validation** - Client code didn't validate that boundaries were properly returned
3. **Fallback Logic** - No fallback when RPC failed
4. **Decimal Display** - Calories showing as decimals (3256.8) instead of whole numbers

## Fixes Implemented

### 1. Fixed Database Function (`20251015200000_fix_get_user_day_boundaries.sql`)
```sql
-- Added proper fallback to 'America/New_York' if no timezone found
-- Added RAISE NOTICE logging for debugging
-- Ensured function ALWAYS returns valid timestamps
-- Added test block to verify function works
```

**Key Changes:**
- Default timezone: `America/New_York` (instead of failing silently)
- Better error handling and logging
- Validation that timezone exists before calculating boundaries

### 2. Enhanced Client-Side Function (`src/lib/supabase.ts`)
```typescript
// Added validation that boundaries contain day_start and day_end
// Added error logging for debugging
// Throws clear error if invalid boundaries returned
```

**Key Changes:**
- Validates `result.day_start` and `result.day_end` exist
- Logs boundaries to console for debugging
- Throws descriptive error if validation fails

### 3. Dashboard Error Handling (`src/components/DashboardPage.tsx`)
```typescript
// Wrapped getUserDayBoundaries in try-catch
// Added fallback to UTC if timezone boundaries fail
// Shows toast notification if error occurs
```

**Key Changes:**
- Try-catch around `getUserDayBoundaries()` call
- Fallback creates boundaries for today in UTC
- User-friendly error message via toast

### 4. Removed Conditional Query Logic
**Before:**
```typescript
dayBoundaries ? supabase.from('meal_items')... : Promise.resolve({ data: [], error: null })
```

**After:**
```typescript
supabase.from('meal_items')...
.gte('meal_logs.ts', dayBoundaries.day_start)
.lte('meal_logs.ts', dayBoundaries.day_end)
```

**Why:** Empty object `{}` is truthy in JavaScript, so the conditional wasn't working as expected.

### 5. Rounded All Calorie Calculations
```typescript
// Before: 3256.799999999997
const totalCalories = mealItems.reduce((sum, item) => sum + (item.energy_kcal || 0), 0);

// After: 3257
const totalCalories = Math.round(mealItems.reduce((sum, item) => sum + (item.energy_kcal || 0), 0));
```

Applied to: calories, protein, carbs, fat, fiber

## How It Works Now

### Timezone-Aware Day Boundaries
1. User has timezone `America/New_York` in `user_preferences` table
2. Dashboard calls `getUserDayBoundaries(user_id)`
3. RPC function calculates:
   - `day_start`: October 15, 2025 12:01:00 AM ET = `2025-10-15T04:01:00+00:00` UTC
   - `day_end`: October 15, 2025 11:59:59 PM ET = `2025-10-16T03:59:59.999+00:00` UTC
4. Query filters `meal_items` where `meal_logs.ts` is between those boundaries
5. **Result**: Only meals logged since 12:01 AM ET today are shown

### Example Timeline
- **Oct 14, 11:30 PM ET** (Oct 15, 03:30 AM UTC) - ❌ NOT included (before day_start)
- **Oct 15, 12:01 AM ET** (Oct 15, 04:01 AM UTC) - ✅ INCLUDED (at day_start)
- **Oct 15, 3:14 PM ET** (Oct 15, 19:14 PM UTC) - ✅ INCLUDED (within boundaries)
- **Oct 15, 11:59 PM ET** (Oct 16, 03:59 AM UTC) - ✅ INCLUDED (at day_end)
- **Oct 16, 12:01 AM ET** (Oct 16, 04:01 AM UTC) - ❌ NOT included (after day_end)

## Testing the Fix

### 1. Verify Boundaries Work
Check browser console after loading dashboard:
```
[getUserDayBoundaries] Got boundaries: {
  day_start: "2025-10-15T04:01:00+00:00",
  day_end: "2025-10-16T03:59:59.999+00:00"
}
```

### 2. Verify Correct Meal Count
Console should show:
```
[dashboard-load] Meal items loaded: {
  count: 3,  // Only today's meals
  totalCalories: 1221,  // Rounded to integer
  totalMacros: { protein: 83, carbs: 169, fat: 35, fiber: 0 }
}
```

### 3. Verify Midnight Reset
At 12:01 AM ET:
- Dashboard auto-refreshes (implemented earlier)
- New boundaries calculated for new day
- Previous day's meals no longer appear
- Energy section shows 0 calories until first meal logged

### 4. Clear Browser Cache
**Critical:** To see the fix, you MUST:
1. Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
2. Clear application data:
   - Open DevTools → Application → Storage
   - Click "Clear site data"
3. Reload the page

## Weekly/Monthly Views

The weekly and monthly dashboards already use `day_rollups` table, which is timezone-aware and aggregates meals by user's local date. These views should now show correct historical data:

- **Weekly View**: Shows last 7 days of macros from `day_rollups`
- **Monthly View**: Shows 30-day aggregated data
- **Daily Breakdown**: Each day shows meals logged during that day's boundaries (12:01 AM - 11:59:59 PM user local time)

### Note on Graph Interactivity
Currently, the daily caloric intake bar charts in weekly/monthly views are **not clickable** to drill down into individual day details. This would require:
1. Adding click handlers to BarChart component
2. Creating a modal/drawer to show that day's meals
3. Fetching meals for the selected date using `getUserDayBoundaries(user_id, selected_date)`

This is a reasonable feature enhancement but was not part of the current fix scope.

## What Was Preserved

✅ **Historical Data**: All meals from previous days remain in the database
✅ **Weekly/Monthly Views**: Historical aggregations still work
✅ **Meal Logs**: No meals were deleted
✅ **Day Rollups**: Timezone-aware aggregation continues to work

## Migration Files Created

1. **`20251015190000_clear_test_meals.sql`** - Diagnostic migration to check meal timestamps
2. **`20251015200000_fix_get_user_day_boundaries.sql`** - Fixed the RPC function

## Summary

The energy rollover issue is now **FIXED**. The dashboard will:
- Show only TODAY's meals based on user's timezone
- Reset at midnight (12:01 AM) in the user's timezone
- Display rounded calorie values (no decimals)
- Provide clear error messages if timezone boundaries fail
- Fall back to UTC if timezone lookup fails

The fix ensures data integrity, preserves historical data, and provides a better user experience.
