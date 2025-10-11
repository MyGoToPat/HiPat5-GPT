/*
  # Seed Common Food Defaults
  
  1. Seeded Data
    - Common proteins (eggs, meats, fish)
    - Common grains (oatmeal, rice, pasta)
    - Common dairy (milk, yogurt, cheese)
    - Common vegetables
    - Common fats and fruits
    - Unit conversions (volume, weight, egg sizes)
    
  2. Default Policy
    - All foods assumed COOKED unless explicitly marked raw
    - Matches user expectations ("ribeye" = cooked steak, not raw)
    
  3. Notes
    - Values based on USDA standards where available
    - Density values enable volume→weight conversions
*/

-- Insert common foods (cooked by default)
INSERT INTO food_defaults (food_name, aliases, default_quantity, default_unit, prep_state, density_g_per_cup, notes)
VALUES
  -- Eggs
  ('eggs', ARRAY['egg', 'whole eggs', 'whole egg'], 1, 'whole', 'cooked', NULL, 'Large egg ~50g cooked'),
  ('egg whites', ARRAY['egg white', 'whites'], 1, 'whole', 'cooked', NULL, 'Large egg white ~33g'),
  
  -- Beef
  ('ribeye steak', ARRAY['ribeye', 'rib eye', 'rib-eye'], 6, 'oz', 'cooked', NULL, 'Trimmed, cooked weight'),
  ('ground beef', ARRAY['beef', 'hamburger', 'ground chuck'], 4, 'oz', 'cooked', NULL, '80/20 lean, cooked'),
  ('sirloin steak', ARRAY['sirloin'], 6, 'oz', 'cooked', NULL, 'Trimmed, cooked'),
  
  -- Poultry
  ('chicken breast', ARRAY['chicken', 'chicken breast'], 4, 'oz', 'cooked', NULL, 'Skinless, boneless, cooked'),
  ('chicken thigh', ARRAY['chicken thighs'], 4, 'oz', 'cooked', NULL, 'Skinless, boneless, cooked'),
  ('turkey breast', ARRAY['turkey'], 4, 'oz', 'cooked', NULL, 'Skinless, cooked'),
  
  -- Fish
  ('salmon', ARRAY['salmon fillet'], 4, 'oz', 'cooked', NULL, 'Cooked fillet, Atlantic'),
  ('tuna', ARRAY['tuna steak'], 4, 'oz', 'cooked', NULL, 'Cooked, yellowfin'),
  ('tilapia', ARRAY[]::TEXT[], 4, 'oz', 'cooked', NULL, 'Cooked fillet'),
  
  -- Pork
  ('pork chop', ARRAY['pork', 'pork chops'], 4, 'oz', 'cooked', NULL, 'Trimmed, cooked'),
  ('bacon', ARRAY['bacon strips'], 2, 'slices', 'cooked', NULL, 'Pan-fried crispy'),
  
  -- Grains (cooked)
  ('oatmeal', ARRAY['oats', 'rolled oats', 'oat'], 1, 'cup', 'cooked', 234, 'Cooked in water'),
  ('rice', ARRAY['white rice'], 1, 'cup', 'cooked', 185, 'Cooked white rice'),
  ('brown rice', ARRAY[]::TEXT[], 1, 'cup', 'cooked', 195, 'Cooked brown rice'),
  ('quinoa', ARRAY[]::TEXT[], 1, 'cup', 'cooked', 185, 'Cooked quinoa'),
  ('pasta', ARRAY['spaghetti', 'noodles', 'penne'], 1, 'cup', 'cooked', 140, 'Cooked al dente'),
  
  -- Dairy
  ('milk', ARRAY['whole milk', '2% milk'], 1, 'cup', 'mixed', 244, '2% milk by default'),
  ('skim milk', ARRAY['fat free milk', 'nonfat milk', 'non-fat milk'], 1, 'cup', 'mixed', 245, '0% fat milk'),
  ('whole milk', ARRAY[]::TEXT[], 1, 'cup', 'mixed', 244, '3.25% fat milk'),
  ('greek yogurt', ARRAY['yogurt', 'Greek yogurt'], 1, 'cup', 'mixed', 227, 'Plain, nonfat'),
  ('cheddar cheese', ARRAY['cheese', 'cheddar'], 1, 'oz', 'mixed', NULL, 'Sharp cheddar'),
  ('cottage cheese', ARRAY[]::TEXT[], 1, 'cup', 'mixed', 226, 'Low-fat 2%'),
  
  -- Vegetables (cooked unless specified)
  ('broccoli', ARRAY[]::TEXT[], 1, 'cup', 'cooked', 156, 'Steamed, chopped'),
  ('spinach', ARRAY[]::TEXT[], 1, 'cup', 'cooked', 180, 'Cooked, drained'),
  ('sweet potato', ARRAY['sweet potatoes'], 1, 'medium', 'cooked', NULL, 'Baked with skin ~150g'),
  ('carrots', ARRAY['carrot'], 1, 'cup', 'cooked', 156, 'Cooked, sliced'),
  ('green beans', ARRAY[]::TEXT[], 1, 'cup', 'cooked', 125, 'Cooked'),
  
  -- Fats & Oils
  ('olive oil', ARRAY['evoo', 'extra virgin olive oil'], 1, 'tbsp', 'mixed', NULL, 'Liquid oil'),
  ('butter', ARRAY[]::TEXT[], 1, 'tbsp', 'mixed', NULL, 'Salted butter'),
  ('peanut butter', ARRAY['pb'], 2, 'tbsp', 'mixed', 258, 'Smooth peanut butter'),
  ('almond butter', ARRAY[]::TEXT[], 2, 'tbsp', 'mixed', 250, 'Smooth'),
  ('avocado', ARRAY[]::TEXT[], 0.5, 'whole', 'raw', NULL, 'Half of medium avocado'),
  
  -- Fruits (raw by default)
  ('banana', ARRAY['bananas'], 1, 'medium', 'raw', NULL, '~118g peeled'),
  ('apple', ARRAY['apples'], 1, 'medium', 'raw', NULL, '~182g with skin'),
  ('orange', ARRAY['oranges'], 1, 'medium', 'raw', NULL, '~131g peeled'),
  ('strawberries', ARRAY['strawberry'], 1, 'cup', 'raw', 144, 'Whole berries'),
  ('blueberries', ARRAY['blueberry'], 1, 'cup', 'raw', 148, 'Whole berries'),
  
  -- Nuts & Seeds
  ('almonds', ARRAY[]::TEXT[], 1, 'oz', 'raw', NULL, '~23 almonds'),
  ('walnuts', ARRAY[]::TEXT[], 1, 'oz', 'raw', NULL, '~14 halves'),
  ('cashews', ARRAY[]::TEXT[], 1, 'oz', 'raw', NULL, '~18 cashews')
ON CONFLICT DO NOTHING;

-- Insert unit conversions
INSERT INTO unit_conversions (from_unit, to_unit, factor, food_category)
VALUES
  -- Volume conversions
  ('cup', 'tbsp', 16, 'general'),
  ('tbsp', 'tsp', 3, 'general'),
  ('cup', 'oz', 8, 'liquid'),
  ('qt', 'cup', 4, 'liquid'),
  ('gallon', 'cup', 16, 'liquid'),
  
  -- Weight conversions
  ('lb', 'oz', 16, 'general'),
  ('oz', 'g', 28.35, 'general'),
  ('kg', 'g', 1000, 'general'),
  ('kg', 'lb', 2.20462, 'general'),
  
  -- Egg size conversions (to grams)
  ('jumbo', 'g', 63, 'eggs'),
  ('extra large', 'g', 56, 'eggs'),
  ('xl', 'g', 56, 'eggs'),
  ('large', 'g', 50, 'eggs'),
  ('medium', 'g', 44, 'eggs'),
  ('small', 'g', 38, 'eggs'),
  
  -- Common portion sizes
  ('slice', 'oz', 1, 'bread'),
  ('slice', 'oz', 0.75, 'cheese'),
  ('slice', 'oz', 0.5, 'bacon')
ON CONFLICT DO NOTHING;

-- Add index on food_name for faster lookups
CREATE INDEX IF NOT EXISTS idx_food_defaults_name_lower ON food_defaults(LOWER(food_name));
