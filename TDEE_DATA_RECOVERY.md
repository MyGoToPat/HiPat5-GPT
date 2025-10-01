# TDEE Data Recovery Guide

## Issue Identified

The TDEE onboarding wizard had a critical bug where:
1. The `isLoggedIn` state was hardcoded to `false` in OnboardingContext
2. Logged-in users were shown the email capture screen instead of the auto-save completion screen
3. The "Finish" button on email screen didn't save TDEE data for logged-in users
4. Result: Users completed onboarding but their macro targets were never saved to `user_metrics` table

## Fixes Applied

### 1. Fixed Authentication Detection (`OnboardingContext.tsx`)
- Added `useEffect` to check real auth status on mount
- Now properly detects logged-in vs anonymous users

### 2. Fixed Completion Flow (`TDEEOnboardingWizard.tsx`)
- Logged-in users → StepCompletion (auto-saves data)
- Anonymous users → StepEmailPrompt (lead capture)

### 3. Fixed Email Step Fallback (`StepEmailPrompt.tsx`)
- "Finish" button now saves data for logged-in users before completing
- Added loading state and proper error handling

## For Affected Users

If you completed TDEE onboarding but your dashboard shows "0 / 0g" for all macros:

### Option 1: Re-run TDEE Onboarding
1. Navigate to the TDEE wizard
2. Complete all steps again
3. Your data will now be properly saved

### Option 2: Manual Data Entry (Admin/Support)
Admins can insert data directly:

```sql
INSERT INTO user_metrics (user_id, tdee, bmr, protein_g, carbs_g, fat_g, updated_at)
VALUES (
  'USER_ID_HERE',
  2200,  -- TDEE
  1800,  -- BMR
  150,   -- Protein (g)
  200,   -- Carbs (g)
  60,    -- Fat (g)
  NOW()
)
ON CONFLICT (user_id) DO UPDATE SET
  tdee = EXCLUDED.tdee,
  bmr = EXCLUDED.bmr,
  protein_g = EXCLUDED.protein_g,
  carbs_g = EXCLUDED.carbs_g,
  fat_g = EXCLUDED.fat_g,
  updated_at = EXCLUDED.updated_at;
```

## Verification

After fix, verify data was saved:

```sql
SELECT user_id, tdee, bmr, protein_g, carbs_g, fat_g, updated_at
FROM user_metrics
WHERE user_id = 'YOUR_USER_ID';
```

Dashboard should now show:
- Target calories in Daily Summary
- Macro targets (Consumed / Target format)
- Remaining macros throughout the day
- Progress rings in Energy section
