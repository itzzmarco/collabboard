import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { BoardGrid } from '@/components/dashboard/BoardGrid'
import { BillingBanner } from '@/components/billing/BillingBanner'
import { getUserBillingState } from '@/app/actions/billing'
import { resolveEntitlements } from '@/lib/entitlements'

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: boards } = await supabase
    .from('boards')
    .select('*')
    .eq('owner_id', user.id)
    .order('updated_at', { ascending: false })

  const [{ data: profile }, billingState] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    getUserBillingState(),
  ])

  const boardIds = (boards ?? []).map((b) => b.id)
  let cardColorMap: Record<string, number[]> = {}
  if (boardIds.length > 0) {
    const { data: cards } = await supabase
      .from('cards')
      .select('board_id, color_index')
      .in('board_id', boardIds)
    const map: Record<string, number[]> = {}
    for (const row of cards ?? []) {
      const arr = map[row.board_id] ?? []
      if (arr.length < 3) arr.push(row.color_index)
      map[row.board_id] = arr
    }
    cardColorMap = map
  }

  const ent = resolveEntitlements(billingState)
  const boardCount = boards?.length ?? 0
  const showUpsell = ent.plan === 'free' && boardCount >= 4

  return (
    <div className="bg-[#f8fafc] min-h-screen flex flex-col">
      <DashboardHeader profile={profile} userEmail={user.email} />
      <BillingBanner billingState={billingState} />
      <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8 max-w-7xl mx-auto w-full">
        {showUpsell && (
          <div className="mb-6 flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
            <span>
              You&apos;re using {boardCount} of 5 free boards.{' '}
              <Link href="/pricing" className="font-medium text-slate-900 underline hover:no-underline">
                Upgrade for unlimited
              </Link>
            </span>
          </div>
        )}
        <BoardGrid boards={boards ?? []} cardColorMap={cardColorMap} />
      </main>
    </div>
  )
}
