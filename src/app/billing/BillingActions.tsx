'use client'

import { useTransition } from 'react'
import { createPortalSession } from '@/app/actions/billing'

export function BillingActions() {
  const [isPending, startTransition] = useTransition()

  function handleManage() {
    startTransition(async () => {
      const result = await createPortalSession()
      if ('url' in result) {
        window.location.href = result.url
      }
    })
  }

  return (
    <button
      type="button"
      onClick={handleManage}
      disabled={isPending}
      className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900 transition disabled:opacity-50"
    >
      {isPending ? 'Loading...' : 'Manage subscription'}
    </button>
  )
}
