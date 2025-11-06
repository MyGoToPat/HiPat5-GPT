-- Additional aliases and food cache entries for high-frequency foods
-- Pat Fiber-First System: Seeded items map to AMA + TMWYA shared database

-- 1) Large fast-food fries (per 100 g)
INSERT INTO public.food_cache (id, name, brand, serving_size, grams_per_serving, macros, micros, source_db, usda_fdc_id, confidence, expires_at)
VALUES (
  'fries_large_fastfood:generic:100g',
  'fries, large (fast food)',
  'generic',
  '100g',
  100,
  '{"kcal": 323, "protein_g": 3.8, "carbs_g": 41.0, "fat_g": 16.0}'::jsonb,
  '{"fiber_g": 3.5}'::jsonb,
  'USDA',
  '366572',
  0.90,
  now() + interval '90 days'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.food_aliases (alias, canonical_name, confidence)
VALUES
  ('large fries', 'fries, large (fast food)', 0.90),
  ('large fries (mcdonalds)', 'fries, large (fast food)', 0.90),
  ('large french fries', 'fries, large (fast food)', 0.90)
ON CONFLICT (alias) DO UPDATE SET canonical_name = EXCLUDED.canonical_name, confidence = EXCLUDED.confidence;

-- 2) Homogenized ("homo") milk → whole milk
INSERT INTO public.food_aliases (alias, canonical_name, confidence)
VALUES
  ('homo milk', 'milk, whole', 0.95),
  ('homogenized milk', 'milk, whole', 0.95),
  ('3.25% milk', 'milk, whole', 0.95)
ON CONFLICT (alias) DO UPDATE SET canonical_name = EXCLUDED.canonical_name, confidence = EXCLUDED.confidence;

-- 3) Large whole eggs (explicit plural mappings)
INSERT INTO public.food_aliases (alias, canonical_name, confidence)
VALUES
  ('large whole egg', 'egg, whole, large', 0.97),
  ('large whole eggs', 'egg, whole, large', 0.97),
  ('large eggs', 'egg, whole, large', 0.97)
ON CONFLICT (alias) DO UPDATE SET canonical_name = EXCLUDED.canonical_name, confidence = EXCLUDED.confidence;

-- 4) Medium-rare ribeye (cooked entry + aliases)
INSERT INTO public.food_cache (id, name, brand, serving_size, grams_per_serving, macros, micros, source_db, usda_fdc_id, confidence, expires_at)
VALUES (
  'ribeye_medium_rare_cooked:generic:100g',
  'ribeye steak, cooked (medium rare)',
  null,
  '100g',
  100,
  '{"kcal": 291, "protein_g": 25.0, "carbs_g": 0.0, "fat_g": 21.0}'::jsonb,
  '{"fiber_g": 0.0}'::jsonb,
  'USDA',
  '173686',
  0.95,
  now() + interval '90 days'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.food_aliases (alias, canonical_name, confidence)
VALUES
  ('medium rare ribeye', 'ribeye steak, cooked (medium rare)', 0.95),
  ('medium-rare ribeye', 'ribeye steak, cooked (medium rare)', 0.95),
  ('ribeye medium rare', 'ribeye steak, cooked (medium rare)', 0.95)
ON CONFLICT (alias) DO UPDATE SET canonical_name = EXCLUDED.canonical_name, confidence = EXCLUDED.confidence;

RAISE NOTICE 'Additional food aliases (fries, homo milk, eggs, ribeye) seeded successfully';






