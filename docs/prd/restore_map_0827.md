# HiPat – Deleted UI Feature Sets (0827)

This list mirrors the "Temporary UI Suppressions (Restoration PRD)" in Canvas. Use this file + your archived ZIP to restore later.

## Food Log (UI)
- src/pages/log/FoodLogPage.tsx
- src/components/FoodLogDrawer.tsx
- src/components/food/FoodItemRow.tsx
- src/components/food/MacroBadge.tsx
- src/components/FoodVerificationScreen.tsx
- src/lib/food.ts
- src/utils/getTotalMacros.ts

## Dashboard sections (components)
- src/components/dashboard/CrossMetricInsights.tsx (if present)
- src/components/dashboard/ActivityLog.tsx (if present)

## Profile subsections
- src/components/profile/ProgressVisualizations.tsx
- src/components/profile/AIInsights.tsx

## Voice settings
- src/pages/VoicePage.tsx

## Interval Timer
- src/pages/IntervalTimerPage.tsx
- src/components/timer/* (entire folder)
- src/context/TimerContext.tsx
- src/hooks/useTimerEngine.ts
- src/types/timer.ts

## Debug page
- src/pages/DebugPage.tsx