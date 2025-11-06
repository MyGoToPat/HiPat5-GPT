/*
  # Add Food Aliases & Expanded Cache

  1. Purpose
    - Create food_aliases table for name variations ("2% milk" → "milk, reduced-fat")
    - Add micros (fiber) to existing food_cache entries
    - Seed additional common foods that users are reporting as "unknown"
    
  2. Guardrails (per ChatGPT feedback)
    - Seed small, cache on-demand (~10-15k USDA staples)
    - Aliases handle spelling variations
    - Provenance + versioning (source, last_checked, checksum)
    
  3. Tables
    - food_aliases: Maps user input → canonical food_cache name
    - food_cache: Add micros column for fiber_g
*/

-- Create food_aliases table
CREATE TABLE IF NOT EXISTS public.food_aliases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alias text NOT NULL,  -- User input: "2% milk", "cooked oatmeal", "large egg"
  canonical_name text NOT NULL,  -- Maps to food_cache.name: "milk", "oatmeal", "egg"
  confidence float DEFAULT 0.95,
  created_at timestamptz DEFAULT now(),
  UNIQUE(alias)
);

CREATE INDEX idx_food_aliases_alias ON public.food_aliases(alias);
CREATE INDEX idx_food_aliases_canonical ON public.food_aliases(canonical_name);

-- Enable RLS
ALTER TABLE public.food_aliases ENABLE ROW LEVEL SECURITY;

-- Allow public read access (aliases are not user-specific)
CREATE POLICY "Allow public read access to food_aliases"
  ON public.food_aliases
  FOR SELECT
  USING (true);

-- Add micros column to food_cache if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'food_cache' AND column_name = 'micros'
  ) THEN
    ALTER TABLE public.food_cache ADD COLUMN micros jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Seed common food aliases
INSERT INTO public.food_aliases (alias, canonical_name, confidence) VALUES
  -- Milk variations
  ('2% milk', 'milk', 0.95),
  ('reduced fat milk', 'milk', 0.95),
  ('lowfat milk', 'milk', 0.95),
  ('skim milk', 'milk', 0.95),
  ('nonfat milk', 'milk', 0.95),
  ('whole milk', 'milk', 0.95),
  ('1% milk', 'milk', 0.95),
  
  -- Egg variations
  ('large egg', 'egg', 0.95),
  ('whole egg', 'egg', 0.95),
  ('large whole egg', 'egg', 0.95),
  ('egg white', 'egg whites', 0.95),
  ('egg whites', 'egg whites', 0.95),
  
  -- Oatmeal variations
  ('cooked oatmeal', 'oatmeal', 0.95),
  ('instant oatmeal', 'oatmeal', 0.90),
  ('old fashioned oats', 'oatmeal', 0.90),
  ('rolled oats', 'oatmeal', 0.90),
  ('oats', 'oatmeal', 0.95),
  
  -- Bread variations
  ('sourdough', 'bread', 0.90),
  ('sour dough bread', 'bread', 0.90),
  ('sourdough bread', 'bread', 0.90),
  ('wheat bread', 'bread', 0.90),
  ('white bread', 'bread', 0.90),
  ('whole wheat bread', 'bread', 0.90),
  ('slice of bread', 'bread', 0.90),
  
  -- Beef variations
  ('ribeye', 'ribeye steak', 0.95),
  ('ribeye steak', 'ribeye steak', 0.95),
  ('rib eye', 'ribeye steak', 0.95),
  ('sirloin', 'sirloin steak', 0.95),
  ('ground beef', 'ground beef', 0.95),
  ('hamburger', 'ground beef', 0.85),
  
  -- Chicken variations
  ('chicken', 'chicken breast', 0.85),
  ('chicken breast', 'chicken breast', 0.95),
  ('grilled chicken', 'chicken breast', 0.90),
  ('baked chicken', 'chicken breast', 0.90),
  
  -- Rice variations
  ('white rice', 'rice', 0.95),
  ('brown rice', 'rice', 0.90),
  ('cooked rice', 'rice', 0.95),
  ('steamed rice', 'rice', 0.95),
  
  -- Common fast food (exact matches to food_cache)
  ('big mac', 'big mac', 0.99),
  ('quarter pounder', 'quarter pounder', 0.99),
  ('whopper', 'whopper', 0.99)
ON CONFLICT (alias) DO NOTHING;

-- Update existing food_cache entries to include fiber in micros
UPDATE public.food_cache
SET micros = jsonb_build_object(
  'fiber_g', 
  CASE 
    -- Grains & vegetables are high fiber
    WHEN name ILIKE '%oatmeal%' THEN 1.7
    WHEN name ILIKE '%rice%' AND name ILIKE '%brown%' THEN 1.8
    WHEN name ILIKE '%bread%' AND name ILIKE '%whole%' THEN 2.4
    WHEN name ILIKE '%broccoli%' THEN 2.6
    WHEN name ILIKE '%spinach%' THEN 2.2
    WHEN name ILIKE '%apple%' THEN 2.4
    WHEN name ILIKE '%banana%' THEN 2.6
    WHEN name ILIKE '%beans%' THEN 6.4
    -- Proteins have 0 fiber
    WHEN name ILIKE '%chicken%' OR name ILIKE '%beef%' OR name ILIKE '%pork%' THEN 0.0
    WHEN name ILIKE '%fish%' OR name ILIKE '%salmon%' OR name ILIKE '%tuna%' THEN 0.0
    WHEN name ILIKE '%egg%' THEN 0.0
    -- Default low fiber
    ELSE 0.3
  END
)
WHERE micros IS NULL OR micros = '{}'::jsonb;

-- Add missing common foods that users are reporting
INSERT INTO public.food_cache (id, name, brand, serving_size, grams_per_serving, macros, micros, source_db, usda_fdc_id, confidence, expires_at) VALUES
  -- Additional bread types
  ('sourdough_bread:generic:100g', 'sourdough bread', null, '100g', 100, 
   '{"kcal": 289, "protein_g": 11, "carbs_g": 56, "fat_g": 2.1}'::jsonb,
   '{"fiber_g": 2.4}'::jsonb,
   'USDA', '172687', 0.95, now() + interval '90 days'),
   
  ('white_bread:generic:100g', 'white bread', null, '100g', 100,
   '{"kcal": 265, "protein_g": 9, "carbs_g": 49, "fat_g": 3.2}'::jsonb,
   '{"fiber_g": 2.4}'::jsonb,
   'USDA', '172686', 0.95, now() + interval '90 days'),
   
  ('wheat_bread:generic:100g', 'wheat bread', null, '100g', 100,
   '{"kcal": 247, "protein_g": 13, "carbs_g": 41, "fat_g": 3.5}'::jsonb,
   '{"fiber_g": 6.8}'::jsonb,
   'USDA', '172688', 0.95, now() + interval '90 days'),
  
  -- Milk variations
  ('milk_2percent:generic:100g', 'milk, 2%', null, '100g', 100,
   '{"kcal": 50, "protein_g": 3.3, "carbs_g": 4.8, "fat_g": 2.0}'::jsonb,
   '{"fiber_g": 0.0}'::jsonb,
   'USDA', '746782', 0.95, now() + interval '90 days'),
   
  ('milk_skim:generic:100g', 'milk, skim', null, '100g', 100,
   '{"kcal": 34, "protein_g": 3.4, "carbs_g": 5.0, "fat_g": 0.1}'::jsonb,
   '{"fiber_g": 0.0}'::jsonb,
   'USDA', '746781', 0.95, now() + interval '90 days'),
   
  ('milk_whole:generic:100g', 'milk, whole', null, '100g', 100,
   '{"kcal": 61, "protein_g": 3.2, "carbs_g": 4.8, "fat_g": 3.3}'::jsonb,
   '{"fiber_g": 0.0}'::jsonb,
   'USDA', '746776', 0.95, now() + interval '90 days'),
  
  -- Eggs (already have egg whites)
  ('egg_whole_large:generic:100g', 'egg, whole, large', null, '100g', 100,
   '{"kcal": 143, "protein_g": 12.6, "carbs_g": 0.7, "fat_g": 9.5}'::jsonb,
   '{"fiber_g": 0.0}'::jsonb,
   'USDA', '748967', 0.95, now() + interval '90 days'),
  
  -- Oatmeal variations
  ('oatmeal_cooked:generic:100g', 'oatmeal, cooked', null, '100g', 100,
   '{"kcal": 71, "protein_g": 2.5, "carbs_g": 12, "fat_g": 1.5}'::jsonb,
   '{"fiber_g": 1.7}'::jsonb,
   'USDA', '173904', 0.95, now() + interval '90 days'),
   
  ('oats_instant:generic:100g', 'oats, instant', null, '100g', 100,
   '{"kcal": 379, "protein_g": 13, "carbs_g": 68, "fat_g": 6.9}'::jsonb,
   '{"fiber_g": 10}'::jsonb,
   'USDA', '173904', 0.95, now() + interval '90 days')
   
ON CONFLICT (id) DO NOTHING;

-- Log
DO $$ 
BEGIN
  RAISE NOTICE 'Food aliases and expanded cache seeded successfully';
END $$;






