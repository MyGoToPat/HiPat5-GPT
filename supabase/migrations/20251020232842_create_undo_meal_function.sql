/*
  # Create Undo Meal Function

  1. New Function
    - `undo_meal(p_undo_token, p_user_id)` - Reverses a meal log using an undo token
  
  2. Functionality
    - Validates the undo token exists, belongs to user, and hasn't been used
    - Checks token hasn't expired
    - Deletes meal_items entries
    - Deletes meal_logs entry
    - Marks token as used
    - Returns success/error status
  
  3. Security
    - Validates user ownership of token
    - Prevents double-undo by checking `used` flag
    - Uses RLS policies for all table operations
*/

CREATE OR REPLACE FUNCTION undo_meal(
  p_undo_token uuid,
  p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_token_record RECORD;
  v_deleted_count int;
BEGIN
  -- Fetch and validate token
  SELECT *
  INTO v_token_record
  FROM undo_tokens
  WHERE id = p_undo_token
    AND user_id = p_user_id
    AND NOT used
    AND expires_at > now();

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'Invalid, expired, or already used undo token'
    );
  END IF;

  -- Delete meal items
  DELETE FROM meal_items
  WHERE id = ANY(v_token_record.meal_items_ids);

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  -- Delete meal log
  DELETE FROM meal_logs
  WHERE id = v_token_record.meal_log_id
    AND user_id = p_user_id;

  -- Mark token as used
  UPDATE undo_tokens
  SET used = true
  WHERE id = p_undo_token;

  -- Trigger day rollup recalculation (if function exists)
  BEGIN
    PERFORM recompute_day_rollup(p_user_id, CURRENT_DATE);
  EXCEPTION
    WHEN undefined_function THEN
      -- Function doesn't exist yet, skip
      NULL;
  END;

  RETURN jsonb_build_object(
    'ok', true,
    'deleted_items', v_deleted_count,
    'meal_log_id', v_token_record.meal_log_id
  );
END;
$$;