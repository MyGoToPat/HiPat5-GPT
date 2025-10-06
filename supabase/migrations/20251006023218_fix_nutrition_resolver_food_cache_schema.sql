/*
  # Fix nutrition resolver to use correct food_cache schema

  1. Changes
    - Use food_cache.macros jsonb column instead of individual per_100g columns
    - Macros are already per serving, scale to grams_used appropriately
    - Fall back to generic estimates if no cache hit
*/

DROP FUNCTION IF EXISTS public.resolve_nutrition(jsonb);

CREATE OR REPLACE FUNCTION public.resolve_nutrition(items jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb := '[]'::jsonb;
  item jsonb;
  v_food_name text;
  v_qty numeric;
  v_unit_label text;
  v_brand text;
  v_basis text;
  v_grams_used numeric;
  v_basis_used text;
  food_lookup record;
  cache_record record;
  macros jsonb;
  resolved_item jsonb;
  serving_grams numeric;
BEGIN
  -- Process each item in the input array
  FOR item IN SELECT * FROM jsonb_array_elements(items)
  LOOP
    v_food_name := item->>'name';
    v_qty := COALESCE((item->>'qty')::numeric, 1);
    v_unit_label := COALESCE(item->>'unit', 'serving');
    v_brand := item->>'brand';
    v_basis := COALESCE(item->>'basis', 'cooked');
    
    -- Override basis to 'as-served' if brand is present
    IF v_brand IS NOT NULL AND v_brand != '' THEN
      v_basis_used := 'as-served';
    ELSE
      v_basis_used := v_basis;
    END IF;
    
    -- Try to find conversion in food_units table
    SELECT fu.grams_per_unit, fu.basis 
    INTO food_lookup
    FROM public.food_units fu
    WHERE (
      fu.food_key = lower(regexp_replace(v_food_name, '[^a-z0-9]', '', 'g'))
      OR fu.food_key LIKE '%' || lower(regexp_replace(v_food_name, '[^a-z0-9:_]', '', 'g')) || '%'
      OR lower(fu.display_name) LIKE '%' || lower(v_food_name) || '%'
    )
    AND fu.unit_label = v_unit_label
    AND (fu.basis = v_basis_used OR fu.basis = 'as-served')
    ORDER BY 
      CASE 
        WHEN fu.food_key = lower(regexp_replace(v_food_name, '[^a-z0-9]', '', 'g')) THEN 1
        ELSE 2
      END,
      fu.updated_at DESC
    LIMIT 1;
    
    -- Calculate grams used
    IF food_lookup.grams_per_unit IS NOT NULL THEN
      v_grams_used := v_qty * food_lookup.grams_per_unit;
      v_basis_used := food_lookup.basis;
    ELSE
      -- Fallback: use standard conversions
      CASE v_unit_label
        WHEN 'oz' THEN v_grams_used := v_qty * 28.35;
        WHEN 'lb' THEN v_grams_used := v_qty * 453.59;
        WHEN 'g' THEN v_grams_used := v_qty;
        WHEN 'kg' THEN v_grams_used := v_qty * 1000;
        WHEN 'cup' THEN v_grams_used := v_qty * 240;
        WHEN 'tbsp' THEN v_grams_used := v_qty * 15;
        WHEN 'tsp' THEN v_grams_used := v_qty * 5;
        WHEN 'slice' THEN v_grams_used := v_qty * 30;
        WHEN 'count', 'piece' THEN v_grams_used := v_qty * 50;
        ELSE v_grams_used := v_qty * 100;
      END CASE;
    END IF;
    
    -- Look up macros from food_cache if available
    SELECT fc.macros, fc.grams_per_serving
    INTO cache_record
    FROM public.food_cache fc
    WHERE lower(fc.name) = lower(v_food_name)
    ORDER BY fc.confidence DESC, fc.access_count DESC
    LIMIT 1;
    
    -- Calculate macros based on cache or estimates
    IF cache_record.macros IS NOT NULL AND cache_record.grams_per_serving IS NOT NULL THEN
      -- Scale from serving size to actual grams used
      serving_grams := cache_record.grams_per_serving;
      macros := jsonb_build_object(
        'kcal', COALESCE((cache_record.macros->>'kcal')::numeric * v_grams_used / serving_grams, 0),
        'protein_g', COALESCE((cache_record.macros->>'protein_g')::numeric * v_grams_used / serving_grams, 0),
        'carbs_g', COALESCE((cache_record.macros->>'carbs_g')::numeric * v_grams_used / serving_grams, 0),
        'fat_g', COALESCE((cache_record.macros->>'fat_g')::numeric * v_grams_used / serving_grams, 0)
      );
    ELSE
      -- Use generic estimates (250 kcal per 100g average)
      macros := jsonb_build_object(
        'kcal', v_grams_used * 2.5,
        'protein_g', v_grams_used * 0.15,
        'carbs_g', v_grams_used * 0.25,
        'fat_g', v_grams_used * 0.08
      );
    END IF;
    
    -- Build resolved item
    resolved_item := jsonb_build_object(
      'name', v_food_name,
      'qty', v_qty,
      'unit', v_unit_label,
      'grams_used', ROUND(v_grams_used, 1),
      'basis_used', v_basis_used,
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
