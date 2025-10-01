/*
  # Pat Context Tracking System

  1. New Columns in user_profiles
    - `has_completed_tdee` (boolean) - Tracks if user completed TDEE calculator
    - `tdee_data` (jsonb) - Stores TDEE calculation results
    - `last_tdee_update` (timestamptz) - When TDEE was last calculated
    - `features_seen` (jsonb) - Array of feature IDs user has been shown
    - `chat_count` (int) - Number of chat interactions with Pat
    - `last_chat_at` (timestamptz) - Last time user chatted with Pat

  2. Functions
    - `get_user_context_flags` - Retrieves user context for Pat's awareness
    - `update_user_chat_context` - Updates chat count and feature tracking
    - `mark_tdee_completed` - Marks TDEE as completed and stores data

  3. Security
    - All functions use SECURITY DEFINER for consistent access
    - RLS policies remain unchanged (user can access own data)
*/

-- Add context tracking columns to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS has_completed_tdee boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS tdee_data jsonb DEFAULT NULL,
ADD COLUMN IF NOT EXISTS last_tdee_update timestamptz DEFAULT NULL,
ADD COLUMN IF NOT EXISTS features_seen jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS chat_count int DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_chat_at timestamptz DEFAULT NULL;

-- Function to get user context flags for Pat's awareness
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
  FROM public.profiles
  WHERE user_id = p_user_id;

  RETURN COALESCE(v_result, jsonb_build_object(
    'isFirstTimeChat', true,
    'hasTDEE', false,
    'tdeeAge', NULL,
    'chatCount', 0,
    'featuresSeen', '[]'::jsonb,
    'onboardingComplete', false
  ));
END;
$$;

-- Function to update user context after each chat
CREATE OR REPLACE FUNCTION public.update_user_chat_context(
  p_user_id uuid,
  p_feature_shown text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.profiles
  SET
    chat_count = COALESCE(chat_count, 0) + 1,
    last_chat_at = now(),
    features_seen = CASE
      WHEN p_feature_shown IS NOT NULL THEN
        COALESCE(features_seen, '[]'::jsonb) || to_jsonb(p_feature_shown)
      ELSE features_seen
    END
  WHERE user_id = p_user_id;

  -- Insert if profile doesn't exist yet (edge case)
  IF NOT FOUND THEN
    INSERT INTO public.profiles (
      user_id,
      chat_count,
      last_chat_at,
      features_seen
    )
    VALUES (
      p_user_id,
      1,
      now(),
      CASE WHEN p_feature_shown IS NOT NULL
        THEN to_jsonb(ARRAY[p_feature_shown])
        ELSE '[]'::jsonb
      END
    )
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
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
  UPDATE public.profiles
  SET
    has_completed_tdee = true,
    tdee_data = p_tdee_data,
    last_tdee_update = now()
  WHERE user_id = p_user_id;

  -- Insert if profile doesn't exist yet
  IF NOT FOUND THEN
    INSERT INTO public.profiles (
      user_id,
      has_completed_tdee,
      tdee_data,
      last_tdee_update
    )
    VALUES (
      p_user_id,
      true,
      p_tdee_data,
      now()
    )
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
END;
$$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_chat_tracking
  ON public.profiles(user_id, last_chat_at DESC)
  WHERE chat_count > 0;

CREATE INDEX IF NOT EXISTS idx_profiles_tdee_tracking
  ON public.profiles(user_id, has_completed_tdee)
  WHERE has_completed_tdee = false;
