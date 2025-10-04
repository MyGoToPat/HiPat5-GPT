/*
  # Create portion_defaults table for unified nutrition data

  1. New Tables
    - `portion_defaults`
      - `id` (uuid, primary key)
      - `food_name` (text, standardized lowercase)
      - `basis` (text, always 'raw_per_100g')
      - `kcal` (numeric, calories)
      - `protein_g` (numeric, protein grams)
      - `carbs_g` (numeric, carbohydrate grams)
      - `fat_g` (numeric, fat grams)
      - `confidence` (numeric, 0-1 scale)
      - `source` (text, 'gpt-4o' or other)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Indexes
    - Unique index on food_name for fast lookups

  3. Security
    - Enable RLS
    - Allow authenticated users to read
    - Only service role can write (edge functions)

  4. Seed Data
    - Common foods with RAW per 100g macros
*/

-- Create portion_defaults table
CREATE TABLE IF NOT EXISTS portion_defaults (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  food_name text NOT NULL,
  basis text NOT NULL DEFAULT 'raw_per_100g',
  kcal numeric NOT NULL,
  protein_g numeric NOT NULL,
  carbs_g numeric NOT NULL,
  fat_g numeric NOT NULL,
  confidence numeric DEFAULT 0.85,
  source text DEFAULT 'gpt-4o',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create unique index for fast lookups
CREATE UNIQUE INDEX IF NOT EXISTS portion_defaults_food_name_idx ON portion_defaults(LOWER(food_name));

-- Enable RLS
ALTER TABLE portion_defaults ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read
CREATE POLICY "Authenticated users can read portion defaults"
  ON portion_defaults
  FOR SELECT
  TO authenticated
  USING (true);

-- Only service role can insert/update
CREATE POLICY "Service role can insert portion defaults"
  ON portion_defaults
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update portion defaults"
  ON portion_defaults
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Seed common foods with RAW per 100g macros
INSERT INTO portion_defaults (food_name, kcal, protein_g, carbs_g, fat_g, confidence, source) VALUES
  ('chicken breast', 107, 23, 0, 1.2, 0.95, 'usda'),
  ('brown rice', 112, 2.6, 24, 0.9, 0.95, 'usda'),
  ('salmon', 142, 20, 0, 6.3, 0.95, 'usda'),
  ('broccoli', 34, 2.8, 7, 0.4, 0.95, 'usda'),
  ('egg', 143, 13, 1.1, 9.5, 0.95, 'usda'),
  ('oats', 389, 16.9, 66.3, 6.9, 0.95, 'usda'),
  ('banana', 89, 1.1, 23, 0.3, 0.95, 'usda'),
  ('sweet potato', 86, 1.6, 20, 0.1, 0.95, 'usda'),
  ('ground beef', 250, 17, 0, 20, 0.90, 'usda'),
  ('white rice', 130, 2.7, 28, 0.3, 0.95, 'usda')
ON CONFLICT (LOWER(food_name)) DO NOTHING;
