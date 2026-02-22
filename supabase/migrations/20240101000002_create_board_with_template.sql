-- Create board and template cards in a single transaction.
-- p_cards: jsonb array of { content, x, y, width, height, color_index, type }
CREATE OR REPLACE FUNCTION create_board_with_template(
  p_owner_id uuid,
  p_title text,
  p_cards jsonb DEFAULT '[]'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_board_id uuid;
BEGIN
  IF p_owner_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Not allowed to create board for another user';
  END IF;

  INSERT INTO boards (owner_id, title)
  VALUES (p_owner_id, COALESCE(NULLIF(trim(p_title), ''), 'Untitled Board'))
  RETURNING id INTO v_board_id;

  IF p_cards IS NOT NULL AND jsonb_array_length(p_cards) > 0 THEN
    INSERT INTO cards (board_id, content, x, y, width, height, color_index, type)
    SELECT
      v_board_id,
      COALESCE(e->>'content', ''),
      (e->>'x')::double precision,
      (e->>'y')::double precision,
      (e->>'width')::double precision,
      (e->>'height')::double precision,
      (e->>'color_index')::integer,
      COALESCE(e->>'type', 'sticky')
    FROM jsonb_array_elements(p_cards) AS e;
  END IF;

  RETURN v_board_id;
END;
$$;
