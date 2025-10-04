/*
  # Add Weight Unit Tracking and Body Fat Percentage Logs

  ## Changes
  1. Add `logged_unit` column to weight_logs to remember which unit was used
  2. Create `body_fat_logs` table for tracking body fat percentage over time
  3. Add RLS policies for body_fat_logs
  
  ## New Tables
  - `body_fat_logs`:
    - `id` (uuid, primary key)
    - `user_id` (uuid, foreign key to auth.users)
    - `body_fat_percent` (numeric)
    - `log_date` (date)
    - `note` (text, optional)
    - `created_at` (timestamptz)
    - Unique constraint on (user_id, log_date)
  
  ## Security
  - Enable RLS on body_fat_logs
  - Users can only read/write their own logs
*/

-- Add logged_unit column to weight_logs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'weight_logs' AND column_name = 'logged_unit'
  ) THEN
    ALTER TABLE weight_logs 
    ADD COLUMN logged_unit text DEFAULT 'lbs' CHECK (logged_unit IN ('lbs', 'kg'));
  END IF;
END $$;

-- Create body_fat_logs table
CREATE TABLE IF NOT EXISTS body_fat_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  body_fat_percent numeric NOT NULL CHECK (body_fat_percent >= 0 AND body_fat_percent <= 100),
  log_date date NOT NULL,
  note text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, log_date)
);

-- Enable RLS
ALTER TABLE body_fat_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for body_fat_logs
CREATE POLICY "Users can view own body fat logs"
  ON body_fat_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own body fat logs"
  ON body_fat_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own body fat logs"
  ON body_fat_logs FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own body fat logs"
  ON body_fat_logs FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_body_fat_logs_user_date 
  ON body_fat_logs(user_id, log_date DESC);