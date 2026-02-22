'use server'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { verifyGuestJwt } from '@/lib/jwt'
import type { Card, DrawingPath } from '@/types'

async function getClient(guestJwt?: string | null, boardId?: string | null) {
  const payload = guestJwt ? verifyGuestJwt(guestJwt) : null
  const useService =
    payload &&
    payload.permission === 'edit' &&
    boardId != null &&
    payload.board_id === boardId
  if (useService) {
    return createServiceClient()
  }
  return await createClient()
}

// ---------------------------------------------------------------------------
// Cards
// ---------------------------------------------------------------------------

export async function upsertCard(
  payload: {
    id: string
    board_id: string
    type: string
    x: number
    y: number
    width: number
    height: number
    content: string
    color_index: number
    client_mutation_id: string
  },
  guestJwt?: string | null,
): Promise<{ error: string | null }> {
  const supabase = await getClient(guestJwt, payload.board_id)
  const { error } = await supabase.from('cards').upsert({
    id: payload.id,
    board_id: payload.board_id,
    type: payload.type,
    x: payload.x,
    y: payload.y,
    width: payload.width,
    height: payload.height,
    content: payload.content,
    color_index: payload.color_index,
    client_mutation_id: payload.client_mutation_id,
  })
  return { error: error ? error.message : null }
}

export async function removeCard(
  cardId: string,
  boardId: string,
  guestJwt?: string | null,
): Promise<{ error: string | null }> {
  const supabase = await getClient(guestJwt, boardId)
  const { error } = await supabase
    .from('cards')
    .delete()
    .eq('id', cardId)
    .eq('board_id', boardId)
  return { error: error ? error.message : null }
}

// ---------------------------------------------------------------------------
// Drawing Paths
// ---------------------------------------------------------------------------

export async function insertPath(
  payload: {
    id: string
    board_id: string
    color: string
    size: number
    points: Array<{ x: number; y: number }>
    client_mutation_id: string
  },
  guestJwt?: string | null,
): Promise<{ error: string | null }> {
  const supabase = await getClient(guestJwt, payload.board_id)
  const { error } = await supabase.from('drawing_paths').insert({
    id: payload.id,
    board_id: payload.board_id,
    color: payload.color,
    size: payload.size,
    points: payload.points as unknown as Record<string, unknown>,
    client_mutation_id: payload.client_mutation_id,
  })
  return { error: error ? error.message : null }
}

export async function removePath(
  pathId: string,
  boardId: string,
  guestJwt?: string | null,
): Promise<{ error: string | null }> {
  const supabase = await getClient(guestJwt, boardId)
  const { error } = await supabase
    .from('drawing_paths')
    .delete()
    .eq('id', pathId)
    .eq('board_id', boardId)
  return { error: error ? error.message : null }
}

export async function removeAllPaths(
  boardId: string,
  guestJwt?: string | null,
): Promise<{ error: string | null }> {
  const supabase = await getClient(guestJwt, boardId)
  const { error } = await supabase
    .from('drawing_paths')
    .delete()
    .eq('board_id', boardId)
  return { error: error ? error.message : null }
}

// ---------------------------------------------------------------------------
// Board metadata
// ---------------------------------------------------------------------------

export async function updateBoardTitle(
  boardId: string,
  title: string,
  guestJwt?: string | null,
): Promise<{ error: string | null }> {
  const supabase = await getClient(guestJwt, boardId)
  const { error } = await supabase
    .from('boards')
    .update({ title, updated_at: new Date().toISOString() })
    .eq('id', boardId)
  return { error: error ? error.message : null }
}

// ---------------------------------------------------------------------------
// Fetch (for refetch-on-error)
// ---------------------------------------------------------------------------

export async function fetchBoardData(
  boardId: string,
  guestJwt?: string | null,
): Promise<{ cards: Card[]; paths: DrawingPath[]; error: string | null }> {
  const supabase = await getClient(guestJwt, boardId)
  const [cardsResult, pathsResult] = await Promise.all([
    supabase.from('cards').select('*').eq('board_id', boardId),
    supabase.from('drawing_paths').select('*').eq('board_id', boardId),
  ])

  if (cardsResult.error) {
    return { cards: [], paths: [], error: cardsResult.error.message }
  }
  if (pathsResult.error) {
    return { cards: [], paths: [], error: pathsResult.error.message }
  }

  const paths: DrawingPath[] = (pathsResult.data ?? []).map((row) => ({
    ...row,
    points: row.points as unknown as Array<{ x: number; y: number }>,
  }))

  return {
    cards: (cardsResult.data ?? []) as Card[],
    paths,
    error: null,
  }
}
