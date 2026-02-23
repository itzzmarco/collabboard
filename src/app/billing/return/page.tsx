'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getUserBillingState } from '@/app/actions/billing'

export default function BillingReturnPage() {
  const router = useRouter()
  const [timedOut, setTimedOut] = useState(false)

  useEffect(() => {
    let attempts = 0
    const maxAttempts = 16

    const poll = async () => {
      attempts++
      try {
        const billing = await getUserBillingState()
        if (
          billing &&
          (billing.subscription_status === 'active' ||
            billing.subscription_status === 'trialing')
        ) {
          router.replace('/billing?success=1')
          return
        }
      } catch {
        // ignore polling errors
      }

      if (attempts >= maxAttempts) {
        setTimedOut(true)
        return
      }

      setTimeout(poll, 2000)
    }

    poll()
  }, [router])

  if (timedOut) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="mx-auto max-w-md rounded-xl border bg-white p-8 shadow-sm text-center">
          <h1 className="text-lg font-semibold text-slate-900">
            Still processing&hellip;
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Your plan activation is still processing and may take a moment
            longer. We&apos;ll notify you by email when complete.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-6 w-full rounded-lg bg-slate-800 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-900 transition"
          >
            Refresh
          </button>
          <a
            href="/billing"
            className="mt-3 inline-block text-sm text-slate-500 hover:text-slate-700 transition"
          >
            Go to Billing
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-800" />
        <p className="text-sm text-slate-600">Activating your plan...</p>
      </div>
    </div>
  )
}
