-- ============================================================
-- Billing v2: cancel_at_period_end + past_due_grace_until
-- ============================================================

ALTER TABLE profiles
  ADD COLUMN cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN past_due_grace_until TIMESTAMPTZ;

-- Replace the RLS policy to also lock the two new columns
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
    AND cancel_at_period_end IS NOT DISTINCT FROM (SELECT p.cancel_at_period_end FROM profiles p WHERE p.id = auth.uid())
    AND past_due_grace_until IS NOT DISTINCT FROM (SELECT p.past_due_grace_until FROM profiles p WHERE p.id = auth.uid())
  );
