/*
  # Add feature_flags to user_preferences
  
  1. Changes
    - Add feature_flags JSONB column to user_preferences
    - Allows per-user override of feature rollouts
    
  2. Purpose
    - Enable gradual Swarm 2.2 rollout with user-specific overrides
    - Support A/B testing and beta user enrollment
    
  3. Schema
    - feature_flags.swarm_v2_enabled: boolean (true/false/null)
    - NULL = use global rollout percentage
    - true/false = explicit user override
    
  4. Security
    - RLS already covers user_preferences
    - Users can only modify their own preferences
*/

-- Add feature_flags column
ALTER TABLE user_preferences 
ADD COLUMN IF NOT EXISTS feature_flags JSONB DEFAULT '{}'::jsonb;

-- Add helpful comment
COMMENT ON COLUMN user_preferences.feature_flags IS 
'Feature flag overrides per user. Example: {"swarm_v2_enabled": true} to force-enable Swarm 2.2. NULL values use global rollout percentage.';

-- Create index for fast feature flag lookups
CREATE INDEX IF NOT EXISTS idx_user_preferences_feature_flags 
ON user_preferences USING GIN(feature_flags);
