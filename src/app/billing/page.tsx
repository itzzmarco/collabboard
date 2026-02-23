import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getUserBillingState } from '@/app/actions/billing'
import { BillingActions } from './BillingActions'
import { BillingBanner } from '@/components/billing/BillingBanner'
import { resolveEntitlements } from '@/lib/entitlements'

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string }>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const billingState = await getUserBillingState()
  const ent = resolveEntitlements(billingState)
  const sp = await searchParams

  const limitsDisplay = {
    boards: ent.boards === Infinity ? 'Unlimited' : String(ent.boards),
    editors: ent.editors === Infinity ? 'Unlimited' : String(ent.editors),
    canExport: ent.canExport,
  }

  // Determine renewal / cancellation label
  let periodLabel = ''
  if (billingState?.cancel_at_period_end && billingState.current_period_end) {
    periodLabel = `Cancels on ${new Date(billingState.current_period_end).toLocaleDateString()}`
  } else if (billingState?.current_period_end) {
    periodLabel = `Renews ${new Date(billingState.current_period_end).toLocaleDateString()}`
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <BillingBanner billingState={billingState} />
      <div className="mx-auto max-w-2xl px-6 py-16">
        <h1 className="text-2xl font-bold text-slate-900 mb-8">Billing</h1>

        {sp.success === '1' && (
          <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
            Your subscription is now active. Welcome aboard!
          </div>
        )}

        {/* Current plan card */}
        <div className="rounded-xl border bg-white p-6 shadow-sm mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Current plan</p>
              <p className="mt-1 text-xl font-semibold text-slate-900 capitalize">
                {ent.plan}
              </p>
              {billingState?.subscription_status && (
                <p className="mt-1 text-xs text-slate-500 capitalize">
                  Status: {billingState.subscription_status}
                </p>
              )}
              {periodLabel && (
                <p className="mt-1 text-xs text-slate-500">
                  {periodLabel}
                </p>
              )}
            </div>
            <div className="flex gap-3">
              {billingState?.stripe_customer_id && (
                <BillingActions />
              )}
              <Link
                href="/pricing"
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
              >
                View plans
              </Link>
            </div>
          </div>
        </div>

        {/* Limits card */}
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900 mb-4">Plan limits</h2>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Boards</span>
              <span className="font-medium text-slate-900">{limitsDisplay.boards}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Concurrent editors per board</span>
              <span className="font-medium text-slate-900">{limitsDisplay.editors}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Export (PNG / SVG)</span>
              <span className="font-medium text-slate-900">
                {limitsDisplay.canExport ? 'Yes' : 'Pro only'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
