/*
  # Food Defaults and Unit Conversions
  
  1. New Tables
    - `food_defaults`: Canonical food serving sizes, prep states (cooked/raw), density data
    - `unit_conversions`: Standard unit conversion factors
    
  2. Purpose
    - Provides consistent food normalization (e.g., "large egg" → 50g)
    - Enables "cooked by default" policy
    - Supports volume→weight conversions
    - Reduces LLM estimation variance
    
  3. Security
    - Public read access (reference data)
    - Admin-only write access
    - RLS enabled on both tables
*/

-- Food defaults table
CREATE TABLE IF NOT EXISTS food_defaults (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  food_name TEXT NOT NULL,
  aliases TEXT[] DEFAULT '{}', -- ["ribeye", "rib eye", "rib-eye"]
  default_quantity NUMERIC NOT NULL,
  default_unit TEXT NOT NULL,
  prep_state TEXT NOT NULL DEFAULT 'cooked', -- 'cooked', 'raw', 'mixed'
  density_g_per_cup NUMERIC, -- For volume conversions (optional)
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_food_defaults_name ON food_defaults(food_name);
CREATE INDEX IF NOT EXISTS idx_food_defaults_aliases ON food_defaults USING GIN(aliases);

-- Unit conversions table
CREATE TABLE IF NOT EXISTS unit_conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_unit TEXT NOT NULL,
  to_unit TEXT NOT NULL,
  factor NUMERIC NOT NULL, -- multiply by this factor
  food_category TEXT, -- 'liquid', 'grain', 'meat', 'general', 'eggs', etc.
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Unique constraint on conversion pairs
CREATE UNIQUE INDEX IF NOT EXISTS idx_unit_conversions_pair 
ON unit_conversions(from_unit, to_unit, COALESCE(food_category, ''));

-- RLS: Read-only for all, write for admins only
ALTER TABLE food_defaults ENABLE ROW LEVEL SECURITY;
ALTER TABLE unit_conversions ENABLE ROW LEVEL SECURITY;

-- Public read policies
CREATE POLICY "Anyone can read food defaults"
  ON food_defaults FOR SELECT
  USING (true);

CREATE POLICY "Anyone can read unit conversions"
  ON unit_conversions FOR SELECT
  USING (true);

-- Admin write policies
CREATE POLICY "Admins can manage food defaults"
  ON food_defaults FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can manage unit conversions"
  ON unit_conversions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Add helpful comments
COMMENT ON TABLE food_defaults IS 
'Canonical food reference data: default servings, prep states, and density for consistent nutrition lookups';

COMMENT ON TABLE unit_conversions IS 
'Standard unit conversion factors for normalizing food quantities';
