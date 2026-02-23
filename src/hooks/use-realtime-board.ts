'use client'

import { useEffect, useRef, useCallback } from 'react'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { createClient as createBrowserClient } from '@/lib/supabase/client'
import { useBoardStore } from '@/stores/board-store'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { PresenceCursor, BroadcastStroke } from '@/types'

const CURSOR_THROTTLE_MS = 16

export interface UseRealtimeBoardResult {
  broadcastCursor: (canvasX: number, canvasY: number) => void
  broadcastCardDrag: (cardId: string, x: number, y: number) => void
  broadcastCardDragEnd: (cardId: string) => void
  broadcastDrawStroke: (
    points: Array<{ x: number; y: number }>,
    color: string,
    size: number,
  ) => void
  broadcastDrawStrokeEnd: () => void
  broadcastViewport: (pan: { x: number; y: number }, zoom: number) => void
}

export function useRealtimeBoard(
  boardId: string,
  userId: string,
  userProfile: { displayName: string; avatarColor: string },
  guestJwt?: string | null,
): UseRealtimeBoardResult {
  const boardClientRef = useRef<SupabaseClient<any, any, any> | null>(null)
  const lastCursorTime = useRef(0)
  const lastCardDragTime = useRef(0)
  const lastDrawStrokeTime = useRef(0)
  const presenceChannelRef = useRef<RealtimeChannel | null>(null)
  const broadcastChannelRef = useRef<RealtimeChannel | null>(null)
  const postgresChannelRef = useRef<RealtimeChannel | null>(null)

  const setLatestRemoteViewport = useBoardStore((s) => s.setLatestRemoteViewport)
  const lastViewportTime = useRef(0)

  const setPresenceCursors = useBoardStore((s) => s.setPresenceCursors)
  const setGhostCardPosition = useBoardStore((s) => s.setGhostCardPosition)
  const clearGhostCardPosition = useBoardStore((s) => s.clearGhostCardPosition)
  const setGhostStroke = useBoardStore((s) => s.setGhostStroke)
  const applyRemoteCardUpdate = useBoardStore((s) => s.applyRemoteCardUpdate)
  const applyRemotePathUpdate = useBoardStore((s) => s.applyRemotePathUpdate)

  useEffect(() => {
    if (!boardId) return

    let cancelled = false
    let cleanup: (() => void) | null = null

    const run = async () => {
      const boardClient = guestJwt
        ? createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
              auth: {
                persistSession: false,
                autoRefreshToken: false,
                detectSessionInUrl: false,
                storage: undefined,
              },
              global: { headers: { Authorization: `Bearer ${guestJwt}` } },
            },
          )
        : createBrowserClient()
      boardClientRef.current = boardClient
      if (cancelled) return

      const presenceChannel = boardClient.channel(`presence:${boardId}`, {
        config: { presence: { key: userId } },
      })
      presenceChannelRef.current = presenceChannel

      presenceChannel
        .on('presence', { event: 'sync' }, () => {
          const state = presenceChannel.presenceState()
          const cursors: Record<string, PresenceCursor> = {}
          Object.entries(state).forEach(([key, presences]) => {
            if (key === userId) return
            const presence = Array.isArray(presences) ? presences[0] : presences
            if (!presence || typeof presence !== 'object') return
            const p = presence as Record<string, unknown>
            cursors[key] = {
              userId: key,
              displayName: (p.displayName as string) ?? 'User',
              avatarColor: (p.avatarColor as string) ?? '#64748b',
              x: (p.x as number) ?? 0,
              y: (p.y as number) ?? 0,
            }
          })
          setPresenceCursors(cursors)
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await presenceChannel.track({
              userId,
              displayName: userProfile.displayName,
              avatarColor: userProfile.avatarColor,
              x: 0,
              y: 0,
            })
          }
        })

      const broadcastChannel = boardClient.channel(`broadcast:${boardId}`)
      broadcastChannelRef.current = broadcastChannel

      broadcastChannel
        .on('broadcast', { event: 'card_drag' }, ({ payload }) => {
          const { cardId, x, y } = payload as { cardId: string; x: number; y: number }
          setGhostCardPosition(cardId, { x, y })
        })
        .on('broadcast', { event: 'card_drag_end' }, ({ payload }) => {
          const { cardId } = payload as { cardId: string }
          clearGhostCardPosition(cardId)
        })
        .on('broadcast', { event: 'draw_stroke' }, ({ payload }) => {
          setGhostStroke(payload as BroadcastStroke)
        })
        .on('broadcast', { event: 'draw_stroke_end' }, () => {
          setGhostStroke(null)
        })
        .on('broadcast', { event: 'viewport' }, ({ payload }) => {
          setLatestRemoteViewport(payload as { pan: { x: number; y: number }; zoom: number })
        })
        .subscribe()

      if (cancelled) return

      const postgresChannel = boardClient.channel(`postgres:${boardId}`)
      postgresChannelRef.current = postgresChannel

      postgresChannel
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'cards',
            filter: `board_id=eq.${boardId}`,
          },
          (payload) => {
            const eventType = payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE'
            const row = (payload.new ?? payload.old) as Record<string, unknown>
            if (!row?.id) return
            applyRemoteCardUpdate(eventType, row as Partial<{ id: string }> & { id: string })
          },
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'drawing_paths',
            filter: `board_id=eq.${boardId}`,
          },
          (payload) => {
            const eventType = payload.eventType as 'INSERT' | 'DELETE'
            const row = (payload.new ?? payload.old) as Record<string, unknown>
            if (!row?.id) return
            applyRemotePathUpdate(eventType, row as Partial<{ id: string }> & { id: string })
          },
        )
        .subscribe()

      cleanup = () => {
        const client = boardClientRef.current
        if (client) {
          client.removeChannel(presenceChannel)
          client.removeChannel(broadcastChannel)
          client.removeChannel(postgresChannel)
        }
        boardClientRef.current = null
        presenceChannelRef.current = null
        broadcastChannelRef.current = null
        postgresChannelRef.current = null
      }
    }

    run()
    return () => {
      cancelled = true
      cleanup?.()
    }
  }, [
    boardId,
    userId,
    userProfile.displayName,
    userProfile.avatarColor,
    setPresenceCursors,
    setGhostCardPosition,
    clearGhostCardPosition,
    setGhostStroke,
    setLatestRemoteViewport,
    applyRemoteCardUpdate,
    applyRemotePathUpdate,
    guestJwt,
  ])

  const broadcastCursor = useCallback(
    (canvasX: number, canvasY: number) => {
      const now = Date.now()
      if (now - lastCursorTime.current < CURSOR_THROTTLE_MS) return
      lastCursorTime.current = now
      const channel = presenceChannelRef.current
      if (channel?.state === 'joined') {
        channel.track({
          userId,
          displayName: userProfile.displayName,
          avatarColor: userProfile.avatarColor,
          x: canvasX,
          y: canvasY,
        })
      }
    },
    [userId, userProfile.displayName, userProfile.avatarColor],
  )

  const broadcastCardDrag = useCallback((cardId: string, x: number, y: number) => {
    const now = Date.now()
    if (now - lastCardDragTime.current < 16) return
    lastCardDragTime.current = now
    const channel = broadcastChannelRef.current
    if (channel?.state === 'joined') {
      channel.send({ type: 'broadcast', event: 'card_drag', payload: { cardId, x, y } })
    }
  }, [])

  const broadcastCardDragEnd = useCallback((cardId: string) => {
    const channel = broadcastChannelRef.current
    if (channel?.state === 'joined') {
      channel.send({ type: 'broadcast', event: 'card_drag_end', payload: { cardId } })
    }
  }, [])

  const broadcastDrawStroke = useCallback(
    (points: Array<{ x: number; y: number }>, color: string, size: number) => {
      const now = Date.now()
      if (now - lastDrawStrokeTime.current < 16) return
      lastDrawStrokeTime.current = now
      const channel = broadcastChannelRef.current
      if (channel?.state === 'joined') {
        channel.send({ type: 'broadcast', event: 'draw_stroke', payload: { color, size, points } })
      }
    },
    [],
  )

  const broadcastDrawStrokeEnd = useCallback(() => {
    const channel = broadcastChannelRef.current
    if (channel?.state === 'joined') {
      channel.send({ type: 'broadcast', event: 'draw_stroke_end', payload: {} })
    }
  }, [])

  const broadcastViewport = useCallback(
    (pan: { x: number; y: number }, zoom: number) => {
      const now = Date.now()
      if (now - lastViewportTime.current < 100) return
      lastViewportTime.current = now
      const channel = broadcastChannelRef.current
      if (channel?.state === 'joined') {
        channel.send({ type: 'broadcast', event: 'viewport', payload: { pan, zoom } })
      }
    },
    [],
  )

  return {
    broadcastCursor,
    broadcastCardDrag,
    broadcastCardDragEnd,
    broadcastDrawStroke,
    broadcastDrawStrokeEnd,
    broadcastViewport,
  }
}
