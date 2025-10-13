/*
  # Drop old log_meal function with 5 parameters
  
  1. Changes
    - Drop the old log_meal(timestamptz, text, text, jsonb, jsonb) function
    - This version doesn't cast meal_slot text to enum properly
    - Keep only the new 4-parameter version that handles casting correctly
*/

-- Drop the old 5-parameter version
DROP FUNCTION IF EXISTS public.log_meal(timestamptz, text, text, jsonb, jsonb);
