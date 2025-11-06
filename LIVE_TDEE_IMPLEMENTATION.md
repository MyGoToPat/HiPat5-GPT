# Live TDEE Dashboard Integration - Implementation Complete ✅

## Overview
Implemented **Option 2** from the analysis: Pass live dashboard data to `MealVerifyCard` for accurate, real-time TDEE calculations that match the Dashboard's display exactly.

---

## 🎯 Problem Statement

**Before:**
- MealVerifyCard used `user_profiles.tdee_target` (wrong/stale field)
- Dashboard used `user_metrics` (protein, carbs, fat) to calculate target
- Two different data sources = inconsistent numbers
- User saw different "remaining calories" in Chat vs Dashboard

**After:**
- MealVerifyCard receives live dashboard data as a prop
- Single source of truth: `user_metrics` macros
- Consistent calculations across Chat and Dashboard
- Shows BEFORE/AFTER breakdown with live data

---

## ✅ Changes Implemented

### 1. **MealVerifyCard.tsx** - Accept Live Dashboard Data

**File:** `src/components/tmwya/MealVerifyCard.tsx`

**Changes:**
- Added optional `liveDashboard` prop:
  ```typescript
  liveDashboard?: {
    target_kcal: number;      // From Dashboard's macro calculation
    consumed_today: number;   // From Dashboard's meal sum (TODAY only, before this meal)
  };
  ```
- Updated header UI to show **BEFORE/AFTER/REMAINING** breakdown:
  - **Before:** Calories already consumed today
  - **This meal:** Current meal's calories (including TEF)
  - **After:** Total after logging this meal
  - **Remaining:** Target - After
- Fallback to `view.tdee` if `liveDashboard` is not provided (backward compatible)

**UI Before:**
```
Target Calories: 2000 kcal
Total (incl. TEF): 236 kcal
Remaining: 1764 kcal
```

**UI After (with live data):**
```
Target Calories: 2695 kcal

Before: 1458 kcal
This meal: +236 kcal
After: 1694 kcal

Remaining: 1001 kcal
```

---

### 2. **ChatPat.tsx** - Load and Pass Live Dashboard Data

**File:** `src/components/ChatPat.tsx`

**Changes:**

#### A) Added State for Dashboard Data
```typescript
const [dashboardData, setDashboardData] = useState<{
  targetCalories: number;
  totalCalories: number;
} | null>(null);
```

#### B) Added `loadLiveDashboard()` Function
- Fetches live data using the **exact same queries as Dashboard**:
  - `user_metrics` → Calculate target: `(P×4) + (C×4) + (F×9)`
  - `meal_items` + `meal_logs` → Sum today's consumption
  - Uses `getUserDayBoundaries()` for timezone-aware day filtering
- Called on mount and when `userId` changes
- Console logs for debugging: `[ChatPat] Live dashboard data loaded`

#### C) Pass Live Data to MealVerifyCard
```typescript
<MealVerifyCard
  view={message.roleData.view}
  items={message.roleData.items || []}
  totals={message.roleData.totals}
  tef={message.roleData.tef}
  tdee={message.roleData.tdee}
  liveDashboard={dashboardData ? {
    target_kcal: dashboardData.targetCalories,
    consumed_today: dashboardData.totalCalories
  } : undefined}
  onConfirm={...}
  onCancel={...}
/>
```

#### D) Reload After Meal Logging
- After successful `saveMealAction()`, call `loadLiveDashboard()` to update consumed calories immediately
- Ensures next meal verification shows updated "Before" value

---

## 🔍 Data Flow Diagram

```
┌─────────────────────────────────────────────────────────┐
│                      DASHBOARD                          │
│  ┌────────────────────────────────────────────────┐     │
│  │ Query: user_metrics                            │     │
│  │ → protein_g, carbs_g, fat_g                    │     │
│  │ → Target = (P×4) + (C×4) + (F×9)              │     │
│  │                                                 │     │
│  │ Query: meal_items (TODAY only)                 │     │
│  │ → Sum energy_kcal = Consumed                   │     │
│  │                                                 │     │
│  │ Display: Target - Consumed = Remaining         │     │
│  └────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────┘
                         │
                         │ (Same queries)
                         ▼
┌─────────────────────────────────────────────────────────┐
│                      CHATPAT                            │
│  ┌────────────────────────────────────────────────┐     │
│  │ loadLiveDashboard() {                          │     │
│  │   Query: user_metrics → targetCalories         │     │
│  │   Query: meal_items → totalCalories            │     │
│  │   setDashboardData({ targetCalories, total })  │     │
│  │ }                                               │     │
│  └────────────────────────────────────────────────┘     │
                         │
                         │ (Pass as prop)
                         ▼
│  ┌────────────────────────────────────────────────┐     │
│  │ <MealVerifyCard                                │     │
│  │   liveDashboard={{                             │     │
│  │     target_kcal: targetCalories,               │     │
│  │     consumed_today: totalCalories              │     │
│  │   }}                                            │     │
│  │ />                                              │     │
│  └────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│                  MEALVERIFYCARD                         │
│  ┌────────────────────────────────────────────────┐     │
│  │ const targetKcal = liveDashboard.target_kcal   │     │
│  │ const consumedToday = liveDashboard.consumed   │     │
│  │ const afterLogging = consumed + thisMeal       │     │
│  │ const remaining = target - afterLogging        │     │
│  │                                                 │     │
│  │ Display:                                        │     │
│  │   Before: 1458 kcal                            │     │
│  │   This meal: +236 kcal                         │     │
│  │   After: 1694 kcal                             │     │
│  │   Remaining: 1001 kcal                         │     │
│  └────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────┘
```

---

## 📊 Expected Behavior

### Scenario: User with 2695 kcal target, 1458 kcal already consumed

**User says:** "I ate 3 eggs"

**TMWYA normalizes:** 3 whole eggs (210 kcal, TEF: 26 kcal = 236 total)

**MealVerifyCard shows:**

```
┌──────────────────────────────────────────────────────┐
│ Verify Meal              Target Calories             │
│ 10/29/25, 9:26 AM        2,695 kcal                  │
│                                                       │
│                          Before: 1,458 kcal          │
│                          This meal: +236 kcal        │
│                          After: 1,694 kcal           │
│                          ─────────────────            │
│                          Remaining: 1,001 kcal ✅    │
└──────────────────────────────────────────────────────┘
```

**User clicks "Confirm log":**
- Meal saved to `meal_logs` + `meal_items`
- `loadLiveDashboard()` called
- Next verification shows **Before: 1,694 kcal** (updated)

---

## 🧪 Testing Checklist

- [ ] Open Chat (/chat)
- [ ] Check console for: `[ChatPat] Live dashboard data loaded: { targetCalories: 2695, totalCalories: 1458 }`
- [ ] Say: "I ate 3 eggs"
- [ ] Verify MealVerifyCard shows:
  - Target Calories: 2695 (from user_metrics)
  - Before: 1458 (from today's meal_items)
  - This meal: +236 (eggs + TEF)
  - After: 1694
  - Remaining: 1001
- [ ] Check console for: `[MealVerifyCard] Live data: { targetKcal: 2695, consumedToday: 1458, thisMeal: 236, afterLogging: 1694, remaining: 1001, hasLiveData: true }`
- [ ] Click "Confirm log"
- [ ] Verify toast: "Meal logged successfully!"
- [ ] Check console for second call: `[ChatPat] Live dashboard data loaded: { targetCalories: 2695, totalCalories: 1694 }`
- [ ] Say: "I ate oatmeal"
- [ ] Verify "Before" now shows 1694 (updated after previous meal)

---

## 🔧 Technical Details

### Target Calculation (Same as Dashboard)
```typescript
const targetCalories = metrics
  ? Math.round((metrics.protein_g * 4) + (metrics.carbs_g * 4) + (metrics.fat_g * 9))
  : 2000;
```

### Consumed Today Query (Same as Dashboard)
```typescript
const { data: items } = await supabase
  .from('meal_items')
  .select('energy_kcal, meal_log:meal_logs!inner(ts, user_id)')
  .eq('meal_log.user_id', user.id)
  .gte('meal_log.ts', boundaries.day_start)
  .lte('meal_log.ts', boundaries.day_end);

const totalCalories = (items || []).reduce(
  (sum, item) => sum + Number(item.energy_kcal || 0), 
  0
);
```

### Remaining Calculation (MealVerifyCard)
```typescript
const targetKcal = liveDashboard.target_kcal;
const consumedToday = liveDashboard.consumed_today;
const totalWithTEF = view.totals.calories + view.tef.kcal;
const afterLogging = consumedToday + totalWithTEF;
const remaining = targetKcal - afterLogging;
```

---

## 🚀 Benefits

### Before This Implementation:
- ❌ MealVerifyCard used `user_profiles.tdee_target` (wrong field)
- ❌ Dashboard and Chat showed different numbers
- ❌ No visibility into what was already consumed today
- ❌ User confused about remaining calories

### After This Implementation:
- ✅ MealVerifyCard uses live Dashboard data (same queries)
- ✅ Consistent numbers across Chat and Dashboard
- ✅ Clear BEFORE/AFTER breakdown for user
- ✅ Automatic refresh after logging a meal
- ✅ Single source of truth for all TDEE calculations

---

## 📝 Console Logs for Debugging

**On Chat mount:**
```
[ChatPat] Live dashboard data loaded: { targetCalories: 2695, totalCalories: 1458 }
```

**On meal verification:**
```
[MealVerifyCard] Live data: { 
  targetKcal: 2695, 
  consumedToday: 1458, 
  thisMeal: 236, 
  afterLogging: 1694, 
  remaining: 1001,
  hasLiveData: true 
}
```

**After meal logged:**
```
[ChatPat] Live dashboard data loaded: { targetCalories: 2695, totalCalories: 1694 }
```

---

## 🎉 Summary

✅ **Implemented Option 2:** Pass live dashboard data to MealVerifyCard  
✅ **Single Source of Truth:** All components use `user_metrics` for target  
✅ **Real-Time Accuracy:** Shows exact current consumption before this meal  
✅ **Consistent UX:** Chat and Dashboard now show identical numbers  
✅ **Better Feedback:** BEFORE/AFTER/REMAINING breakdown for clarity  
✅ **Auto-Refresh:** Updates immediately after logging a meal  

**Zero breaking changes.** Backward compatible with fallback to `view.tdee` if live data isn't available.

---

**Implementation Date:** October 29, 2025  
**Status:** ✅ Complete and Ready for Testing






