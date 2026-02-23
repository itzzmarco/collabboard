'use client'

import { useRef, useState, useEffect } from 'react'
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

  const displayedGhostRef = useRef<Array<{ x: number; y: number }> | null>(null)
  const [tick, setTick] = useState(0)

  // Sync displayedGhostRef with ghostStroke
  useEffect(() => {
    if (ghostStroke === null) {
      displayedGhostRef.current = null
      return
    }
    if (displayedGhostRef.current === null) {
      // Stroke just started — initialise with a copy
      displayedGhostRef.current = ghostStroke.points.map((p) => ({ x: p.x, y: p.y }))
    } else {
      // Append new points (except the last, which will be lerped)
      const displayed = displayedGhostRef.current
      const incoming = ghostStroke.points
      if (incoming.length > displayed.length) {
        // Append all new points up to (but not including) the last incoming point
        for (let i = displayed.length; i < incoming.length - 1; i++) {
          displayed.push({ x: incoming[i].x, y: incoming[i].y })
        }
        // Ensure we have a slot for the last point to lerp toward
        if (displayed.length < incoming.length) {
          displayed.push({ x: displayed[displayed.length - 1].x, y: displayed[displayed.length - 1].y })
        }
      }
    }
  }, [ghostStroke])

  // RAF lerp loop for ghost stroke tip
  useEffect(() => {
    let rafId: number
    let prevTs: number | null = null

    const loop = (ts: number) => {
      if (prevTs === null) {
        prevTs = ts
      }
      const dt = ts - prevTs
      prevTs = ts

      const currentGhost = useBoardStore.getState().ghostStroke
      const displayed = displayedGhostRef.current

      if (currentGhost === null && displayed !== null) {
        displayedGhostRef.current = null
        setTick((t) => t + 1)
        rafId = requestAnimationFrame(loop)
        return
      }

      if (displayed && displayed.length > 0 && currentGhost && currentGhost.points.length > 0) {
        const alpha = 1 - Math.exp(-dt / 100)
        const targetPt = currentGhost.points[currentGhost.points.length - 1]
        const lastDisplayed = displayed[displayed.length - 1]

        const newX = lastDisplayed.x + (targetPt.x - lastDisplayed.x) * alpha
        const newY = lastDisplayed.y + (targetPt.y - lastDisplayed.y) * alpha

        if (Math.hypot(newX - targetPt.x, newY - targetPt.y) >= 0.5) {
          displayed[displayed.length - 1] = { x: newX, y: newY }
          setTick((t) => t + 1)
        }
      }

      rafId = requestAnimationFrame(loop)
    }

    rafId = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(rafId)
    }
  }, [])

  // Build the displayed ghost stroke object for rendering
  const displayedGhost: BroadcastStroke | null =
    displayedGhostRef.current && ghostStroke
      ? { color: ghostStroke.color, size: ghostStroke.size, points: displayedGhostRef.current }
      : null

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

      {/* Remote in-progress stroke (ghost) — smoothed */}
      {displayedGhost && <GhostStrokePath path={displayedGhost} />}

      {/* In-progress path */}
      {currentPath && <InProgressPathElement path={currentPath} />}
    </svg>
  )
}
