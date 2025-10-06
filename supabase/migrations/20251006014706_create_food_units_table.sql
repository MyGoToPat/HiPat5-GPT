/*
  # Create food_units reference table

  1. New Tables
    - `food_units`
      - `id` (uuid, primary key)
      - `food_key` (text, indexed) - normalized food identifier
      - `display_name` (text) - human-readable name
      - `unit_label` (text) - unit type (slice, count, cup, etc.)
      - `grams_per_unit` (numeric) - conversion factor
      - `basis` (text) - cooked, raw, or as-served
      - `brand` (text, optional) - for branded items
      - `source` (text) - curated, usda, etc.
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS
    - Public read access (reference data)
    - Only service role can write

  3. Indexes
    - idx_food_units_key on food_key for fast lookups
    - idx_food_units_key_unit on (food_key, unit_label, basis) for exact matches

  4. Initial Seed Data
    - Common conversational units: bacon slices, bread slices, eggs, cheese, rice
*/

CREATE TABLE IF NOT EXISTS public.food_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  food_key text NOT NULL,
  display_name text NOT NULL,
  unit_label text NOT NULL,
  grams_per_unit numeric NOT NULL,
  basis text NOT NULL CHECK (basis IN ('cooked', 'raw', 'as-served')),
  brand text,
  source text DEFAULT 'curated',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.food_units ENABLE ROW LEVEL SECURITY;

-- Allow public read access (reference data)
CREATE POLICY "Anyone can read food units"
  ON public.food_units
  FOR SELECT
  USING (true);

-- Only service role can modify
CREATE POLICY "Only service role can modify food units"
  ON public.food_units
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_food_units_key 
  ON public.food_units(food_key);

CREATE INDEX IF NOT EXISTS idx_food_units_key_unit 
  ON public.food_units(food_key, unit_label, basis);

-- Seed initial conversational units
INSERT INTO public.food_units (food_key, display_name, unit_label, grams_per_unit, basis) VALUES
  ('bacon', 'Bacon (cooked slice)', 'slice', 10, 'cooked'),
  ('bread:generic', 'Bread slice (sandwich)', 'slice', 38, 'as-served'),
  ('bread:sourdough', 'Sourdough slice', 'slice', 50, 'as-served'),
  ('bread:whole_wheat', 'Whole wheat bread slice', 'slice', 43, 'as-served'),
  ('egg:large', 'Egg, large whole', 'count', 50, 'as-served'),
  ('egg:medium', 'Egg, medium whole', 'count', 44, 'as-served'),
  ('cheese:processed', 'Cheese slice (processed)', 'slice', 23, 'as-served'),
  ('cheese:cheddar', 'Cheddar cheese slice', 'slice', 28, 'as-served'),
  ('rice:white', 'Rice, white (cooked cup)', 'cup', 158, 'cooked'),
  ('rice:brown', 'Rice, brown (cooked cup)', 'cup', 195, 'cooked'),
  ('pasta:cooked', 'Pasta (cooked cup)', 'cup', 140, 'cooked'),
  ('chicken_breast', 'Chicken breast (cooked)', 'oz', 28, 'cooked'),
  ('steak', 'Steak (cooked)', 'oz', 28, 'cooked'),
  ('ground_beef', 'Ground beef (cooked)', 'oz', 28, 'cooked')
ON CONFLICT DO NOTHING;
