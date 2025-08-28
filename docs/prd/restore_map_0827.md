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

## Profile (main tab)
- Sections removed:
  - "AI Insights" (component: AIInsights)
  - "Progress Overview" (component: ProgressVisualizations)
  - "Current Goal" (e.g., CurrentGoalCard/GoalSummary or a card headed "Current Goal")
  - "Monthly Consistency Score" (e.g., MonthlyConsistencyScore/ConsistencyScoreCard or a card headed "Consistency")
  - "Contact Support" block (to be replaced later by the "Make Me Better" agent)

## Profile → Preferences
- Removed UI:
  - Pat's Personality adjustments (3-button grid: Professional/Friendly/Casual)
  - Voice Settings controls (e.g., VoiceSettings component or JSX block)

## Profile → Quick Actions
- Removed component: QuickActions
  - "Chat with Pat" button
  - "View Dashboard" button  
  - "Log Activity" button
  - "Quick Check-in" button