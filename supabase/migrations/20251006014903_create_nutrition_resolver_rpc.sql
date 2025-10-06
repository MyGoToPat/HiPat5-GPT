/*
  # Create nutrition resolver RPC

  1. Function: resolve_nutrition
    - Accepts array of food items with name, qty, unit, brand, basis
    - Looks up conversions in food_units table
    - Queries food_cache or uses estimation for macro data
    - Returns standardized nutrition data with grams_used and basis_used

  2. Logic
    - Match food_key from food_units for common conversions
    - Default to 'cooked' basis unless specified
    - Brand/restaurant items use 'as-served' basis
    - Returns complete nutrition breakdown per item

  3. Security
    - Available to authenticated and anon users
    - Read-only operation
*/

CREATE OR REPLACE FUNCTION public.resolve_nutrition(items jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb := '[]'::jsonb;
  item jsonb;
  food_name text;
  qty numeric;
  unit_label text;
  brand text;
  basis text;
  grams_used numeric;
  basis_used text;
  food_lookup record;
  macros jsonb;
  resolved_item jsonb;
BEGIN
  -- Process each item in the input array
  FOR item IN SELECT * FROM jsonb_array_elements(items)
  LOOP
    food_name := item->>'name';
    qty := COALESCE((item->>'qty')::numeric, 1);
    unit_label := COALESCE(item->>'unit', 'serving');
    brand := item->>'brand';
    basis := COALESCE(item->>'basis', 'cooked');
    
    -- Override basis to 'as-served' if brand is present
    IF brand IS NOT NULL AND brand != '' THEN
      basis_used := 'as-served';
    ELSE
      basis_used := basis;
    END IF;
    
    -- Try to find conversion in food_units table
    -- Match by food_key (normalized name matching)
    SELECT fu.grams_per_unit, fu.basis 
    INTO food_lookup
    FROM public.food_units fu
    WHERE (
      fu.food_key = lower(regexp_replace(food_name, '[^a-z0-9]', '', 'g'))
      OR fu.food_key LIKE '%' || lower(regexp_replace(food_name, '[^a-z0-9:_]', '', 'g')) || '%'
      OR lower(fu.display_name) LIKE '%' || lower(food_name) || '%'
    )
    AND fu.unit_label = unit_label
    AND (fu.basis = basis_used OR fu.basis = 'as-served')
    ORDER BY 
      CASE 
        WHEN fu.food_key = lower(regexp_replace(food_name, '[^a-z0-9]', '', 'g')) THEN 1
        ELSE 2
      END,
      fu.updated_at DESC
    LIMIT 1;
    
    -- Calculate grams used
    IF food_lookup.grams_per_unit IS NOT NULL THEN
      grams_used := qty * food_lookup.grams_per_unit;
      basis_used := food_lookup.basis;
    ELSE
      -- Fallback: use standard conversions
      CASE unit_label
        WHEN 'oz' THEN grams_used := qty * 28.35;
        WHEN 'lb' THEN grams_used := qty * 453.59;
        WHEN 'g' THEN grams_used := qty;
        WHEN 'kg' THEN grams_used := qty * 1000;
        WHEN 'cup' THEN grams_used := qty * 240; -- approximate for liquids
        WHEN 'tbsp' THEN grams_used := qty * 15;
        WHEN 'tsp' THEN grams_used := qty * 5;
        WHEN 'slice' THEN grams_used := qty * 30; -- generic slice
        WHEN 'count', 'piece' THEN grams_used := qty * 50; -- generic item
        ELSE grams_used := qty * 100; -- generic serving
      END CASE;
    END IF;
    
    -- Look up macros from food_cache if available
    -- This is a simplified version - in production you'd want more sophisticated lookup
    SELECT jsonb_build_object(
      'kcal', COALESCE(fc.calories_per_100g * grams_used / 100, 0),
      'protein_g', COALESCE(fc.protein_per_100g * grams_used / 100, 0),
      'carbs_g', COALESCE(fc.carbs_per_100g * grams_used / 100, 0),
      'fat_g', COALESCE(fc.fat_per_100g * grams_used / 100, 0)
    )
    INTO macros
    FROM public.food_cache fc
    WHERE lower(fc.food_name) = lower(food_name)
    LIMIT 1;
    
    -- If no cache hit, use generic estimates based on food type
    IF macros IS NULL THEN
      -- Generic macros estimation (should be replaced with real data)
      macros := jsonb_build_object(
        'kcal', grams_used * 2.5,  -- ~250 kcal per 100g average
        'protein_g', grams_used * 0.15,  -- ~15g protein per 100g
        'carbs_g', grams_used * 0.25,  -- ~25g carbs per 100g
        'fat_g', grams_used * 0.08  -- ~8g fat per 100g
      );
    END IF;
    
    -- Build resolved item
    resolved_item := jsonb_build_object(
      'name', food_name,
      'qty', qty,
      'unit', unit_label,
      'grams_used', ROUND(grams_used, 1),
      'basis_used', basis_used,
      'macros', jsonb_build_object(
        'kcal', ROUND((macros->>'kcal')::numeric, 0),
        'protein_g', ROUND((macros->>'protein_g')::numeric, 1),
        'carbs_g', ROUND((macros->>'carbs_g')::numeric, 1),
        'fat_g', ROUND((macros->>'fat_g')::numeric, 1)
      )
    );
    
    -- Add to result array
    result := result || jsonb_build_array(resolved_item);
  END LOOP;
  
  RETURN result;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.resolve_nutrition(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_nutrition(jsonb) TO anon;
