/*
  # Add Manual Macro Override Flag

  1. Changes
    - Add `manual_macro_override` boolean column to `user_metrics` table
    - Defaults to FALSE (system-calculated macros)
    - When TRUE, the system uses manually entered macros instead of calculated ones
  
  2. Purpose
    - Track when users manually edit their macros
    - Allow bidirectional calculation: calories → macros OR macros → calories
    - Preserve user's manual preferences until they reset to automatic mode
*/

-- Add manual override flag
ALTER TABLE user_metrics 
ADD COLUMN IF NOT EXISTS manual_macro_override BOOLEAN DEFAULT FALSE;

-- Add comment
COMMENT ON COLUMN user_metrics.manual_macro_override IS 
'When TRUE, macros were manually set by user and should override automatic calculations';
