import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { BoardGrid } from '@/components/dashboard/BoardGrid'

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

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

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

  return (
    <div className="bg-[#f8fafc] min-h-screen flex flex-col">
      <DashboardHeader profile={profile} userEmail={user.email} />
      <main className="flex-1 px-6 py-8 max-w-7xl mx-auto w-full">
        <BoardGrid boards={boards ?? []} cardColorMap={cardColorMap} />
      </main>
    </div>
  )
}
