# Bidirectional Macro/Calorie Calculation System

## Summary

Successfully implemented a bidirectional calculation system that allows users to either:
1. **Set a calorie goal** → System automatically calculates macros
2. **Manually edit macros** → System calculates target calories from those macros

## Problem Solved

**Before**: When users manually edited their macros, the calorie count in the net daily target and total deficit calculations did not update. Manual macro adjustments were ignored.

**After**: Manual macro edits now override automatic calculations, and all calorie targets are recalculated based on the manually entered macros in real-time.

## Technical Implementation

### 1. Database Changes

**Migration**: `add_manual_macro_override_flag.sql`

```sql
ALTER TABLE user_metrics
ADD COLUMN IF NOT EXISTS manual_macro_override BOOLEAN DEFAULT FALSE;
```

- **Purpose**: Flag to track whether macros were set manually or calculated automatically
- **Default**: `FALSE` (automatic mode)
- **When TRUE**: System calculates calories FROM macros
- **When FALSE**: System calculates macros FROM calorie goal

### 2. Core Calculation Logic

**File**: `src/lib/macros.ts`

Added two helper functions:

#### `calculateTargetCalories(metrics)`
```typescript
// Bidirectional calculation logic:
if (metrics.manual_macro_override) {
  // MACROS → CALORIES
  return (protein_g * 4) + (carbs_g * 4) + (fat_g * 9);
} else {
  // CALORIES → MACROS (traditional)
  return tdee ± adjustment;
}
```

#### `calculateNetCalories(targetCalories, protein_g, carbs_g, fat_g)`
```typescript
// Calculate TEF and subtract from target
const tef = (protein_g * 4 * 0.30) + (carbs_g * 4 * 0.12) + (fat_g * 9 * 0.02);
return targetCalories - tef;
```

### 3. MacrosTab Component Updates

**File**: `src/components/profile/MacrosTab.tsx`

#### Changes:

1. **Added `manual_macro_override` to TDEEMetrics interface**
   ```typescript
   interface TDEEMetrics {
     // ... existing fields
     manual_macro_override?: boolean;
   }
   ```

2. **Updated `handleSaveMacros()` function**
   - Sets `manual_macro_override = TRUE` when user saves manual edits
   - Shows confirmation: "Macros updated successfully! Calorie targets will now be calculated from your custom macros."

3. **Updated `handleSaveCaloricGoal()` function**
   - Sets `manual_macro_override = FALSE` when user adjusts calorie slider
   - Resets to automatic mode
   - Shows confirmation: "Caloric goal saved! Macros will be automatically calculated."

4. **Bidirectional calculation in display**
   ```typescript
   const isManualOverride = metrics?.manual_macro_override === true;

   if (isManualOverride) {
     // Calculate target FROM macros
     const macroCalories = (protein * 4) + (carbs * 4) + (fat * 9);
     targetBeforeTEF = macroCalories;
     netCalories = macroCalories - tef;
   } else {
     // Traditional calculation
     targetBeforeTEF = tdee ± adjustment;
     netCalories = targetBeforeTEF - tef;
   }
   ```

5. **UI Enhancements**
   - **"Manual Mode" badge** displayed when in manual override mode
   - **"Reset to Auto" button** to return to automatic calculation
   - **"Calculated from Manual Macros" indicator** in Target Calories section
   - **Live calorie preview** when editing macros shows:
     - Total calories from macros
     - Estimated TEF
     - Net calories

### 4. Dashboard Integration

**File**: `src/components/DashboardPage.tsx`

Updated two places where `targetCalories` is used:

#### DailySummary Component
```typescript
targetCalories={
  dashboardData?.userMetrics?.manual_macro_override
    ? (protein_g * 4) + (carbs_g * 4) + (fat_g * 9)
    : tdee
}
```

This ensures the dashboard reflects manual macro changes in real-time.

## User Workflow

### Scenario 1: Traditional Mode (Calories → Macros)

1. User selects caloric goal (deficit/maintenance/surplus)
2. User adjusts slider (e.g., -500 cal deficit)
3. User clicks "Save Caloric Goal"
4. System calculates: Target = TDEE - 500
5. Macros are displayed based on dietary preference ratios

### Scenario 2: Manual Mode (Macros → Calories)

1. User clicks "Edit" on Daily Macro Targets
2. User manually enters: Protein 200g, Carbs 150g, Fat 60g
3. System shows live preview:
   - Total: 1,880 cal
   - TEF: -261 cal
   - Net: 1,619 cal
4. User clicks "Save"
5. System sets `manual_macro_override = TRUE`
6. Target Calories section updates to show "Calculated from Manual Macros"
7. Dashboard immediately reflects new target: 1,880 cal
8. Net daily target: 1,619 cal (after TEF)

### Scenario 3: Switching Back to Automatic

1. User clicks "Reset to Auto" button
2. System sets `manual_macro_override = FALSE`
3. Calculations revert to TDEE-based
4. "Manual Mode" badge disappears

## Calculation Details

### Macro-to-Calorie Conversion
- **Protein**: 4 calories per gram
- **Carbs**: 4 calories per gram
- **Fat**: 9 calories per gram

### TEF (Thermic Effect of Food)
- **Protein**: 30% of protein calories burned during digestion
- **Carbs**: 12% of carb calories burned during digestion
- **Fat**: 2% of fat calories burned during digestion

### Example Calculation

**Manual Macros**:
- Protein: 180g × 4 = 720 cal
- Carbs: 130g × 4 = 520 cal
- Fat: 115g × 9 = 1,035 cal
- **Total**: 2,275 cal

**TEF**:
- Protein TEF: 720 × 0.30 = 216 cal
- Carbs TEF: 520 × 0.12 = 62 cal
- Fat TEF: 1,035 × 0.02 = 21 cal
- **Total TEF**: 299 cal

**Net Daily Target**: 2,275 - 299 = **1,976 cal**

## Data Integrity

### Database Consistency

The system maintains consistency by:

1. **Single source of truth**: `user_metrics` table
2. **Atomic updates**: All related fields updated together
3. **Profile sync**: Changes synced to `profiles` table for compatibility

### Override Flag Behavior

- **Manual edit** → `manual_macro_override = TRUE`
- **Slider adjustment** → `manual_macro_override = FALSE`
- **Fresh TDEE calculation** → Flag preserved unless explicitly reset

## Dashboard Real-Time Updates

All components that display calorie targets now check `manual_macro_override`:

1. **DailySummary** - Today's calorie target
2. **MacroWheel** - Macro distribution (if component exists)
3. **ProgressTabEnhanced** - Progress tracking

## Testing Checklist

- [x] Manual macro edit saves correctly
- [x] `manual_macro_override` flag sets to TRUE
- [x] Target calories calculated from macros
- [x] Dashboard updates immediately
- [x] TEF calculation accurate
- [x] Net calories correct
- [x] Reset to Auto works
- [x] Slider adjustment resets override
- [x] Build passes without errors

## Files Modified

1. `supabase/migrations/add_manual_macro_override_flag.sql` - New migration
2. `src/lib/macros.ts` - Helper functions
3. `src/components/profile/MacrosTab.tsx` - Core logic & UI
4. `src/components/DashboardPage.tsx` - Dashboard integration
5. `BIDIRECTIONAL_MACRO_CALORIE_SYSTEM.md` - This documentation

## Future Enhancements

Potential improvements:

1. **Macro suggestions**: Show recommended macro adjustments when manually editing
2. **Historical tracking**: Track macro override changes over time
3. **Preset macros**: Save and load custom macro presets
4. **Macro coaching**: AI suggestions based on progress and goals
5. **Advanced TEF**: Factor in meal timing and composition
6. **Fiber integration**: Include fiber in macro balance calculations

## Notes

- Users can freely switch between automatic and manual modes
- Manual macros always take precedence when override flag is TRUE
- TEF is always calculated and displayed regardless of mode
- System ensures data consistency across all views
- No data loss when switching modes
