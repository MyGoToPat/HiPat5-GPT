/*
  # Add Idempotency Key to meal_logs
  
  1. Changes
    - Add idempotency_key column to meal_logs table
    - Add unique index on (user_id, idempotency_key) to prevent duplicate logs
    - SHA-256 hash (16 chars) of userId + roundedTimestamp(30s) + sortedItems
    
  2. Purpose
    - Prevents duplicate meal logs when user types "log" multiple times
    - Guarantees single write even with network retries or double-taps
    
  3. Security
    - No RLS changes (existing policies cover)
    - Index only applies where idempotency_key IS NOT NULL
*/

-- Add idempotency_key column
ALTER TABLE meal_logs 
ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

-- Create unique index to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_meal_logs_idempotency 
ON meal_logs(user_id, idempotency_key)
WHERE idempotency_key IS NOT NULL;

-- Add helpful comment
COMMENT ON COLUMN meal_logs.idempotency_key IS 
'SHA-256 hash (16 chars) of userId+roundedTs(30s)+sortedItems to prevent duplicate logs. 30-second rounding window catches rapid double-taps.';
