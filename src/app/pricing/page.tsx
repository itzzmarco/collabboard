import { getUserBillingState } from '@/app/actions/billing'
import { PricingCards } from '@/components/pricing/PricingCards'

export default async function PricingPage() {
  const billingState = await getUserBillingState()

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl px-6 py-16">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-slate-900">Choose your plan</h1>
          <p className="mt-2 text-sm text-slate-500">
            Start free, upgrade when you need more.
          </p>
        </div>
        <PricingCards
          billingState={billingState}
          proPriceIds={{
            monthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID ?? '',
            annual: process.env.STRIPE_PRO_ANNUAL_PRICE_ID ?? '',
          }}
          teamPriceIds={{
            monthly: process.env.STRIPE_TEAM_MONTHLY_PRICE_ID ?? '',
            annual: process.env.STRIPE_TEAM_ANNUAL_PRICE_ID ?? '',
          }}
        />
      </div>
    </div>
  )
}
