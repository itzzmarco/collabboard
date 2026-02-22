import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { validateShareToken } from '@/app/actions/share'
import BoardEditor from '@/components/board/BoardEditor'
import type { Card, DrawingPath } from '@/types'

export const dynamic = 'force-dynamic'

export default async function BoardPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ token?: string }>
}) {
  const { id } = await params
  const { token } = await searchParams

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
    supabase.from('profiles').select('display_name, avatar_color').eq('id', user.id).single(),
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

  return (
    <BoardEditor
      initialBoard={board}
      initialCards={cards}
      initialPaths={paths}
      userId={user.id}
      userProfile={userProfile}
    />
  )
}
