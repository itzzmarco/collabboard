'use client'

import { useState, useRef, useEffect } from 'react'
import { Palette, Trash2 } from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'
import { useBoardStore } from '@/stores/board-store'
import type { Card } from '@/types'

// ---------------------------------------------------------------------------
// Color palette
// ---------------------------------------------------------------------------

export const NOTE_COLORS = [
  { bg: '#fef9c3', border: '#fcd34d' }, // 0 Yellow
  { bg: '#dbeafe', border: '#93c5fd' }, // 1 Blue
  { bg: '#dcfce7', border: '#86efac' }, // 2 Green
  { bg: '#fce7f3', border: '#f9a8d4' }, // 3 Pink
  { bg: '#ede9fe', border: '#c4b5fd' }, // 4 Purple
  { bg: '#ffedd5', border: '#fdba74' }, // 5 Orange
] as const

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface StickyCardProps {
  card: Card
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function StickyCard({ card }: StickyCardProps) {
  // --- Store selectors ---
  const selectedCardId = useBoardStore((s) => s.selectedCardId)
  const editingCardId = useBoardStore((s) => s.editingCardId)
  const tool = useBoardStore((s) => s.tool)
  const updateCard = useBoardStore((s) => s.updateCard)
  const deleteCard = useBoardStore((s) => s.deleteCard)
  const setSelectedCard = useBoardStore((s) => s.setSelectedCard)
  const setEditingCard = useBoardStore((s) => s.setEditingCard)
  const isViewOnly = useBoardStore((s) => s.isViewOnly)

  // --- Derived state ---
  const isSelected = selectedCardId === card.id
  const isEditing = editingCardId === card.id

  // --- Local state ---
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [localContent, setLocalContent] = useState(card.content)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const reducedMotion = useReducedMotion()

  // Sync local content when the card content changes externally
  useEffect(() => {
    if (!isEditing) {
      setLocalContent(card.content)
    }
  }, [card.content, isEditing])

  // Auto-focus the textarea when entering editing mode
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus()
      const len = textareaRef.current.value.length
      textareaRef.current.setSelectionRange(len, len)
    }
  }, [isEditing])

  // Close color picker when card is deselected
  useEffect(() => {
    if (!isSelected) {
      setShowColorPicker(false)
    }
  }, [isSelected])

  // --- Color ---
  const colorIndex = card.color_index >= 0 && card.color_index < NOTE_COLORS.length
    ? card.color_index
    : 0
  const color = NOTE_COLORS[colorIndex]

  // --- Handlers ---

  const handleDoubleClick = () => {
    if (isViewOnly) return
    setEditingCard(card.id)
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (isViewOnly) return
    e.stopPropagation()
    setSelectedCard(card.id)
    setEditingCard(card.id)
  }

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value
    setLocalContent(newContent)
    updateCard(card.id, { content: newContent })
  }

  const handleBlur = () => {
    setEditingCard(null)
  }

  const handleDelete = () => {
    deleteCard(card.id)
  }

  const handleColorChange = (newIndex: number) => {
    updateCard(card.id, { color_index: newIndex })
    setShowColorPicker(false)
  }

  const handleToggleColorPicker = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowColorPicker((prev) => !prev)
  }

  // --- Shadows ---
  const boxShadow = isSelected
    ? '0 0 0 2px #3b82f6'
    : '0 1px 3px rgba(0,0,0,0.08)'

  return (
    <motion.div
      data-card-id={card.id}
      onDoubleClick={handleDoubleClick}
      onTouchEnd={handleTouchEnd}
      whileHover={{
        y: reducedMotion ? 0 : -2,
        boxShadow: reducedMotion ? boxShadow : '0 4px 12px rgba(0,0,0,0.12)',
      }}
      transition={{ duration: 0.15 }}
      style={{
        position: 'absolute',
        left: card.x,
        top: card.y,
        width: card.width,
        height: card.height,
        backgroundColor: color.bg,
        border: `1.5px solid ${color.border}`,
        borderRadius: 8,
        boxShadow,
        cursor: isEditing ? 'text' : isViewOnly ? 'default' : 'move',
        userSelect: isEditing ? 'auto' : 'none',
        WebkitUserSelect: isEditing ? 'auto' : 'none',
        overflow: 'visible',
      }}
    >
      {/* ---------- Floating action bar (when selected & not editing) ---------- */}
      {isSelected && !isEditing && !isViewOnly && (
        <div
          style={{
            position: 'absolute',
            top: -36,
            left: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            background: '#ffffff',
            borderRadius: 8,
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
            padding: '4px 4px',
            zIndex: 10,
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {/* Palette button */}
          <button
            type="button"
            onClick={handleToggleColorPicker}
            className="flex items-center justify-center w-7 h-7 rounded-md border-none bg-transparent cursor-pointer text-slate-500 transition-colors duration-150 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
            aria-label="Change color"
          >
            <Palette size={16} />
          </button>

          {/* Delete button */}
          <button
            type="button"
            onClick={handleDelete}
            className="flex items-center justify-center w-7 h-7 rounded-md border-none bg-transparent cursor-pointer text-slate-500 transition-colors duration-150 hover:bg-red-50 hover:text-red-500 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
            aria-label="Delete card"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )}

      {/* ---------- Color picker (when palette toggled) ---------- */}
      {isSelected && !isEditing && !isViewOnly && showColorPicker && (
        <div
          style={{
            position: 'absolute',
            top: -72,
            left: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: '#ffffff',
            borderRadius: 8,
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
            padding: '6px 8px',
            zIndex: 11,
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {NOTE_COLORS.map((c, i) => (
            <button
              key={i}
              onClick={() => handleColorChange(i)}
              style={{
                width: 20,
                height: 20,
                borderRadius: '50%',
                backgroundColor: c.bg,
                border: i === colorIndex
                  ? '2px solid #3b82f6'
                  : `2px solid ${c.border}`,
                cursor: 'pointer',
                padding: 0,
                flexShrink: 0,
              }}
              aria-label={`Select color ${i + 1}`}
            />
          ))}
        </div>
      )}

      {/* ---------- Content ---------- */}
      <div style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
        {isEditing ? (
          <textarea
            ref={textareaRef}
            value={localContent}
            onChange={handleContentChange}
            onBlur={handleBlur}
            onMouseDown={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.currentTarget.blur()
              }
            }}
            style={{
              width: '100%',
              height: '100%',
              padding: 12,
              fontSize: 13,
              fontWeight: 500,
              lineHeight: 1.5,
              color: '#1e293b',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              resize: 'none',
              fontFamily: 'inherit',
              whiteSpace: 'pre-wrap',
              cursor: 'text',
            }}
          />
        ) : (
          <div
            style={{
              padding: 12,
              fontSize: 13,
              fontWeight: 500,
              lineHeight: 1.5,
              whiteSpace: 'pre-wrap',
              color: '#1e293b',
              width: '100%',
              height: '100%',
              overflow: 'hidden',
              wordBreak: 'break-word',
            }}
          >
            {card.content}
          </div>
        )}
      </div>

      {/* ---------- Resize handles (when selected, not editing, select tool) ---------- */}
      {isSelected && !isEditing && !isViewOnly && tool === 'select' &&
        (['nw', 'ne', 'sw', 'se'] as const).map((handle) => {
          const posStyle: React.CSSProperties =
            handle === 'nw' ? { top: -4, left: -4, cursor: 'nw-resize' }
            : handle === 'ne' ? { top: -4, right: -4, cursor: 'ne-resize' }
            : handle === 'sw' ? { bottom: -4, left: -4, cursor: 'sw-resize' }
            : { bottom: -4, right: -4, cursor: 'se-resize' }
          return (
            <div
              key={handle}
              data-resize-handle={handle}
              data-card-id={card.id}
              style={{
                position: 'absolute',
                width: 10,
                height: 10,
                background: '#ffffff',
                border: '2px solid #3b82f6',
                borderRadius: 2,
                zIndex: 12,
                ...posStyle,
              }}
            />
          )
        })
      }
    </motion.div>
  )
}
