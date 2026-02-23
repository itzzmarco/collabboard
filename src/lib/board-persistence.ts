import type { SupabaseClient } from '@supabase/supabase-js'
import { decompressPoints } from '@/lib/drawing-utils'
import type { Card, DrawingPath } from '@/types'

// ---------------------------------------------------------------------------
// Cards
// ---------------------------------------------------------------------------

/**
 * Upsert a card row. DB handles created_at / updated_at automatically.
 * NOTE: Fields are listed explicitly so we never accidentally persist
 * client-only properties. Update this list when the cards schema changes.
 */
export async function saveCard(
  supabase: SupabaseClient,
  card: Card
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('cards').upsert({
    id: card.id,
    board_id: card.board_id,
    type: card.type,
    x: card.x,
    y: card.y,
    width: card.width,
    height: card.height,
    content: card.content,
    color_index: card.color_index,
    client_mutation_id: card.client_mutation_id,
  })

  return { error: error ? error.message : null }
}

/**
 * Delete a single card by its id.
 */
export async function deleteCardFromDB(
  supabase: SupabaseClient,
  cardId: string
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('cards').delete().eq('id', cardId)

  return { error: error ? error.message : null }
}

// ---------------------------------------------------------------------------
// Drawing Paths
// ---------------------------------------------------------------------------

/**
 * Insert a drawing path. The points array is stored as JSONB by Supabase.
 */
export async function savePath(
  supabase: SupabaseClient,
  path: DrawingPath
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('drawing_paths').insert({
    id: path.id,
    board_id: path.board_id,
    color: path.color,
    size: path.size,
    points: path.points as unknown as Record<string, unknown>,
    client_mutation_id: path.client_mutation_id,
  })

  return { error: error ? error.message : null }
}

/**
 * Delete ALL drawing paths that belong to a given board.
 */
export async function deletePathsFromDB(
  supabase: SupabaseClient,
  boardId: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('drawing_paths')
    .delete()
    .eq('board_id', boardId)

  return { error: error ? error.message : null }
}

// ---------------------------------------------------------------------------
// Board metadata
// ---------------------------------------------------------------------------

/**
 * Update the board title and bump updated_at to now.
 */
export async function updateBoardTitleInDB(
  supabase: SupabaseClient,
  boardId: string,
  title: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('boards')
    .update({ title, updated_at: new Date().toISOString() })
    .eq('id', boardId)

  return { error: error ? error.message : null }
}

// ---------------------------------------------------------------------------
// Fetch everything for a board
// ---------------------------------------------------------------------------

/**
 * Fetch all cards and drawing paths for a board in parallel.
 */
export async function fetchBoardData(
  supabase: SupabaseClient,
  boardId: string
): Promise<{ cards: Card[]; paths: DrawingPath[]; error: string | null }> {
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

  // Decompress the delta-encoded points column back to the typed array.
  const paths: DrawingPath[] = (pathsResult.data ?? []).map((row) => ({
    ...row,
    points: decompressPoints(row.points as unknown as Array<Record<string, number>>),
  }))

  return {
    cards: (cardsResult.data ?? []) as Card[],
    paths,
    error: null,
  }
}
