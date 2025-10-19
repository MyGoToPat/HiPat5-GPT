/*
  # Create admin action audit log table

  1. New Tables
    - `admin_action_logs`
      - `id` (uuid, primary key)
      - `actor_uid` (uuid, not null) — admin who performed the action
      - `action` (text, not null) — action type
      - `target` (text, not null) — target resource
      - `payload` (jsonb) — action details
      - `created_at` (timestamptz, default now())

  2. Security
    - Enable RLS on `admin_action_logs` table
    - Add policy for authenticated admins to read logs
    - No public access

  3. Indexes
    - Index on created_at for chronological queries
    - Index on actor_uid for per-admin queries
*/

-- Enable pgcrypto extension if needed
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create audit log table
CREATE TABLE IF NOT EXISTS admin_action_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_uid UUID NOT NULL,
  action TEXT NOT NULL,
  target TEXT NOT NULL,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS admin_action_logs_created_at_idx
  ON admin_action_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS admin_action_logs_actor_idx
  ON admin_action_logs(actor_uid);

CREATE INDEX IF NOT EXISTS admin_action_logs_action_idx
  ON admin_action_logs(action);

-- Enable RLS
ALTER TABLE admin_action_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can read all action logs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'admin_action_logs'
    AND policyname = 'Admins can read action logs'
  ) THEN
    CREATE POLICY "Admins can read action logs"
      ON admin_action_logs FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.user_id = auth.uid()
          AND profiles.role = 'admin'
        )
      );
  END IF;
END$$;

-- Comment for documentation
COMMENT ON TABLE admin_action_logs IS 'Audit trail for all admin actions in Enhanced Swarms';
COMMENT ON COLUMN admin_action_logs.action IS 'Action type: create_prompt_draft, publish_prompt, create_swarm_draft, publish_swarm, update_rollout';
COMMENT ON COLUMN admin_action_logs.target IS 'Target resource in format: table_name:id';
COMMENT ON COLUMN admin_action_logs.payload IS 'JSON payload containing action-specific details';
