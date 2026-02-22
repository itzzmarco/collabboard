'use client'

import { useBoardStore } from '@/stores/board-store'

const MAX_VISIBLE = 4

export default function CollaboratorAvatars() {
  const presenceCursors = useBoardStore((s) => s.presenceCursors)
  const entries = Object.values(presenceCursors)
  const visible = entries.slice(0, MAX_VISIBLE)
  const overflow = entries.length - MAX_VISIBLE

  if (entries.length === 0) return null

  return (
    <div
      className="flex items-center"
      style={{
        display: 'flex',
        alignItems: 'center',
        marginRight: 8,
      }}
    >
      {visible.map((cursor, i) => (
        <div
          key={cursor.userId}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-medium text-white"
          style={{
            width: 28,
            height: 28,
            minWidth: 28,
            backgroundColor: cursor.avatarColor,
            marginLeft: i === 0 ? 0 : -8,
            border: '2px solid white',
            boxSizing: 'border-box',
          }}
          title={cursor.displayName}
        >
          {cursor.displayName.charAt(0).toUpperCase()}
        </div>
      ))}
      {overflow > 0 && (
        <div
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-medium text-slate-600"
          style={{
            width: 28,
            height: 28,
            minWidth: 28,
            marginLeft: -8,
            border: '2px solid white',
            boxSizing: 'border-box',
          }}
        >
          +{overflow}
        </div>
      )}
    </div>
  )
}
