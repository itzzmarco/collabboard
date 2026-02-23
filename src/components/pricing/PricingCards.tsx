'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, AlertCircle } from 'lucide-react'
import { createCheckoutSession } from '@/app/actions/billing'
import type { BillingState } from '@/types'

interface PriceIds {
  monthly: string
  annual: string
}

interface PricingCardsProps {
  billingState: BillingState | null
  proPriceIds: PriceIds
  teamPriceIds: PriceIds
}

const plans = [
  {
    key: 'free' as const,
    name: 'Free',
    monthlyPrice: 0,
    annualPrice: 0,
    features: ['Up to 5 boards', '2 concurrent editors', 'Basic collaboration'],
  },
  {
    key: 'pro' as const,
    name: 'Pro',
    monthlyPrice: 12,
    annualPrice: 96,
    features: [
      'Unlimited boards',
      '10 concurrent editors',
      'Export to PNG/SVG',
      '14-day free trial',
    ],
  },
  {
    key: 'team' as const,
    name: 'Team',
    monthlyPrice: 29,
    annualPrice: 240,
    features: [
      'Unlimited boards',
      'Unlimited editors',
      'Export to PNG/SVG',
      'Priority support',
      '14-day free trial',
    ],
  },
]

export function PricingCards({
  billingState,
  proPriceIds,
  teamPriceIds,
}: PricingCardsProps) {
  const [annual, setAnnual] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const currentPlan = billingState?.plan ?? null

  function handleUpgrade(planKey: 'pro' | 'team') {
    setError(null)

    if (!billingState) {
      router.push('/login?next=/pricing')
      return
    }

    const priceId =
      planKey === 'pro'
        ? annual
          ? proPriceIds.annual
          : proPriceIds.monthly
        : annual
          ? teamPriceIds.annual
          : teamPriceIds.monthly

    if (!priceId) {
      setError('Pricing is not configured yet. Please contact support.')
      return
    }

    startTransition(async () => {
      const result = await createCheckoutSession(priceId)
      if ('url' in result) {
        window.location.href = result.url
      } else {
        setError(result.error)
      }
    })
  }

  return (
    <div>
      {/* Monthly/annual toggle */}
      <div className="flex items-center justify-center gap-3 mb-10">
        <span
          className={`text-sm ${!annual ? 'font-semibold text-slate-900' : 'text-slate-500'}`}
        >
          Monthly
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={annual}
          onClick={() => setAnnual(!annual)}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
            annual ? 'bg-slate-800' : 'bg-slate-300'
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm ring-0 transition-transform ${
              annual ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
        <span
          className={`text-sm ${annual ? 'font-semibold text-slate-900' : 'text-slate-500'}`}
        >
          Annual
        </span>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-6 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Plan cards */}
      <div className="grid gap-6 md:grid-cols-3">
        {plans.map((plan) => {
          const isCurrent = currentPlan === plan.key
          const price = annual ? plan.annualPrice : plan.monthlyPrice
          const period = annual ? '/yr' : '/mo'

          return (
            <div
              key={plan.key}
              className={`relative rounded-xl border bg-white p-6 shadow-sm ${
                isCurrent ? 'ring-2 ring-slate-800' : ''
              }`}
            >
              {isCurrent && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-slate-800 px-3 py-0.5 text-xs font-medium text-white">
                  Current plan
                </span>
              )}

              <h3 className="text-lg font-semibold text-slate-900">{plan.name}</h3>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-3xl font-bold text-slate-900">
                  ${price}
                </span>
                {price > 0 && (
                  <span className="text-sm text-slate-500">{period}</span>
                )}
              </div>

              <ul className="mt-6 space-y-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-slate-600">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                    {f}
                  </li>
                ))}
              </ul>

              <div className="mt-8">
                {plan.key === 'free' ? (
                  !billingState ? (
                    <button
                      type="button"
                      onClick={() => router.push('/login?next=/pricing')}
                      className="w-full rounded-lg bg-slate-800 text-white px-4 py-2.5 text-sm font-medium hover:bg-slate-900 transition"
                    >
                      Get started
                    </button>
                  ) : currentPlan === 'free' ? (
                    <button
                      type="button"
                      disabled
                      className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-400 cursor-not-allowed"
                    >
                      Current plan
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-400 cursor-not-allowed"
                    >
                      Current: {currentPlan}
                    </button>
                  )
                ) : (
                  <button
                    type="button"
                    disabled={isCurrent || isPending}
                    onClick={() => handleUpgrade(plan.key)}
                    className={`w-full rounded-lg px-4 py-2.5 text-sm font-medium transition ${
                      isCurrent
                        ? 'border border-slate-200 text-slate-400 cursor-not-allowed'
                        : 'bg-slate-800 text-white hover:bg-slate-900 disabled:opacity-50'
                    }`}
                  >
                    {isCurrent
                      ? 'Current plan'
                      : isPending
                        ? 'Redirecting...'
                        : 'Start 14-day trial'}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
