'use client'

import {
  MousePointer2,
  Hand,
  StickyNote,
  Pencil,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Eraser,
} from 'lucide-react'
import { useBoardStore, DRAW_COLORS } from '@/stores/board-store'
import type { Tool } from '@/stores/board-store'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BRUSH_SIZES = [2, 4, 6] as const

const TOOLS: Array<{
  id: Tool
  icon: typeof MousePointer2
  label: string
  shortcut: string
}> = [
  { id: 'select', icon: MousePointer2, label: 'Select', shortcut: 'V' },
  { id: 'pan', icon: Hand, label: 'Pan', shortcut: 'H' },
  { id: 'sticky', icon: StickyNote, label: 'Sticky Note', shortcut: 'N' },
  { id: 'draw', icon: Pencil, label: 'Draw', shortcut: 'D' },
]

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ToolbarProps {
  onAddCard: () => void
  onClearPaths: () => void
}

// ---------------------------------------------------------------------------
// Toolbar Component
// ---------------------------------------------------------------------------

export default function Toolbar({ onAddCard, onClearPaths }: ToolbarProps) {
  const isViewOnly = useBoardStore((s) => s.isViewOnly)
  const tool = useBoardStore((s) => s.tool)
  const zoom = useBoardStore((s) => s.zoom)
  const drawingOptions = useBoardStore((s) => s.drawingOptions)
  const setTool = useBoardStore((s) => s.setTool)
  const setZoom = useBoardStore((s) => s.setZoom)
  const setPan = useBoardStore((s) => s.setPan)
  const setDrawingOptions = useBoardStore((s) => s.setDrawingOptions)

  const handleToolClick = (toolId: Tool) => {
    if (toolId === 'sticky') {
      onAddCard()
      return
    }
    setTool(toolId)
  }

  const handleZoomIn = () => {
    setZoom(zoom + 0.1)
  }

  const handleZoomOut = () => {
    setZoom(zoom - 0.1)
  }

  const handleZoomReset = () => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }

  // Hide entire toolbar in view-only mode
  if (isViewOnly) return null

  return (
    <aside
      className="flex flex-col items-center bg-white border-r py-3 gap-1"
      style={{ width: 52 }}
    >
      {/* ---- Tool Buttons ---- */}
      {TOOLS.map(({ id, icon: Icon, label, shortcut }) => {
        const isActive = tool === id
        return (
          <button
            key={id}
            title={`${label} (${shortcut})`}
            onClick={() => handleToolClick(id)}
            className={cn(
              'flex items-center justify-center rounded-lg transition',
              isActive
                ? 'text-primary bg-blue-50'
                : 'text-muted hover:text-foreground hover:bg-slate-100',
            )}
            style={{ width: 36, height: 36 }}
          >
            <Icon size={18} />
          </button>
        )
      })}

      {/* ---- Drawing Options Panel ---- */}
      {tool === 'draw' && (
        <div className="flex flex-col items-center gap-2 border-t mt-2 pt-2 w-full px-2">
          {/* Color buttons */}
          <div className="flex flex-wrap justify-center gap-1">
            {DRAW_COLORS.map((color) => {
              const isSelected = drawingOptions.color === color
              return (
                <button
                  key={color}
                  title={color}
                  onClick={() => setDrawingOptions({ color })}
                  className="rounded transition"
                  style={{
                    width: 18,
                    height: 18,
                    backgroundColor: color,
                    border: isSelected
                      ? '2px solid #3b82f6'
                      : '2px solid transparent',
                  }}
                />
              )
            })}
          </div>

          {/* Brush size buttons */}
          <div className="flex justify-center gap-1">
            {BRUSH_SIZES.map((size) => {
              const isSelected = drawingOptions.size === size
              return (
                <button
                  key={size}
                  title={`Size ${size}`}
                  onClick={() => setDrawingOptions({ size })}
                  className={cn(
                    'flex items-center justify-center rounded-lg transition',
                    isSelected ? 'bg-blue-50' : 'hover:bg-slate-100',
                  )}
                  style={{ width: 24, height: 24 }}
                >
                  <span
                    className="rounded-full bg-current"
                    style={{
                      width: size + 2,
                      height: size + 2,
                    }}
                  />
                </button>
              )
            })}
          </div>

          {/* Eraser / Clear button */}
          <button
            title="Clear all drawings"
            onClick={onClearPaths}
            className="flex items-center justify-center rounded-lg text-muted hover:text-foreground hover:bg-slate-100 transition"
            style={{ width: 36, height: 36 }}
          >
            <Eraser size={18} />
          </button>
        </div>
      )}

      {/* ---- Spacer ---- */}
      <div className="flex-1" />

      {/* ---- Zoom Controls ---- */}
      <div className="flex flex-col items-center gap-1 border-t pt-2 w-full">
        <button
          title="Zoom in"
          onClick={handleZoomIn}
          className="flex items-center justify-center rounded-lg text-muted hover:text-foreground hover:bg-slate-100 transition"
          style={{ width: 36, height: 36 }}
        >
          <ZoomIn size={18} />
        </button>

        <span
          className="text-muted text-center select-none"
          style={{ fontSize: 10 }}
        >
          {Math.round(zoom * 100)}%
        </span>

        <button
          title="Zoom out"
          onClick={handleZoomOut}
          className="flex items-center justify-center rounded-lg text-muted hover:text-foreground hover:bg-slate-100 transition"
          style={{ width: 36, height: 36 }}
        >
          <ZoomOut size={18} />
        </button>

        <button
          title="Reset view"
          onClick={handleZoomReset}
          className="flex items-center justify-center rounded-lg text-muted hover:text-foreground hover:bg-slate-100 transition"
          style={{ width: 36, height: 36 }}
        >
          <Maximize2 size={18} />
        </button>
      </div>
    </aside>
  )
}
