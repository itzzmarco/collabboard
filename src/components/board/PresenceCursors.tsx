'use client'

import { useRef, useState, useEffect } from 'react'
import { useBoardStore } from '@/stores/board-store'

export default function PresenceCursors() {
  const presenceCursors = useBoardStore((s) => s.presenceCursors)
  const zoom = useBoardStore((s) => s.zoom)
  const pan = useBoardStore((s) => s.pan)

  const displayedRef = useRef<Record<string, { x: number; y: number }>>({})
  const [tick, setTick] = useState(0)

  // Sync displayedRef keys with presenceCursors
  useEffect(() => {
    // Initialise new cursors at their target position
    for (const key of Object.keys(presenceCursors)) {
      if (!(key in displayedRef.current)) {
        displayedRef.current[key] = {
          x: presenceCursors[key].x,
          y: presenceCursors[key].y,
        }
      }
    }
    // Remove stale keys
    for (const key of Object.keys(displayedRef.current)) {
      if (!(key in presenceCursors)) {
        delete displayedRef.current[key]
      }
    }
  }, [presenceCursors])

  // RAF lerp loop
  useEffect(() => {
    let rafId: number
    let prevTs: number | null = null

    const loop = (ts: number) => {
      if (prevTs === null) {
        prevTs = ts
      }
      const dt = ts - prevTs
      prevTs = ts

      const alpha = 1 - Math.exp(-dt / 100)
      const targets = useBoardStore.getState().presenceCursors
      let allClose = true

      for (const key of Object.keys(displayedRef.current)) {
        const target = targets[key]
        if (!target) continue

        const cur = displayedRef.current[key]
        const newX = cur.x + (target.x - cur.x) * alpha
        const newY = cur.y + (target.y - cur.y) * alpha

        if (Math.hypot(newX - target.x, newY - target.y) >= 0.5) {
          allClose = false
        }

        displayedRef.current[key] = { x: newX, y: newY }
      }

      if (!allClose) {
        setTick((t) => t + 1)
      }

      rafId = requestAnimationFrame(loop)
    }

    rafId = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(rafId)
    }
  }, [])

  const entries = Object.values(presenceCursors)

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    >
      {entries.map((cursor) => {
        const displayed = displayedRef.current[cursor.userId]
        const cx = displayed?.x ?? cursor.x
        const cy = displayed?.y ?? cursor.y
        const screenX = (cx + pan.x) * zoom
        const screenY = (cy + pan.y) * zoom
        return (
          <div
            key={cursor.userId}
            className="absolute left-0 top-0"
            style={{
              transform: `translate(${screenX}px, ${screenY}px)`,
            }}
          >
            {/* Small arrow cursor icon colored with avatarColor */}
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.2))' }}
            >
              <path
                d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87a.5.5 0 0 0 .35-.85L6.35 2.85a.5.5 0 0 0-.85.36Z"
                fill={cursor.avatarColor}
                stroke="white"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>
            {/* Name label pill below cursor tip */}
            <div
              className="ml-5 mt-1 rounded-full px-2 py-0.5 text-xs font-medium text-white shadow"
              style={{
                backgroundColor: cursor.avatarColor,
                marginLeft: 6,
                marginTop: 2,
                whiteSpace: 'nowrap',
                maxWidth: 120,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {cursor.displayName}
            </div>
          </div>
        )
      })}
    </div>
  )
}
