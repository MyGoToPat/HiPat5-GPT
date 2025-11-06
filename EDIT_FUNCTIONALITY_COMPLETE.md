# Edit Functionality Complete

## Summary

Successfully added inline editing capability to MealVerifyCard, allowing users to modify quantity and unit values before confirming a meal log. Macros are recomputed automatically when values are edited.

## Changes Made

### 1. MealVerifyCard.tsx
- Added `onUpdate` prop to handle view updates from parent
- Added state: `isEditing` and `editedRows`
- Added Edit button that appears when `view.actions` includes `'EDIT_ITEMS'`
- Created `EditMealSheet` component with:
  - Inline editing inputs for Qty (number) and Unit (dropdown)
  - Applied styling consistent with existing dark theme
  - Modal overlay with click-outside-to-close
- Added macro recomputation logic:
  - When Apply is clicked, runs `portionResolver` → `macroLookup` → `computeTEF`
  - Updates rows with recalculated macros (calories, protein, carbs, fat, fiber)
  - Updates totals and TEF automatically
  - Calls `onUpdate` callback to sync changes with parent

### 2. ChatPat.tsx
- Added `onUpdate` callback to MealVerifyCard invocation
- Updates message's `roleData.view` when Edit sheet applies changes
- Ensures edited values persist through Confirm action

### 3. handleUserMessage.ts
- Added `'EDIT_ITEMS'` to actions array in verify view (line 134)
- Users can now edit meal items before logging

## How It Works

1. User types "i ate 3 eggs" → MealVerifyCard renders with macro values
2. If macros are 0 or incorrect, user clicks **Edit** button
3. Edit sheet opens with current qty/unit values
4. User modifies values (e.g., changes 3 → 2, or adds unit if missing)
5. User clicks **Apply**
6. System recomputes macros using portionResolver + macroLookup
7. MealVerifyCard updates with new macro values, totals, and TEF
8. User clicks **Confirm log** → meal logged with corrected values

## Visual Design

- Edit button: Blue border, appears between Cancel and Confirm Log
- Edit sheet: Modal overlay with dark theme matching verify card
- Inputs: Number field for Qty (step 0.1), dropdown for Unit
- Unit options: piece, cup, g, oz, tbsp, tsp, ml, slice
- Mobile-friendly: Sheet opens from bottom on mobile, centered on desktop

## Testing Checklist

- [ ] Type "i ate 3 eggs" → verify card appears
- [ ] Click Edit → sheet opens with current values
- [ ] Change qty from 3 to 2 → Apply → macros update
- [ ] Change unit from null to "piece" → Apply → macros populate
- [ ] Click Confirm → check DB for logged values
- [ ] Verify macros are not zero after editing

## Next Steps

- Test with various meal inputs to ensure macros populate correctly
- Consider adding macros display in edit sheet for immediate feedback
- Add "Delete row" option in edit sheet for multi-item meals
- Consider adding "Add item" option in edit sheet for missed items


