/*
  # Create Undo Tokens Table

  1. New Tables
    - `undo_tokens`
      - `id` (uuid, primary key) - Unique token identifier
      - `user_id` (uuid, foreign key) - Owner of the meal log
      - `meal_log_id` (uuid) - Reference to meal_logs entry
      - `meal_items_ids` (uuid[]) - Array of meal_items IDs that were logged
      - `created_at` (timestamptz) - When the token was created
      - `expires_at` (timestamptz) - Token expiration (24 hours from creation)
      - `used` (boolean) - Whether the undo has been executed
  
  2. Security
    - Enable RLS on `undo_tokens` table
    - Add policy for authenticated users to read their own tokens
    - Add policy for authenticated users to update their own tokens (mark as used)
  
  3. Indexes
    - Index on user_id for fast user lookups
    - Index on meal_log_id for fast meal lookups
    - Index on created_at for cleanup queries
*/

-- Create undo_tokens table
CREATE TABLE IF NOT EXISTS undo_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  meal_log_id uuid NOT NULL,
  meal_items_ids uuid[] NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '24 hours'),
  used boolean DEFAULT false
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_undo_tokens_user_id ON undo_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_undo_tokens_meal_log_id ON undo_tokens(meal_log_id);
CREATE INDEX IF NOT EXISTS idx_undo_tokens_created_at ON undo_tokens(created_at);
CREATE INDEX IF NOT EXISTS idx_undo_tokens_expires_at ON undo_tokens(expires_at) WHERE NOT used;

-- Enable RLS
ALTER TABLE undo_tokens ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own tokens
CREATE POLICY "Users can read own undo tokens"
  ON undo_tokens
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Users can update their own tokens
CREATE POLICY "Users can update own undo tokens"
  ON undo_tokens
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: System can insert tokens
CREATE POLICY "System can insert undo tokens"
  ON undo_tokens
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Function to clean up expired tokens (run via cron or scheduled task)
CREATE OR REPLACE FUNCTION cleanup_expired_undo_tokens()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM undo_tokens
  WHERE expires_at < now() OR (used = true AND created_at < now() - interval '7 days');
END;
$$;