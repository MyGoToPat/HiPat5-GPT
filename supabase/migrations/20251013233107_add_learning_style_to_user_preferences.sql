/*
  # Add learning_style column to user_preferences

  1. Changes
    - Add learning_style column (text) with constraint
    - Default to 'unknown' for existing users
    
  2. Notes
    - This allows the personality system to adapt responses based on user learning preferences
    - Valid values: visual, auditory, kinesthetic, unknown
*/

-- Add learning_style column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_preferences' 
      AND column_name = 'learning_style'
  ) THEN
    ALTER TABLE user_preferences 
    ADD COLUMN learning_style text 
    CHECK (learning_style IN ('visual', 'auditory', 'kinesthetic', 'unknown')) 
    DEFAULT 'unknown';
  END IF;
END $$;

-- Add comment
COMMENT ON COLUMN user_preferences.learning_style IS 'User learning preference: visual, auditory, kinesthetic, or unknown';
