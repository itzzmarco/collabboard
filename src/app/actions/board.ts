'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type Template = 'blank' | 'sprint' | 'brainstorm' | 'retrospective'

export type TemplateCardInput = {
  content: string
  x: number
  y: number
  width: number
  height: number
  color_index: number
  type: string
}

// Spec counts: Sprint 7, Brainstorm 7, Retrospective 9. All type: 'sticky', color_index 0-5.

// Sprint: 7 stickies — 4 column headers at (50,50)-(650,50) 160x80 c0-3 + 3 tasks at (50/250/450,160) 160x100 c0/1/2
const SPRINT_CARDS: TemplateCardInput[] = [
  { content: 'Backlog', x: 50, y: 50, width: 160, height: 80, color_index: 0, type: 'sticky' },
  { content: 'In Progress', x: 250, y: 50, width: 160, height: 80, color_index: 1, type: 'sticky' },
  { content: 'In Review', x: 450, y: 50, width: 160, height: 80, color_index: 2, type: 'sticky' },
  { content: 'Done', x: 650, y: 50, width: 160, height: 80, color_index: 3, type: 'sticky' },
  { content: 'User auth flow', x: 50, y: 160, width: 160, height: 100, color_index: 0, type: 'sticky' },
  { content: 'Dashboard UI', x: 250, y: 160, width: 160, height: 100, color_index: 1, type: 'sticky' },
  { content: 'API integration', x: 450, y: 160, width: 160, height: 100, color_index: 2, type: 'sticky' },
]

// Brainstorm: 7 cards — Main Topic at (300,200) 180x80 c4 + Idea 1–6 at specified coords/sizes/colors
const BRAINSTORM_CARDS: TemplateCardInput[] = [
  { content: 'Main Topic', x: 300, y: 200, width: 180, height: 80, color_index: 4, type: 'sticky' },
  { content: 'Idea1', x: 80, y: 80, width: 140, height: 80, color_index: 0, type: 'sticky' },
  { content: 'Idea2', x: 300, y: 60, width: 140, height: 80, color_index: 1, type: 'sticky' },
  { content: 'Idea3', x: 520, y: 80, width: 140, height: 80, color_index: 2, type: 'sticky' },
  { content: 'Idea4', x: 80, y: 300, width: 140, height: 80, color_index: 3, type: 'sticky' },
  { content: 'Idea5', x: 300, y: 340, width: 140, height: 80, color_index: 5, type: 'sticky' },
  { content: 'Idea6', x: 520, y: 300, width: 140, height: 80, color_index: 0, type: 'sticky' },
]

// Retrospective: 9 cards — 3 headers + 6 items per ticket spec
const RETROSPECTIVE_CARDS: TemplateCardInput[] = [
  { content: 'What went well', x: 50, y: 50, width: 180, height: 80, color_index: 2, type: 'sticky' },
  { content: "What didn't", x: 270, y: 50, width: 180, height: 80, color_index: 3, type: 'sticky' },
  { content: 'Action items', x: 490, y: 50, width: 180, height: 80, color_index: 1, type: 'sticky' },
  { content: 'Great teamwork', x: 50, y: 160, width: 160, height: 90, color_index: 2, type: 'sticky' },
  { content: 'Fast delivery', x: 50, y: 270, width: 160, height: 90, color_index: 2, type: 'sticky' },
  { content: 'Missed deadline', x: 270, y: 160, width: 160, height: 90, color_index: 3, type: 'sticky' },
  { content: 'Scope creep', x: 270, y: 270, width: 160, height: 90, color_index: 3, type: 'sticky' },
  { content: 'Improve standups', x: 490, y: 160, width: 160, height: 90, color_index: 1, type: 'sticky' },
  { content: 'Better docs', x: 490, y: 270, width: 160, height: 90, color_index: 1, type: 'sticky' },
]

const TEMPLATE_CARDS: Record<Exclude<Template, 'blank'>, TemplateCardInput[]> = {
  sprint: SPRINT_CARDS,
  brainstorm: BRAINSTORM_CARDS,
  retrospective: RETROSPECTIVE_CARDS,
}

// Spec-required counts: Sprint 7, Brainstorm 7, Retrospective 9
if (
  SPRINT_CARDS.length !== 7 ||
  BRAINSTORM_CARDS.length !== 7 ||
  RETROSPECTIVE_CARDS.length !== 9
) {
  throw new Error(
    `Template card counts must be 7/7/9, got ${SPRINT_CARDS.length}/${BRAINSTORM_CARDS.length}/${RETROSPECTIVE_CARDS.length}`
  )
}

export async function createBoard(
  name: string,
  template: Template
): Promise<{ boardId: string } | { error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  const p_cards = template === 'blank' ? [] : TEMPLATE_CARDS[template]
  const { data, error: rpcError } = await supabase.rpc('create_board_with_template', {
    p_owner_id: user.id,
    p_title: name,
    p_cards,
  })

  if (rpcError) {
    return { error: rpcError.message }
  }
  if (data == null) {
    return { error: 'Failed to create board' }
  }

  revalidatePath('/dashboard')
  return { boardId: data }
}

export async function renameBoard(
  id: string,
  title: string
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('boards')
    .update({ title, updated_at: new Date().toISOString() })
    .eq('id', id)
  revalidatePath('/dashboard')
  return error ? { error: error.message } : {}
}

export async function deleteBoard(id: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase.from('boards').delete().eq('id', id)
  revalidatePath('/dashboard')
  return error ? { error: error.message } : {}
}
