-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_share_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE drawing_paths ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (id = auth.uid());

-- boards: owner full access
CREATE POLICY "boards_owner_all" ON boards FOR ALL USING (owner_id = auth.uid());
-- boards: guest with valid JWT claim can read
CREATE POLICY "boards_guest_select" ON boards FOR SELECT USING (
  id = (auth.jwt() ->> 'board_id')::uuid
  AND (auth.jwt() ->> 'permission') IN ('view', 'edit')
);

-- board_share_tokens: only board owner
CREATE POLICY "share_tokens_owner_all" ON board_share_tokens FOR ALL USING (
  board_id IN (SELECT id FROM boards WHERE owner_id = auth.uid())
);

-- cards: owner full access
CREATE POLICY "cards_owner_all" ON cards FOR ALL USING (
  board_id IN (SELECT id FROM boards WHERE owner_id = auth.uid())
);
-- cards: guest view
CREATE POLICY "cards_guest_select" ON cards FOR SELECT USING (
  board_id = (auth.jwt() ->> 'board_id')::uuid
  AND (auth.jwt() ->> 'permission') IN ('view', 'edit')
);
-- cards: guest edit
CREATE POLICY "cards_guest_edit" ON cards FOR ALL USING (
  board_id = (auth.jwt() ->> 'board_id')::uuid
  AND (auth.jwt() ->> 'permission') = 'edit'
);

-- drawing_paths: owner full access
CREATE POLICY "paths_owner_all" ON drawing_paths FOR ALL USING (
  board_id IN (SELECT id FROM boards WHERE owner_id = auth.uid())
);
-- drawing_paths: guest view
CREATE POLICY "paths_guest_select" ON drawing_paths FOR SELECT USING (
  board_id = (auth.jwt() ->> 'board_id')::uuid
  AND (auth.jwt() ->> 'permission') IN ('view', 'edit')
);
-- drawing_paths: guest edit
CREATE POLICY "paths_guest_edit" ON drawing_paths FOR ALL USING (
  board_id = (auth.jwt() ->> 'board_id')::uuid
  AND (auth.jwt() ->> 'permission') = 'edit'
);
