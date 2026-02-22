'use client'

import { useBoardStore } from '@/stores/board-store'

export default function PresenceCursors() {
  const presenceCursors = useBoardStore((s) => s.presenceCursors)
  const zoom = useBoardStore((s) => s.zoom)
  const pan = useBoardStore((s) => s.pan)

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
        const screenX = (cursor.x + pan.x) * zoom
        const screenY = (cursor.y + pan.y) * zoom
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
