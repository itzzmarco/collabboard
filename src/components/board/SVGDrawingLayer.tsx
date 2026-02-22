'use client'

import { useBoardStore } from '@/stores/board-store'
import type { DrawingPath } from '@/types'
import type { InProgressPath } from '@/stores/board-store'
import type { BroadcastStroke } from '@/types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build an SVG path `d` attribute from an array of points. */
function buildPathD(points: ReadonlyArray<{ x: number; y: number }>): string {
  if (points.length < 2) return ''
  const [first, ...rest] = points
  return `M ${first.x} ${first.y}` + rest.map((p) => ` L ${p.x} ${p.y}`).join('')
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function CommittedPath({ path }: { path: DrawingPath }) {
  if (path.points.length < 2) return null

  return (
    <path
      d={buildPathD(path.points)}
      stroke={path.color}
      strokeWidth={path.size}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  )
}

function InProgressPathElement({ path }: { path: InProgressPath }) {
  if (path.points.length < 2) return null

  return (
    <path
      d={buildPathD(path.points)}
      stroke={path.color}
      strokeWidth={path.size}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity={0.7}
    />
  )
}

function GhostStrokePath({ path }: { path: BroadcastStroke }) {
  if (path.points.length < 2) return null

  return (
    <path
      d={buildPathD(path.points)}
      stroke={path.color}
      strokeWidth={path.size}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity={0.45}
      strokeDasharray="6 3"
    />
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function SVGDrawingLayer() {
  const paths = useBoardStore((s) => s.paths)
  const currentPath = useBoardStore((s) => s.currentPath)
  const ghostStroke = useBoardStore((s) => s.ghostStroke)
  const tool = useBoardStore((s) => s.tool)

  const isDrawActive = tool === 'draw'

  return (
    <svg
      className="absolute inset-0"
      style={{
        width: '100%',
        height: '100%',
        minWidth: 4000,
        minHeight: 4000,
        pointerEvents: isDrawActive ? 'auto' : 'none',
        cursor: isDrawActive ? 'crosshair' : undefined,
      }}
    >
      {/* Committed paths */}
      {paths.map((p) => (
        <CommittedPath key={p.id} path={p} />
      ))}

      {/* Remote in-progress stroke (ghost) */}
      {ghostStroke && <GhostStrokePath path={ghostStroke} />}

      {/* In-progress path */}
      {currentPath && <InProgressPathElement path={currentPath} />}
    </svg>
  )
}
