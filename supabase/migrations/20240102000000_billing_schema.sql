-- ============================================================
-- Billing schema: profiles billing columns + board_editor_sessions
-- ============================================================

-- 3a. Add billing columns to profiles
ALTER TABLE profiles
  ADD COLUMN stripe_customer_id TEXT,
  ADD COLUMN plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'team')),
  ADD COLUMN subscription_status TEXT,
  ADD COLUMN stripe_subscription_id TEXT,
  ADD COLUMN stripe_price_id TEXT,
  ADD COLUMN current_period_end TIMESTAMPTZ;

-- 3b. board_editor_sessions table
CREATE TABLE board_editor_sessions (
  board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  user_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (board_id, user_id)
);

-- Enable RLS on board_editor_sessions (service-role only — no authenticated policies)
ALTER TABLE board_editor_sessions ENABLE ROW LEVEL SECURITY;

-- Replace the permissive profiles_update_own policy with one that only allows
-- display fields (display_name, avatar_color). Billing fields can only be
-- updated by the service role which bypasses RLS.
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND stripe_customer_id IS NOT DISTINCT FROM (SELECT p.stripe_customer_id FROM profiles p WHERE p.id = auth.uid())
    AND plan IS NOT DISTINCT FROM (SELECT p.plan FROM profiles p WHERE p.id = auth.uid())
    AND subscription_status IS NOT DISTINCT FROM (SELECT p.subscription_status FROM profiles p WHERE p.id = auth.uid())
    AND stripe_subscription_id IS NOT DISTINCT FROM (SELECT p.stripe_subscription_id FROM profiles p WHERE p.id = auth.uid())
    AND stripe_price_id IS NOT DISTINCT FROM (SELECT p.stripe_price_id FROM profiles p WHERE p.id = auth.uid())
    AND current_period_end IS NOT DISTINCT FROM (SELECT p.current_period_end FROM profiles p WHERE p.id = auth.uid())
  );
