'use server'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function upsertEditorSession(boardId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  const service = createServiceClient()
  await service.from('board_editor_sessions').upsert(
    {
      board_id: boardId,
      user_id: user.id,
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: 'board_id,user_id' },
  )
}
