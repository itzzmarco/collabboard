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
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'

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
  const reducedMotion = useReducedMotion()

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
      className={cn(
        'fixed bottom-0 left-0 right-0 z-10',
        'flex flex-row items-center justify-around',
        'glass-surface pb-safe border-t py-1 px-2',
        'sm:relative sm:bottom-auto sm:left-auto sm:right-auto',
        'sm:flex-col sm:justify-start',
        'sm:bg-white sm:backdrop-filter-none',
        'sm:border-r sm:border-t-0',
        'sm:py-3 sm:gap-1 sm:w-[52px]',
      )}
    >
      {/* ---- Tool Buttons ---- */}
      {TOOLS.map(({ id, icon: Icon, label, shortcut }) => {
        const isActive = tool === id
        return (
          <div key={id} className="relative">
            {isActive && !reducedMotion && (
              <motion.div
                layoutId="active-tool-pill"
                className="absolute inset-0 rounded-lg bg-blue-50"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
            <motion.button
              title={`${label} (${shortcut})`}
              onClick={() => handleToolClick(id)}
              whileHover={{ scale: reducedMotion ? 1 : 1.08 }}
              whileTap={{ scale: reducedMotion ? 1 : 0.92 }}
              className={cn(
                'relative flex items-center justify-center rounded-lg transition w-11 h-11 sm:w-9 sm:h-9',
                isActive
                  ? 'text-primary'
                  : 'text-muted hover:text-foreground hover:bg-slate-100',
                reducedMotion && isActive && 'bg-blue-50'
              )}
            >
              <Icon size={18} />
            </motion.button>
          </div>
        )
      })}

      {/* ---- Drawing Options Panel ---- */}
      <AnimatePresence>
      {tool === 'draw' && (
        <motion.div
          initial={reducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
          transition={{ duration: reducedMotion ? 0 : 0.15 }}
          className={cn(
            'absolute bottom-full left-0 right-0 z-20',
            'flex flex-row flex-wrap items-center justify-center gap-2',
            'bg-white border-t border-b px-3 py-2',
            'sm:relative sm:bottom-auto sm:flex-col sm:border-t sm:border-b-0 sm:mt-2 sm:pt-2 sm:w-full sm:px-2',
          )}
        >
          {/* Color buttons */}
          <div className="flex flex-wrap justify-center gap-1">
            {DRAW_COLORS.map((color) => {
              const isSelected = drawingOptions.color === color
              return (
                <button
                  key={color}
                  title={color}
                  onClick={() => setDrawingOptions({ color })}
                  className="flex items-center justify-center rounded transition w-11 h-11 sm:w-[18px] sm:h-[18px]"
                >
                  <span
                    className="block rounded w-5 h-5 sm:w-full sm:h-full"
                    style={{
                      backgroundColor: color,
                      border: isSelected
                        ? '2px solid #3b82f6'
                        : '2px solid transparent',
                    }}
                  />
                </button>
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
                    'flex items-center justify-center rounded-lg transition w-11 h-11 sm:w-6 sm:h-6',
                    isSelected ? 'bg-blue-50' : 'hover:bg-slate-100',
                  )}
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
            className="flex items-center justify-center rounded-lg text-muted hover:text-foreground hover:bg-slate-100 transition w-11 h-11 sm:w-9 sm:h-9"
          >
            <Eraser size={18} />
          </button>
        </motion.div>
      )}
      </AnimatePresence>

      {/* ---- Spacer ---- */}
      <div className="hidden sm:flex flex-1" />

      {/* ---- Zoom Controls ---- */}
      <div className="flex flex-row sm:flex-col items-center gap-1 border-l sm:border-l-0 sm:border-t pl-2 sm:pl-0 sm:pt-2 sm:w-full">
        <motion.button
          title="Zoom in"
          onClick={handleZoomIn}
          whileHover={{ scale: reducedMotion ? 1 : 1.08 }}
          whileTap={{ scale: reducedMotion ? 1 : 0.92 }}
          className="flex items-center justify-center rounded-lg text-muted hover:text-foreground hover:bg-slate-100 transition w-11 h-11 sm:w-9 sm:h-9"
        >
          <ZoomIn size={18} />
        </motion.button>

        <span
          className="text-muted text-center select-none"
          style={{ fontSize: 10 }}
        >
          {Math.round(zoom * 100)}%
        </span>

        <motion.button
          title="Zoom out"
          onClick={handleZoomOut}
          whileHover={{ scale: reducedMotion ? 1 : 1.08 }}
          whileTap={{ scale: reducedMotion ? 1 : 0.92 }}
          className="flex items-center justify-center rounded-lg text-muted hover:text-foreground hover:bg-slate-100 transition w-11 h-11 sm:w-9 sm:h-9"
        >
          <ZoomOut size={18} />
        </motion.button>

        <motion.button
          title="Reset view"
          onClick={handleZoomReset}
          whileHover={{ scale: reducedMotion ? 1 : 1.08 }}
          whileTap={{ scale: reducedMotion ? 1 : 0.92 }}
          className="flex items-center justify-center rounded-lg text-muted hover:text-foreground hover:bg-slate-100 transition w-11 h-11 sm:w-9 sm:h-9"
        >
          <Maximize2 size={18} />
        </motion.button>
      </div>
    </aside>
  )
}
