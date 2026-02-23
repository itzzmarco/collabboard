import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { validateShareToken, mintBoardViewJwt } from '@/app/actions/share'
import BoardEditor from '@/components/board/BoardEditor'
import EditorCapReached from '@/components/board/EditorCapReached'
import { resolveEntitlements } from '@/lib/entitlements'
import type { Card, DrawingPath, BillingState } from '@/types'

export const dynamic = 'force-dynamic'

export default async function BoardPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ token?: string; viewOnly?: string }>
}) {
  const { id } = await params
  const { token, viewOnly } = await searchParams

  const supabase = await createClient()

  // ---- Share-token path: ?token= query param ----
  if (token) {
    const result = await validateShareToken(id, token)

    if ('error' in result) {
      redirect('/board/no-access')
    }

    if (result.permission === 'edit') {
      // Edit link: require sign-in
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        redirect(`/login?next=/board/${id}?token=${token}`)
      }
      if (!user.email_confirmed_at) {
        redirect(`/verify-email?next=/board/${id}?token=${token}`)
      }

      // Verified user with edit token: fetch board data with service client (bypass RLS)
      const service = createServiceClient()
      const { data: board, error: boardError } = await service
        .from('boards')
        .select('*')
        .eq('id', id)
        .single()

      if (boardError || !board) {
        redirect('/board/no-access')
      }

      // View-only fallback for edit-token users (e.g. from EditorCapReached)
      // Runs BEFORE cap check — no session upsert, no cap query
      if (viewOnly === '1') {
        const [viewScopedJwt, crRes, dpRes, prRes] = await Promise.all([
          mintBoardViewJwt(id),
          service.from('cards').select('*').eq('board_id', id),
          service.from('drawing_paths').select('*').eq('board_id', id),
          supabase.from('profiles').select('display_name, avatar_color').eq('id', user.id).single(),
        ])
        const voCards: Card[] = (crRes.data ?? []) as Card[]
        const voPaths: DrawingPath[] = (dpRes.data ?? []).map((row) => ({
          ...row,
          points: row.points as unknown as Array<{ x: number; y: number }>,
        })) as DrawingPath[]
        const voProfile = prRes.data
        return (
          <BoardEditor
            initialBoard={board}
            initialCards={voCards}
            initialPaths={voPaths}
            userId={user.id}
            userProfile={voProfile ? { displayName: voProfile.display_name ?? 'User', avatarColor: voProfile.avatar_color ?? '#64748b' } : { displayName: 'User', avatarColor: '#64748b' }}
            isViewOnly={true}
            guestJwt={viewScopedJwt}
          />
        )
      }

      // Editor cap enforcement via entitlements
      const { data: ownerProfile } = await service
        .from('profiles')
        .select('plan, subscription_status, current_period_end, stripe_customer_id, stripe_subscription_id, cancel_at_period_end, past_due_grace_until')
        .eq('id', board.owner_id)
        .single()

      const ownerBilling: BillingState = ownerProfile
        ? {
            plan: ownerProfile.plan as BillingState['plan'],
            subscription_status: ownerProfile.subscription_status,
            current_period_end: ownerProfile.current_period_end,
            stripe_customer_id: ownerProfile.stripe_customer_id,
            stripe_subscription_id: ownerProfile.stripe_subscription_id,
            cancel_at_period_end: ownerProfile.cancel_at_period_end,
            past_due_grace_until: ownerProfile.past_due_grace_until,
          }
        : { plan: 'free', subscription_status: null, current_period_end: null, stripe_customer_id: null, stripe_subscription_id: null, cancel_at_period_end: false, past_due_grace_until: null }
      const entitlements = resolveEntitlements(ownerBilling)

      if (entitlements.editors !== Infinity) {
        const cutoff = new Date(Date.now() - 45_000).toISOString()
        const { count } = await service
          .from('board_editor_sessions')
          .select('user_id', { count: 'exact', head: true })
          .eq('board_id', id)
          .gt('last_seen_at', cutoff)
          .neq('user_id', user.id)

        if ((count ?? 0) >= entitlements.editors) {
          return <EditorCapReached ownerPlan={entitlements.plan} boardId={id} isOwner={false} token={token} />
        }
      }

      // Upsert editor session
      await service.from('board_editor_sessions').upsert(
        { board_id: id, user_id: user.id, last_seen_at: new Date().toISOString() },
        { onConflict: 'board_id,user_id' },
      )

      const [cardsResult, pathsResult, profileResult] = await Promise.all([
        service.from('cards').select('*').eq('board_id', id),
        service.from('drawing_paths').select('*').eq('board_id', id),
        supabase.from('profiles').select('display_name, avatar_color').eq('id', user.id).single(),
      ])

      const cards: Card[] = (cardsResult.data ?? []) as Card[]
      const paths: DrawingPath[] = (pathsResult.data ?? []).map((row) => ({
        ...row,
        points: row.points as unknown as Array<{ x: number; y: number }>,
      })) as DrawingPath[]

      const profile = profileResult.data
      const userProfile = profile
        ? {
            displayName: profile.display_name ?? 'User',
            avatarColor: profile.avatar_color ?? '#64748b',
          }
        : { displayName: 'User', avatarColor: '#64748b' }

      return (
        <BoardEditor
          initialBoard={board}
          initialCards={cards}
          initialPaths={paths}
          userId={user.id}
          userProfile={userProfile}
          guestJwt={result.guestJwt}
          canExport={entitlements.canExport}
        />
      )
    }

    // View link: anonymous access with guest JWT
    const service = createServiceClient()

    const { data: board, error: boardError } = await service
      .from('boards')
      .select('*')
      .eq('id', id)
      .single()

    if (boardError || !board) {
      redirect('/board/no-access')
    }

    const [cardsResult, pathsResult] = await Promise.all([
      service.from('cards').select('*').eq('board_id', id),
      service.from('drawing_paths').select('*').eq('board_id', id),
    ])

    const cards: Card[] = (cardsResult.data ?? []) as Card[]
    const paths: DrawingPath[] = (pathsResult.data ?? []).map((row) => ({
      ...row,
      points: row.points as unknown as Array<{ x: number; y: number }>,
    })) as DrawingPath[]

    return (
      <BoardEditor
        initialBoard={board}
        initialCards={cards}
        initialPaths={paths}
        userId={`guest_${token.slice(0, 8)}`}
        userProfile={{ displayName: 'Guest', avatarColor: '#94a3b8' }}
        isViewOnly={true}
        guestJwt={result.guestJwt}
      />
    )
  }

  // ---- Authenticated owner path (no token) ----
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch board by id
  const { data: board, error: boardError } = await supabase
    .from('boards')
    .select('*')
    .eq('id', id)
    .single()

  // Ownership gate: board not found or user is not the owner
  if (boardError || !board || board.owner_id !== user.id) {
    redirect('/board/no-access')
  }

  // Fetch cards, paths, and user profile in parallel
  const [cardsResult, pathsResult, profileResult] = await Promise.all([
    supabase.from('cards').select('*').eq('board_id', id),
    supabase.from('drawing_paths').select('*').eq('board_id', id),
    supabase.from('profiles').select('display_name, avatar_color, plan, subscription_status, current_period_end, stripe_customer_id, stripe_subscription_id, cancel_at_period_end, past_due_grace_until').eq('id', user.id).single(),
  ])

  const cards: Card[] = (cardsResult.data ?? []) as Card[]

  // Cast points column from Json back to typed array
  const paths: DrawingPath[] = (pathsResult.data ?? []).map((row) => ({
    ...row,
    points: row.points as unknown as Array<{ x: number; y: number }>,
  })) as DrawingPath[]

  const profile = profileResult.data
  const userProfile = profile
    ? {
        displayName: profile.display_name ?? 'User',
        avatarColor: profile.avatar_color ?? '#64748b',
      }
    : { displayName: 'User', avatarColor: '#64748b' }

  const ownerBillingState: BillingState = profile
    ? {
        plan: profile.plan as BillingState['plan'],
        subscription_status: profile.subscription_status,
        current_period_end: profile.current_period_end,
        stripe_customer_id: profile.stripe_customer_id,
        stripe_subscription_id: profile.stripe_subscription_id,
        cancel_at_period_end: profile.cancel_at_period_end,
        past_due_grace_until: profile.past_due_grace_until,
      }
    : { plan: 'free', subscription_status: null, current_period_end: null, stripe_customer_id: null, stripe_subscription_id: null, cancel_at_period_end: false, past_due_grace_until: null }
  const ownerEntitlements = resolveEntitlements(ownerBillingState)
  const canExport = ownerEntitlements.canExport

  // Editor cap enforcement (owner path)
  const service = createServiceClient()

  if (ownerEntitlements.editors !== Infinity) {
    const cutoff = new Date(Date.now() - 45_000).toISOString()
    const { count } = await service
      .from('board_editor_sessions')
      .select('user_id', { count: 'exact', head: true })
      .eq('board_id', id)
      .gt('last_seen_at', cutoff)
      .neq('user_id', user.id)

    if ((count ?? 0) >= ownerEntitlements.editors) {
      return <EditorCapReached ownerPlan={ownerEntitlements.plan} boardId={id} isOwner={true} />
    }
  }

  // View-only fallback (e.g. from EditorCapReached)
  if (viewOnly === '1') {
    return (
      <BoardEditor
        initialBoard={board}
        initialCards={cards}
        initialPaths={paths}
        userId={user.id}
        userProfile={userProfile}
        isViewOnly={true}
      />
    )
  }

  // Upsert owner's editor session
  await service.from('board_editor_sessions').upsert(
    { board_id: id, user_id: user.id, last_seen_at: new Date().toISOString() },
    { onConflict: 'board_id,user_id' },
  )

  return (
    <BoardEditor
      initialBoard={board}
      initialCards={cards}
      initialPaths={paths}
      userId={user.id}
      userProfile={userProfile}
      canExport={canExport}
    />
  )
}
