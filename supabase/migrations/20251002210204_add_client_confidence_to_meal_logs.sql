/*
  # Add client_confidence column to meal_logs

  1. Changes
    - Add `client_confidence` column to `meal_logs` table
    - Column type: float (0.0 to 1.0)
    - Nullable: Yes (for backward compatibility with existing records)
    - Constraint: Value must be between 0 and 1

  2. Notes
    - This column tracks the confidence level of meal logging from the client side
    - Used by TMWYA (Tell Me What You Ate) system for meal verification
*/

-- Add client_confidence column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meal_logs' AND column_name = 'client_confidence'
  ) THEN
    ALTER TABLE public.meal_logs 
    ADD COLUMN client_confidence float CHECK (client_confidence >= 0 AND client_confidence <= 1);
  END IF;
END $$;
