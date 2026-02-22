-- profiles: extends auth.users
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT '',
  avatar_color TEXT NOT NULL DEFAULT '#3b82f6',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- boards
CREATE TABLE boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Untitled Board',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- board_share_tokens
CREATE TABLE board_share_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  permission TEXT NOT NULL CHECK (permission IN ('view', 'edit')),
  token UUID NOT NULL DEFAULT gen_random_uuid(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (board_id, permission)
);

-- cards
CREATE TABLE cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'sticky',
  x FLOAT NOT NULL DEFAULT 100,
  y FLOAT NOT NULL DEFAULT 100,
  width FLOAT NOT NULL DEFAULT 200,
  height FLOAT NOT NULL DEFAULT 150,
  content TEXT NOT NULL DEFAULT '',
  color_index INTEGER NOT NULL DEFAULT 0 CHECK (color_index BETWEEN 0 AND 5),
  client_mutation_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- drawing_paths
CREATE TABLE drawing_paths (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  color TEXT NOT NULL DEFAULT '#1e293b',
  size INTEGER NOT NULL DEFAULT 3,
  points JSONB NOT NULL DEFAULT '[]',
  client_mutation_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create profile on sign-up
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  colors TEXT[] := ARRAY['#3b82f6','#8b5cf6','#06b6d4','#f59e0b','#ef4444','#10b981'];
  random_color TEXT;
BEGIN
  random_color := colors[1 + floor(random() * array_length(colors, 1))::int];
  INSERT INTO profiles (id, display_name, avatar_color)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    random_color
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Update boards.updated_at on child mutations
CREATE OR REPLACE FUNCTION update_board_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE boards SET updated_at = NOW() WHERE id = COALESCE(NEW.board_id, OLD.board_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cards_update_board_timestamp
  AFTER INSERT OR UPDATE OR DELETE ON cards
  FOR EACH ROW EXECUTE FUNCTION update_board_updated_at();

CREATE TRIGGER paths_update_board_timestamp
  AFTER INSERT OR DELETE ON drawing_paths
  FOR EACH ROW EXECUTE FUNCTION update_board_updated_at();

-- Auto-update cards.updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cards_updated_at
  BEFORE UPDATE ON cards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- NOTE: Realtime must be enabled manually for `cards` and `drawing_paths`
-- in the Supabase dashboard: Table Editor → select table → enable Realtime toggle.
