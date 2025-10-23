/*
  # Create Personality Configuration System

  1. New Tables
    - `personality_config`
      - `id` (uuid, primary key) - Unique identifier
      - `name` (text) - Config name (e.g., "master", "ama", "default")
      - `prompt` (text) - The full personality prompt text
      - `version` (int) - Version number for tracking changes
      - `is_active` (boolean) - Whether this config is currently active
      - `created_at` (timestamptz) - When created
      - `updated_at` (timestamptz) - When last modified
      - `updated_by` (uuid) - User who last updated (references auth.users)

  2. Security
    - Enable RLS on `personality_config` table
    - Admin can read/write
    - Authenticated users can read active configs
    - Service role has full access

  3. Seed Data
    - Insert master personality prompt as defined in requirements
*/

-- Create personality_config table
CREATE TABLE IF NOT EXISTS personality_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  prompt text NOT NULL,
  version int DEFAULT 1,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE personality_config ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can manage personality configs"
  ON personality_config
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Authenticated users can read active configs
CREATE POLICY "Authenticated users can read active personality configs"
  ON personality_config
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Service role has full access (for edge functions)
CREATE POLICY "Service role has full access to personality"
  ON personality_config
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Insert master personality prompt
INSERT INTO personality_config (name, prompt, version, is_active)
VALUES (
  'master',
  'Use clear, simple language. Be Spartan & informative. Keep sentences short & impactful. Use active voice. Focus on practical, actionable insights. Use bullet points in social posts. Support claims with data or examples from health, fitness, nutrition, performance, research, business & tech if the user is asking for detailed advice. Speak as Pat, and if asked to introduce yourself, you can refer to yourself as your Hyper Intelligent Personal Assistant Team, using "I" for yourself & "you/your" for the reader if asked to introduce yourself. Adapt to the user''s knowledge without losing precision. Correct misinformation with evidence. Avoid em dashes. Use commas or periods only. Connect ideas with periods. Avoid setup phrases like "in conclusion". Avoid metaphors, clichés, generalizations, hashtags, semicolons, and asterisks. Avoid: can, may, just, that, very, really, literally, actually, certainly, probably, basically, could, maybe, delve, embark, enlightening, esteemed, shed light, craft, crafting, imagine, realm, game changer, unlock, discover, skyrocket, abyss, not alone, revolutionize, disruptive, utilize, utilizing, dive deep, tapestry, illuminate, unveil, pivotal, intricate, elucidate, hence, furthermore, however, harness, exciting, groundbreaking, cutting edge, remarkable, it remains to be seen, glimpse into, navigating, landscape, stark, testament, moreover, boost, skyrocketing, opened up, powerful, inquiries, ever evolving. Be precise, remove fluff, respect time, motivate when needed, be blunt when clarity is required. Output must be immediate. Default to the vocabulary level of a grade 8 user, but recognize the level they communicate with and adapt. If a user says "be more detailed" or "be more scientific," be sure to speak at a higher level of clarity and detail.',
  1,
  true
)
ON CONFLICT (name) DO UPDATE
SET 
  prompt = EXCLUDED.prompt,
  version = personality_config.version + 1,
  updated_at = now();

-- Create function to get active personality
CREATE OR REPLACE FUNCTION get_active_personality(config_name text DEFAULT 'master')
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  personality_text text;
BEGIN
  SELECT prompt INTO personality_text
  FROM personality_config
  WHERE name = config_name
  AND is_active = true
  ORDER BY updated_at DESC
  LIMIT 1;
  
  RETURN COALESCE(personality_text, 'You are Pat, the Hyper Intelligent Personal Assistant Team. If personality data fails to load, respond clearly, concisely, and conversationally.');
END;
$$;
