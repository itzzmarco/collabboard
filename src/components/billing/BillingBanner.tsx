'use client'

import { useTransition } from 'react'
import { AlertCircle, Info, AlertTriangle } from 'lucide-react'
import { createPortalSession } from '@/app/actions/billing'
import type { BillingState } from '@/types'

interface BillingBannerProps {
  billingState: BillingState | null
}

export function BillingBanner({ billingState }: BillingBannerProps) {
  const [isPending, startTransition] = useTransition()

  if (!billingState) return null

  const { subscription_status, cancel_at_period_end, current_period_end, past_due_grace_until } =
    billingState

  function handlePortal() {
    startTransition(async () => {
      const result = await createPortalSession()
      if ('url' in result) {
        window.location.href = result.url
      }
    })
  }

  // Past due with grace period active
  if (subscription_status === 'past_due' && past_due_grace_until) {
    const graceEnd = new Date(past_due_grace_until)
    const now = new Date()

    if (graceEnd > now) {
      const daysLeft = Math.max(1, Math.ceil((graceEnd.getTime() - now.getTime()) / 86_400_000))
      return (
        <div className="flex items-center gap-2 bg-amber-50 border-b border-amber-200 px-6 py-2.5 text-sm text-amber-800">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            Payment failed. Update your payment method within {daysLeft} day{daysLeft !== 1 ? 's' : ''} or your plan downgrades to Free.
          </span>
          <button
            type="button"
            onClick={handlePortal}
            disabled={isPending}
            className="ml-auto shrink-0 text-amber-900 font-medium underline hover:no-underline disabled:opacity-50"
          >
            {isPending ? 'Loading...' : 'Update payment'}
          </button>
        </div>
      )
    }

    // Grace expired
    return (
      <div className="flex items-center gap-2 bg-red-50 border-b border-red-200 px-6 py-2.5 text-sm text-red-700">
        <AlertCircle className="h-4 w-4 shrink-0" />
        <span>
          Your subscription has been downgraded to Free due to failed payment.
        </span>
        <button
          type="button"
          onClick={handlePortal}
          disabled={isPending}
          className="ml-auto shrink-0 text-red-800 font-medium underline hover:no-underline disabled:opacity-50"
        >
          {isPending ? 'Loading...' : 'Update payment'}
        </button>
      </div>
    )
  }

  // Cancellation scheduled
  if (cancel_at_period_end && current_period_end) {
    const endDate = new Date(current_period_end)
    if (endDate > new Date()) {
      return (
        <div className="flex items-center gap-2 bg-blue-50 border-b border-blue-200 px-6 py-2.5 text-sm text-blue-700">
          <Info className="h-4 w-4 shrink-0" />
          <span>
            Your plan cancels on {endDate.toLocaleDateString()}. You&apos;ll keep access until then.
          </span>
          <button
            type="button"
            onClick={handlePortal}
            disabled={isPending}
            className="ml-auto shrink-0 text-blue-800 font-medium underline hover:no-underline disabled:opacity-50"
          >
            {isPending ? 'Loading...' : 'Reactivate'}
          </button>
        </div>
      )
    }
  }

  return null
}
