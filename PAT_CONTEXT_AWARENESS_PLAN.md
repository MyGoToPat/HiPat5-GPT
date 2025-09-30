# Pat Context Awareness System - User State Detection

## Problem Statement

Pat needs to:
1. Detect first-time users (or users who haven't completed TDEE)
2. Remind users to complete essential setup (TDEE calculator)
3. Inform users about new features they should know about
4. Do this WITHOUT requiring a separate agent (keep system fast)
5. Integrate seamlessly into personality pipeline

## Current State Analysis

**Existing Infrastructure:**
- OnboardingContext exists but is UI-only (not persisted)
- user_profiles table has `onboarding_complete` flag
- TDEE calculator exists but completion not tracked
- No mechanism to check user state before chat

**Missing Pieces:**
- TDEE completion flag in database
- First-time user detection in chat flow
- Context injection into Pat's prompt
- Feature announcement system

## Solution: Context Pre-Processor (Not a Separate Agent)

Instead of adding another LLM agent, we use a **fast, deterministic context checker** that runs BEFORE Pat's personality system.

### Architecture

```
User Message
    ↓
┌─────────────────────────────────────┐
│  Context Pre-Processor (< 50ms)     │  ← NEW
│  - Check user_profiles flags        │
│  - Check TDEE completion            │
│  - Check new features seen          │
│  - Build context object             │
└─────────────────────────────────────┘
    ↓
    context = {
      isFirstTimeChat: boolean,
      hasTDEE: boolean,
      missingEssentials: string[],
      newFeatures: string[]
    }
    ↓
┌─────────────────────────────────────┐
│  Pat's Personality System            │
│  - Receives context as input        │
│  - Master prompt includes context   │
│  - Responds accordingly             │
└─────────────────────────────────────┘
```

### Implementation

#### 1. Database Schema Updates

```sql
-- Add TDEE tracking and feature flags to user_profiles
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS has_completed_tdee boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS tdee_data jsonb DEFAULT NULL,
ADD COLUMN IF NOT EXISTS last_tdee_update timestamptz DEFAULT NULL,
ADD COLUMN IF NOT EXISTS features_seen jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS chat_count int DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_chat_at timestamptz DEFAULT NULL;

-- Function to check if user needs onboarding reminders
CREATE OR REPLACE FUNCTION public.get_user_context_flags(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'isFirstTimeChat', COALESCE(chat_count, 0) = 0,
    'hasTDEE', COALESCE(has_completed_tdee, false),
    'tdeeAge', CASE 
      WHEN last_tdee_update IS NULL THEN NULL
      ELSE EXTRACT(EPOCH FROM (now() - last_tdee_update)) / 86400
    END,
    'chatCount', COALESCE(chat_count, 0),
    'featuresSeen', COALESCE(features_seen, '[]'::jsonb),
    'onboardingComplete', COALESCE(onboarding_complete, false)
  ) INTO v_result
  FROM public.user_profiles
  WHERE user_id = p_user_id;
  
  RETURN COALESCE(v_result, '{}'::jsonb);
END;
$$;

-- Function to update user context after chat
CREATE OR REPLACE FUNCTION public.update_user_chat_context(
  p_user_id uuid,
  p_feature_shown text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.user_profiles
  SET 
    chat_count = COALESCE(chat_count, 0) + 1,
    last_chat_at = now(),
    features_seen = CASE 
      WHEN p_feature_shown IS NOT NULL THEN 
        COALESCE(features_seen, '[]'::jsonb) || to_jsonb(p_feature_shown)
      ELSE features_seen
    END
  WHERE user_id = p_user_id;
END;
$$;

-- Function to mark TDEE as completed
CREATE OR REPLACE FUNCTION public.mark_tdee_completed(
  p_user_id uuid,
  p_tdee_data jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.user_profiles
  SET 
    has_completed_tdee = true,
    tdee_data = p_tdee_data,
    last_tdee_update = now()
  WHERE user_id = p_user_id;
END;
$$;
```

#### 2. Context Pre-Processor Module

**File: src/lib/personality/contextChecker.ts**

```typescript
import { getSupabase } from '@/lib/supabase';

export interface UserContextFlags {
  isFirstTimeChat: boolean;
  hasTDEE: boolean;
  tdeeAge: number | null; // Days since TDEE was calculated
  chatCount: number;
  featuresSeen: string[];
  onboardingComplete: boolean;
  missingEssentials: string[];
  newFeaturesToShow: string[];
}

// Feature announcement system
const CURRENT_FEATURES = [
  {
    id: 'voice-chat-v1',
    name: 'Voice Chat',
    description: 'Talk to me hands-free',
    priority: 'high'
  },
  {
    id: 'food-camera-v1', 
    name: 'Food Photo Logging',
    description: 'Take photos of meals for instant macro tracking',
    priority: 'medium'
  }
];

export async function getUserContextFlags(userId: string): Promise<UserContextFlags> {
  const supabase = getSupabase();
  
  // Call database function to get user context
  const { data, error } = await supabase.rpc('get_user_context_flags', {
    p_user_id: userId
  });
  
  if (error) {
    console.error('Error fetching user context:', error);
    // Return safe defaults
    return {
      isFirstTimeChat: false,
      hasTDEE: false,
      tdeeAge: null,
      chatCount: 0,
      featuresSeen: [],
      onboardingComplete: false,
      missingEssentials: [],
      newFeaturesToShow: []
    };
  }
  
  const flags = data as any;
  
  // Determine missing essentials
  const missingEssentials: string[] = [];
  if (!flags.hasTDEE) {
    missingEssentials.push('TDEE Calculator');
  }
  if (!flags.onboardingComplete) {
    missingEssentials.push('Profile Setup');
  }
  
  // Determine new features to show (limit to 1 per chat to avoid overwhelming)
  const featuresSeen = flags.featuresSeen || [];
  const newFeaturesToShow = CURRENT_FEATURES
    .filter(f => !featuresSeen.includes(f.id))
    .filter(f => f.priority === 'high') // Only show high priority features automatically
    .slice(0, 1) // Max 1 feature per chat
    .map(f => f.name);
  
  return {
    isFirstTimeChat: flags.isFirstTimeChat,
    hasTDEE: flags.hasTDEE,
    tdeeAge: flags.tdeeAge,
    chatCount: flags.chatCount,
    featuresSeen: featuresSeen,
    onboardingComplete: flags.onboardingComplete,
    missingEssentials,
    newFeaturesToShow
  };
}

export async function updateUserChatContext(
  userId: string, 
  featureShown?: string
): Promise<void> {
  const supabase = getSupabase();
  
  await supabase.rpc('update_user_chat_context', {
    p_user_id: userId,
    p_feature_shown: featureShown || null
  });
}

export async function markTDEECompleted(
  userId: string,
  tdeeData: any
): Promise<void> {
  const supabase = getSupabase();
  
  await supabase.rpc('mark_tdee_completed', {
    p_user_id: userId,
    p_tdee_data: tdeeData
  });
}

// Helper to build context message for Pat's prompt
export function buildContextMessage(flags: UserContextFlags): string {
  const messages: string[] = [];
  
  if (flags.isFirstTimeChat) {
    messages.push("This is the user's first interaction with you.");
  }
  
  if (!flags.hasTDEE) {
    messages.push("User has NOT completed TDEE calculator (CRITICAL for accurate tracking and goals).");
  } else if (flags.tdeeAge && flags.tdeeAge > 90) {
    messages.push(`User's TDEE calculation is ${Math.floor(flags.tdeeAge)} days old (recommend recalculation).`);
  }
  
  if (flags.newFeaturesToShow.length > 0) {
    messages.push(`New feature available: ${flags.newFeaturesToShow[0]}`);
  }
  
  if (messages.length === 0) {
    return "User context: All essentials completed, no urgent reminders.";
  }
  
  return `User context:\n${messages.map(m => `- ${m}`).join('\n')}`;
}
```

#### 3. Integration into Personality Pipeline

**File: src/lib/personality/orchestrator.ts (UPDATE)**

```typescript
import { getUserContextFlags, buildContextMessage, updateUserChatContext } from './contextChecker';

export async function runPersonalityPipeline(input: RunInput) {
  const startTime = Date.now();
  
  // STEP 0: Context Pre-Processor (NEW - runs first, < 50ms)
  const contextFlags = await getUserContextFlags(input.context.userId);
  const contextMessage = buildContextMessage(contextFlags);
  
  // Add context to input
  input.context.userContextFlags = contextFlags;
  input.context.contextMessage = contextMessage;
  
  // Log context check (background, non-blocking)
  updateUserChatContext(input.context.userId).catch(console.error);
  
  // STEP 1: Role detection (existing)
  const roleContext = detectRole(input.userMessage);
  
  // STEP 2: Execute based on role (existing)
  // ... rest of pipeline
}
```

#### 4. Update Master Prompt with Context Awareness

**File: supabase/functions/openai-chat/index.ts (UPDATE)**

```javascript
const PAT_MASTER_PROMPT = `You are Pat, Hyper Intelligent Personal Assistant Team.

[... existing identity and rules ...]

CONTEXT AWARENESS & ESSENTIAL REMINDERS:
I monitor each user's profile status and provide timely reminders about essential tasks.

When a user is missing critical setup:
- TDEE Calculator: Required for accurate calorie/macro targets and progress tracking
- Profile Setup: Required for personalized recommendations

HANDLING MISSING ESSENTIALS:
If user context indicates missing TDEE:
  1. Acknowledge their current question/message
  2. Provide a brief, helpful response
  3. Add a clear, actionable reminder about TDEE
  4. Example: "I need your TDEE calculation to provide accurate targets. 
     Complete the TDEE calculator (takes 2 minutes) to unlock precise recommendations."

If this is user's first chat:
  1. Warm welcome: "Welcome. I am Pat, your intelligent assistant for fitness and nutrition."
  2. Brief value proposition: "I track your progress, answer questions, and optimize your results."
  3. Essential first step: "Complete TDEE calculator first for accurate tracking."

REMINDER STYLE:
- Direct and clear (not pushy)
- Explain WHY it's important (accuracy, personalization)
- Provide clear next step
- Don't let missing data block the conversation
- Give helpful response AND reminder

EXAMPLE RESPONSES:

User (no TDEE): "How much protein should I eat?"
Pat: "Optimal protein intake is 1.6-2.2g per kg bodyweight [meta-analysis].
Without your TDEE calculation, I am estimating. Complete TDEE calculator for precise targets 
based on your stats and goals. Takes 2 minutes.
Next: Navigate to TDEE Calculator in menu."

User (first time): "Hey Pat"
Pat: "Welcome. I am Pat.
I track your nutrition, program your training, and optimize your performance.
First step: Complete TDEE calculator (2 minutes). This enables accurate tracking and 
personalized recommendations.
Ask me anything about fitness, nutrition, or training."

[... rest of master prompt ...]
`;
```

#### 5. UI Integration for TDEE Completion

**File: src/components/TDEECalculator.tsx (UPDATE)**

Add this at the end of successful TDEE calculation:

```typescript
import { markTDEECompleted } from '@/lib/personality/contextChecker';

// After TDEE calculation succeeds:
const handleTDEEComplete = async (tdeeData) => {
  // Save to database
  await saveTDEE(tdeeData);
  
  // Mark as completed for Pat's context
  await markTDEECompleted(user.id, {
    tdee: tdeeData.tdee,
    bmr: tdeeData.bmr,
    macros: tdeeData.macros,
    calculated_at: new Date().toISOString()
  });
  
  // Show success message
  toast.success('TDEE calculated! Pat now has your accurate targets.');
};
```

## Benefits of This Approach

1. **No Additional LLM Agent:** Deterministic database checks (< 50ms)
2. **Seamless Integration:** Context flows naturally into Pat's prompt
3. **Scalable:** Easy to add new features/reminders
4. **Cost-Effective:** Zero additional API calls
5. **Smart Timing:** Only shows reminders when relevant
6. **Non-Blocking:** User can still chat, Pat just adds gentle reminder
7. **Trackable:** Database logs what features/reminders shown

## Performance Impact

```
Before context check: 1.5s average response time
After context check:  1.55s average response time (+50ms)

Cost: $0 (database query only, no LLM)
```

## Implementation Timeline

**Phase 1 (1 hour):** Database migration + context checker functions
**Phase 2 (1 hour):** Context pre-processor module
**Phase 3 (30 min):** Integrate into personality pipeline
**Phase 4 (30 min):** Update master prompt with context handling
**Phase 5 (30 min):** Connect TDEE calculator to mark completion

**Total: 3.5 hours**

## Future Extensions

This system can easily be extended for:
- Stale data warnings (TDEE > 90 days old)
- Feature announcements (new capabilities)
- Milestone celebrations (first workout logged, etc.)
- Educational content (tips based on usage patterns)
- Seasonal reminders (reassess goals quarterly)

All without adding LLM agents - just database flags and smart prompt injection.
