import type { BillingState } from '@/types'

export interface Entitlements {
  plan: 'free' | 'pro' | 'team'
  boards: number
  editors: number
  canExport: boolean
}

const PLAN_LIMITS: Record<'free' | 'pro' | 'team', Omit<Entitlements, 'plan'>> = {
  free: { boards: 5, editors: 2, canExport: false },
  pro: { boards: Infinity, editors: 10, canExport: true },
  team: { boards: Infinity, editors: Infinity, canExport: true },
}

/**
 * Resolve the effective entitlements for a user based on their billing state.
 * Handles active, trialing, past_due grace, canceled, and cancel_at_period_end.
 */
export function resolveEntitlements(billing: BillingState | null): Entitlements {
  if (!billing) {
    return { plan: 'free', ...PLAN_LIMITS.free }
  }

  const status = billing.subscription_status
  const storedPlan = billing.plan

  // Active or trialing — full access to their plan
  if (status === 'active' || status === 'trialing') {
    return { plan: storedPlan, ...PLAN_LIMITS[storedPlan] }
  }

  // Past due — check grace period
  if (status === 'past_due') {
    if (
      billing.past_due_grace_until &&
      new Date(billing.past_due_grace_until) > new Date()
    ) {
      // Grace period still active — keep plan access
      return { plan: storedPlan, ...PLAN_LIMITS[storedPlan] }
    }
    // Grace expired — fall back to free
    return { plan: 'free', ...PLAN_LIMITS.free }
  }

  // cancel_at_period_end — still paid until period ends
  if (
    billing.cancel_at_period_end &&
    billing.current_period_end &&
    new Date(billing.current_period_end) > new Date()
  ) {
    return { plan: storedPlan, ...PLAN_LIMITS[storedPlan] }
  }

  // Canceled, incomplete, unpaid, or no status — free tier
  return { plan: 'free', ...PLAN_LIMITS.free }
}
