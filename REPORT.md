# Data Source Audit Report

## ENV CHECK Results
```
[ENV CHECK] Supabase URL = https://jdtogitfqptdrxkczdbw.supabase.co
[ENV CHECK] ANON prefix = eyJhbGciOiJIU...
```

## Component Data Source Analysis

| Component/File | Uses Supabase? (Y/N) | Fallbacks Present? (Y/N) | Badge (live/mock/none) | Notes (hook/file + line refs) |
|---|---|---|---|---|
| `src/pages/DashboardPage.tsx` | Y | Y | live | Line 75: `supabase.from('user_metrics')`, Line 79: `supabase.from('food_logs')`. Also uses mock alerts array at line 27 |
| `src/components/dashboard/FrequencySection.tsx` | N | N | mock | Line 13: `mockFrequencyData` array with hardcoded workout data |
| `src/components/dashboard/RestSection.tsx` | N | N | mock | Line 14: `mockRestData` array with hardcoded sleep data |
| `src/components/dashboard/EnergySection.tsx` | Y | Y | live | Line 31: `supabase.from('user_metrics').select()` for macro overrides. Falls back to prop data or defaults |
| `src/components/dashboard/EffortSection.tsx` | N | N | mock | Line 13: `mockEffortData` array with hardcoded exercise data |
| `src/pages/ProfilePage.tsx` | Y | Y | live | Line 115: `getUserProfile(user.data.user.id)` via Supabase. Also uses mock achievements/insights |
| `src/components/profile/AchievementBadges.tsx` | N | N | mock | Line 41: `achievements` array passed as prop (hardcoded in ProfilePage) |
| `src/components/profile/ProgressVisualizations.tsx` | N | N | mock | Line 24: `weightData` array, Line 50: `progressMetrics` array with hardcoded data |
| `src/components/profile/AIInsights.tsx` | N | N | mock | Line 35: `insights` array with hardcoded AI insight data |
| `src/pages/TrainerDashboardPage.tsx` | N | N | mock | Line 69: `mockClients` array with hardcoded client data |
| `src/components/dashboard/AnalyticsDashboardSection.tsx` | N | N | mock | Line 46: `analyticsOverview`, Line 63: `chartData`, Line 121: `clientLeaderboard`, Line 174: `analyticsAlerts` |
| `src/components/dashboard/PermissionsSettingsPage.tsx` | N | N | mock | Line 55: `permissions` state with hardcoded permission data, Line 145: `auditLog` state |
| `src/components/dashboard/PTDirectivesTab.tsx` | N | N | mock | Line 51: `directives` state with hardcoded directive data, Line 114: `directiveTemplates` |
| `src/components/dashboard/WorkoutPlansTab.tsx` | N | N | mock | Line 81: `workoutPlans` state with hardcoded workout plan data, Line 154: `workoutTemplates` |

## MOCK SOURCES INDEX

**Files with hardcoded demo/mock data:**
- `src/components/dashboard/FrequencySection.tsx:13` - `mockFrequencyData` array
- `src/components/dashboard/RestSection.tsx:14` - `mockRestData` array  
- `src/components/dashboard/EffortSection.tsx:13` - `mockEffortData` array
- `src/components/dashboard/HeatmapCalendar.tsx:58` - Mock heatmap generation logic
- `src/components/dashboard/MacroWheel.tsx` - Uses calculated data from props, no mock arrays
- `src/components/dashboard/SleepStackedBar.tsx` - Uses data from props, no mock arrays
- `src/components/dashboard/VolumeProgressChart.tsx:21` - Mock weekly volume generation in `getWeeklyVolume()`
- `src/components/DashboardPage.tsx:27` - `alerts` mock array
- `src/components/DashboardPage.tsx:46` - `insights` mock array
- `src/components/profile/ProgressVisualizations.tsx:24` - `weightData` array
- `src/components/profile/ProgressVisualizations.tsx:50` - `progressMetrics` array
- `src/components/profile/AIInsights.tsx:35` - `insights` array
- `src/components/ProfilePage.tsx:75` - `achievements` array
- `src/components/ProfilePage.tsx:115` - `aiInsights` array  
- `src/components/ProfilePage.tsx:131` - `preferences` state default values
- `src/components/TrainerDashboardPage.tsx:69` - `mockClients` array
- `src/components/dashboard/AnalyticsDashboardSection.tsx:46` - `analyticsOverview` object
- `src/components/dashboard/AnalyticsDashboardSection.tsx:63` - `chartData` object
- `src/components/dashboard/AnalyticsDashboardSection.tsx:121` - `clientLeaderboard` array
- `src/components/dashboard/AnalyticsDashboardSection.tsx:174` - `analyticsAlerts` array
- `src/components/dashboard/PermissionsSettingsPage.tsx:55` - `permissions` state array
- `src/components/dashboard/PermissionsSettingsPage.tsx:145` - `auditLog` state array
- `src/components/dashboard/PTDirectivesTab.tsx:51` - `directives` state array
- `src/components/dashboard/PTDirectivesTab.tsx:114` - `directiveTemplates` array
- `src/components/dashboard/WorkoutPlansTab.tsx:81` - `workoutPlans` state array
- `src/components/dashboard/WorkoutPlansTab.tsx:154` - `workoutTemplates` array
- `src/utils/patMoodCalculator.ts:32` - Mock user metrics in dashboard usage
- `src/utils/conversationAgents.ts:6` - Static agents array
- `src/lib/shoplens.ts:31` - Mock analysis logic with deterministic responses

## LIVE QUERIES INDEX

**Files with Supabase queries used by Dashboard/Profile:**
- `src/components/DashboardPage.tsx:75` - `supabase.from('user_metrics').select('*').eq('user_id', user.id).maybeSingle()`
- `src/components/DashboardPage.tsx:79` - `supabase.from('food_logs').select('*').eq('user_id', user.id).gte('created_at', todayStart)`
- `src/components/dashboard/EnergySection.tsx:31` - `supabase.from('user_metrics').select('protein_g, carbs_g, fat_g').eq('user_id', user.id).maybeSingle()`
- `src/components/ProfilePage.tsx:115` - `getUserProfile(user.data.user.id)` → `supabase.from('profiles').select('*').eq('user_id', user_id).maybeSingle()`
- `src/lib/macros.ts:4` - `supabase.rpc('set_macro_overrides', { p_protein, p_fat, p_carb })`
- `src/hooks/useAuth.ts:13` - `supabase.auth.getSession()`, `supabase.auth.onAuthStateChange()`
- `src/hooks/useRole.ts:15` - `supabase.auth.getUser()`, `supabase.from('profiles').select('role').eq('user_id', user.id).maybeSingle()`

## Summary

**Live Data Components (7):**
- DashboardPage (primary metrics + food logs)
- EnergySection (macro overrides)
- ProfilePage (user profile data)
- Health page (db/edge function connectivity)
- Admin pages (user management, agents)
- Chat functionality (conversation history)
- Auth system (session management)

**Mock Data Components (10):**
- FrequencySection, RestSection, EffortSection (dashboard tiles)
- AchievementBadges, ProgressVisualizations, AIInsights (profile widgets)
- TrainerDashboardPage, AnalyticsDashboardSection (trainer features)
- PermissionsSettingsPage, PTDirectivesTab, WorkoutPlansTab (configuration UIs)

**Assessment:**
The application is correctly connected to the specified Supabase project. Core user data (profiles, metrics, food logs) and authentication flow through Supabase, while dashboard tiles and advanced features currently use placeholder data for UI development.