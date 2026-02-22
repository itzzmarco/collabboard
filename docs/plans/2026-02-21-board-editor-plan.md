# T5: Board Editor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the core board editor with full canvas interaction, Zustand store, and optimistic persistence to Supabase.

**Architecture:** DOM-based canvas with SVG drawing layer, single Zustand store (`useBoardStore`), client-side Supabase persistence with optimistic updates. Server component fetches initial data, client component handles all interactions.

**Tech Stack:** Next.js 15 (App Router), React 19, Zustand 5, Supabase browser client, Tailwind CSS 4, lucide-react

---

### Task 1: Zustand Board Store

**Files:**
- Create: `src/stores/board-store.ts`
- Reference: `src/types/index.ts` (Card, DrawingPath, Board interfaces)

**Step 1: Create the store file with all state and actions**

```typescript
// src/stores/board-store.ts
import { create } from 'zustand'
import type { Board, Card, DrawingPath } from '@/types'

export type Tool = 'select' | 'pan' | 'draw' | 'sticky'
export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export interface DrawingOptions {
  color: string
  size: number
  eraser: boolean
}

export interface InProgressPath {
  color: string
  size: number
  points: Array<{ x: number; y: number }>
}

interface BoardState {
  // Data
  board: Board | null
  cards: Card[]
  paths: DrawingPath[]

  // UI state
  selectedCardId: string | null
  editingCardId: string | null
  tool: Tool
  zoom: number
  pan: { x: number; y: number }
  saveStatus: SaveStatus
  drawingOptions: DrawingOptions
  isDrawing: boolean
  currentPath: InProgressPath | null

  // Actions
  hydrate: (board: Board, cards: Card[], paths: DrawingPath[]) => void
  addCard: (card: Card) => void
  updateCard: (id: string, partial: Partial<Card>) => void
  deleteCard: (id: string) => void
  addPath: (path: DrawingPath) => void
  clearPaths: () => void
  setTool: (tool: Tool) => void
  setZoom: (zoom: number) => void
  setPan: (pan: { x: number; y: number }) => void
  setSelectedCard: (id: string | null) => void
  setEditingCard: (id: string | null) => void
  updateBoardTitle: (title: string) => void
  setSaveStatus: (status: SaveStatus) => void
  setDrawingOptions: (partial: Partial<DrawingOptions>) => void
  startDrawing: (point: { x: number; y: number }) => void
  continueDrawing: (point: { x: number; y: number }) => void
  finishDrawing: () => DrawingPath | null
  applyRemoteUpdate: (cards: Card[], paths: DrawingPath[]) => void
}

const DRAW_COLORS = ['#1e293b', '#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6']

export const useBoardStore = create<BoardState>((set, get) => ({
  // Initial state
  board: null,
  cards: [],
  paths: [],
  selectedCardId: null,
  editingCardId: null,
  tool: 'select',
  zoom: 1,
  pan: { x: 0, y: 0 },
  saveStatus: 'idle',
  drawingOptions: { color: DRAW_COLORS[0], size: 2, eraser: false },
  isDrawing: false,
  currentPath: null,

  hydrate: (board, cards, paths) => set({ board, cards, paths }),

  addCard: (card) => set((s) => ({ cards: [...s.cards, card] })),

  updateCard: (id, partial) =>
    set((s) => ({
      cards: s.cards.map((c) => (c.id === id ? { ...c, ...partial, updated_at: new Date().toISOString() } : c)),
    })),

  deleteCard: (id) =>
    set((s) => ({
      cards: s.cards.filter((c) => c.id !== id),
      selectedCardId: s.selectedCardId === id ? null : s.selectedCardId,
      editingCardId: s.editingCardId === id ? null : s.editingCardId,
    })),

  addPath: (path) => set((s) => ({ paths: [...s.paths, path] })),

  clearPaths: () => set({ paths: [] }),

  setTool: (tool) => set({ tool, selectedCardId: tool !== 'select' ? null : get().selectedCardId }),

  setZoom: (zoom) => set({ zoom: Math.min(2, Math.max(0.25, zoom)) }),

  setPan: (pan) => set({ pan }),

  setSelectedCard: (id) => set({ selectedCardId: id }),

  setEditingCard: (id) => set({ editingCardId: id }),

  updateBoardTitle: (title) =>
    set((s) => (s.board ? { board: { ...s.board, title, updated_at: new Date().toISOString() } } : {})),

  setSaveStatus: (saveStatus) => set({ saveStatus }),

  setDrawingOptions: (partial) =>
    set((s) => ({ drawingOptions: { ...s.drawingOptions, ...partial } })),

  startDrawing: (point) =>
    set((s) => ({
      isDrawing: true,
      currentPath: { color: s.drawingOptions.color, size: s.drawingOptions.size, points: [point] },
    })),

  continueDrawing: (point) =>
    set((s) => {
      if (!s.currentPath) return {}
      return { currentPath: { ...s.currentPath, points: [...s.currentPath.points, point] } }
    }),

  finishDrawing: () => {
    const { currentPath, board } = get()
    if (!currentPath || currentPath.points.length < 2 || !board) {
      set({ isDrawing: false, currentPath: null })
      return null
    }
    const newPath: DrawingPath = {
      id: crypto.randomUUID(),
      board_id: board.id,
      color: currentPath.color,
      size: currentPath.size,
      points: currentPath.points,
      client_mutation_id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    }
    set((s) => ({
      paths: [...s.paths, newPath],
      isDrawing: false,
      currentPath: null,
    }))
    return newPath
  },

  applyRemoteUpdate: (cards, paths) => set({ cards, paths }),
}))

export { DRAW_COLORS }
```

**Step 2: Verify the file compiles**

Run: `cd /c/Users/itzzm/OneDrive/Desktop/31DayNicheBlitz/apps/13-collab-board/collab-board-app && npx tsc --noEmit src/stores/board-store.ts 2>&1 | head -20`

If there are import path issues with `@/types`, just ensure the store file is saved. Full type-checking will come when we run `npm run build` later.

**Step 3: Commit**

```bash
git add src/stores/board-store.ts
git commit -m "feat(board): add Zustand board store with all state and actions"
```

---

### Task 2: Persistence Layer

**Files:**
- Create: `src/lib/board-persistence.ts`
- Reference: `src/lib/supabase/client.ts`, `src/types/index.ts`

**Step 1: Create persistence functions**

```typescript
// src/lib/board-persistence.ts
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Card, DrawingPath } from '@/types'

export async function saveCard(
  supabase: SupabaseClient,
  card: Card
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('cards').upsert({
    id: card.id,
    board_id: card.board_id,
    type: card.type,
    x: card.x,
    y: card.y,
    width: card.width,
    height: card.height,
    content: card.content,
    color_index: card.color_index,
    client_mutation_id: card.client_mutation_id,
  })
  return { error: error?.message ?? null }
}

export async function deleteCardFromDB(
  supabase: SupabaseClient,
  cardId: string
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('cards').delete().eq('id', cardId)
  return { error: error?.message ?? null }
}

export async function savePath(
  supabase: SupabaseClient,
  path: DrawingPath
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('drawing_paths').insert({
    id: path.id,
    board_id: path.board_id,
    color: path.color,
    size: path.size,
    points: path.points,
    client_mutation_id: path.client_mutation_id,
  })
  return { error: error?.message ?? null }
}

export async function deletePathsFromDB(
  supabase: SupabaseClient,
  boardId: string
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('drawing_paths').delete().eq('board_id', boardId)
  return { error: error?.message ?? null }
}

export async function updateBoardTitleInDB(
  supabase: SupabaseClient,
  boardId: string,
  title: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('boards')
    .update({ title, updated_at: new Date().toISOString() })
    .eq('id', boardId)
  return { error: error?.message ?? null }
}

export async function fetchBoardData(
  supabase: SupabaseClient,
  boardId: string
): Promise<{
  cards: Card[]
  paths: DrawingPath[]
  error: string | null
}> {
  const [cardsRes, pathsRes] = await Promise.all([
    supabase.from('cards').select('*').eq('board_id', boardId),
    supabase.from('drawing_paths').select('*').eq('board_id', boardId),
  ])
  if (cardsRes.error || pathsRes.error) {
    return { cards: [], paths: [], error: cardsRes.error?.message ?? pathsRes.error?.message ?? 'Fetch failed' }
  }
  return { cards: cardsRes.data as Card[], paths: pathsRes.data as DrawingPath[], error: null }
}
```

**Step 2: Commit**

```bash
git add src/lib/board-persistence.ts
git commit -m "feat(board): add Supabase persistence layer for cards, paths, and board title"
```

---

### Task 3: SVGDrawingLayer Component

**Files:**
- Create: `src/components/board/SVGDrawingLayer.tsx`
- Reference: `src/stores/board-store.ts`

**Step 1: Create the SVG drawing layer**

```tsx
// src/components/board/SVGDrawingLayer.tsx
'use client'

import { useBoardStore } from '@/stores/board-store'
import type { DrawingPath } from '@/types'
import type { InProgressPath } from '@/stores/board-store'

function buildPathD(points: Array<{ x: number; y: number }>): string {
  if (points.length < 2) return ''
  let d = `M ${points[0].x} ${points[0].y}`
  for (let i = 1; i < points.length; i++) {
    d += ` L ${points[i].x} ${points[i].y}`
  }
  return d
}

function CommittedPath({ path }: { path: DrawingPath }) {
  const d = buildPathD(path.points)
  if (!d) return null
  return (
    <path
      d={d}
      stroke={path.color}
      strokeWidth={path.size}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  )
}

function InProgressPathEl({ path }: { path: InProgressPath }) {
  const d = buildPathD(path.points)
  if (!d) return null
  return (
    <path
      d={d}
      stroke={path.color}
      strokeWidth={path.size}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity={0.7}
    />
  )
}

export default function SVGDrawingLayer() {
  const paths = useBoardStore((s) => s.paths)
  const currentPath = useBoardStore((s) => s.currentPath)
  const tool = useBoardStore((s) => s.tool)

  return (
    <svg
      className={`absolute inset-0 w-full h-full ${tool === 'draw' ? 'pointer-events-auto cursor-crosshair' : 'pointer-events-none'}`}
      style={{ minWidth: '4000px', minHeight: '4000px' }}
    >
      {paths.map((p) => (
        <CommittedPath key={p.id} path={p} />
      ))}
      {currentPath && <InProgressPathEl path={currentPath} />}
    </svg>
  )
}
```

**Step 2: Commit**

```bash
git add src/components/board/SVGDrawingLayer.tsx
git commit -m "feat(board): add SVG drawing layer for freehand paths"
```

---

### Task 4: StickyCard Component

**Files:**
- Create: `src/components/board/StickyCard.tsx`
- Reference: `src/stores/board-store.ts`, `src/types/index.ts`

**Step 1: Create the sticky card component**

```tsx
// src/components/board/StickyCard.tsx
'use client'

import { useRef, useEffect } from 'react'
import { Palette, Trash2 } from 'lucide-react'
import { useBoardStore } from '@/stores/board-store'
import type { Card } from '@/types'

const NOTE_COLORS = [
  { name: 'Yellow', bg: '#fef9c3', border: '#fcd34d' },
  { name: 'Blue', bg: '#dbeafe', border: '#93c5fd' },
  { name: 'Green', bg: '#dcfce7', border: '#86efac' },
  { name: 'Pink', bg: '#fce7f3', border: '#f9a8d4' },
  { name: 'Purple', bg: '#ede9fe', border: '#c4b5fd' },
  { name: 'Orange', bg: '#ffedd5', border: '#fdba74' },
]

export { NOTE_COLORS }

interface StickyCardProps {
  card: Card
  onPersistUpdate: (id: string, partial: Partial<Card>) => void
  onPersistDelete: (id: string) => void
}

export default function StickyCard({ card, onPersistUpdate, onPersistDelete }: StickyCardProps) {
  const selectedCardId = useBoardStore((s) => s.selectedCardId)
  const editingCardId = useBoardStore((s) => s.editingCardId)
  const updateCard = useBoardStore((s) => s.updateCard)
  const deleteCard = useBoardStore((s) => s.deleteCard)
  const setSelectedCard = useBoardStore((s) => s.setSelectedCard)
  const setEditingCard = useBoardStore((s) => s.setEditingCard)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const showColorPickerRef = useRef(false)
  const [showColorPicker, setShowColorPicker] = React.useState(false)

  const isSelected = selectedCardId === card.id
  const isEditing = editingCardId === card.id
  const colorStyle = NOTE_COLORS[card.color_index] || NOTE_COLORS[0]

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.select()
    }
  }, [isEditing])

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingCard(card.id)
  }

  const handleBlur = () => {
    setEditingCard(null)
    onPersistUpdate(card.id, { content: card.content })
  }

  const handleContentChange = (content: string) => {
    updateCard(card.id, { content })
  }

  const handleColorSelect = (colorIndex: number) => {
    updateCard(card.id, { color_index: colorIndex })
    onPersistUpdate(card.id, { color_index: colorIndex })
    setShowColorPicker(false)
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    deleteCard(card.id)
    onPersistDelete(card.id)
  }

  return (
    <div
      data-card-id={card.id}
      className="absolute select-none"
      style={{
        left: card.x,
        top: card.y,
        width: card.width,
        height: card.height,
        background: colorStyle.bg,
        border: `1px solid ${colorStyle.border}`,
        borderRadius: '8px',
        cursor: isEditing ? 'text' : 'move',
        boxShadow: isSelected
          ? '0 0 0 2px #3b82f6, 0 4px 12px rgba(0,0,0,0.1)'
          : '0 1px 3px rgba(0,0,0,0.08)',
        transition: 'box-shadow 0.15s ease',
      }}
      onDoubleClick={handleDoubleClick}
    >
      {isEditing ? (
        <textarea
          ref={textareaRef}
          className="w-full h-full resize-none border-none outline-none bg-transparent"
          style={{
            padding: '12px',
            color: '#1e293b',
            fontSize: '13px',
            fontWeight: 500,
            lineHeight: 1.5,
            fontFamily: 'inherit',
          }}
          value={card.content}
          onChange={(e) => handleContentChange(e.target.value)}
          onBlur={handleBlur}
          onMouseDown={(e) => e.stopPropagation()}
        />
      ) : (
        <div
          style={{
            padding: '12px',
            color: '#1e293b',
            fontSize: '13px',
            fontWeight: 500,
            whiteSpace: 'pre-wrap',
            height: '100%',
            overflow: 'hidden',
            lineHeight: 1.5,
          }}
        >
          {card.content}
        </div>
      )}

      {/* Floating action bar */}
      {isSelected && !isEditing && (
        <div
          className="absolute flex gap-1 bg-white rounded-lg p-1 border border-border"
          style={{ top: '-36px', left: 0, boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }}
        >
          <button
            className="w-7 h-7 rounded-md flex items-center justify-center text-muted hover:text-foreground hover:bg-slate-100 transition-colors"
            onClick={(e) => { e.stopPropagation(); setShowColorPicker(!showColorPicker) }}
            title="Change Color"
          >
            <Palette size={14} />
          </button>
          <button
            className="w-7 h-7 rounded-md flex items-center justify-center text-muted hover:text-red-500 hover:bg-red-50 transition-colors"
            onClick={handleDelete}
            title="Delete"
          >
            <Trash2 size={14} />
          </button>
        </div>
      )}

      {/* Color picker */}
      {showColorPicker && isSelected && (
        <div
          className="absolute flex gap-1.5 bg-white rounded-lg p-2 border border-border"
          style={{ top: '-72px', left: 0, boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }}
        >
          {NOTE_COLORS.map((color, index) => (
            <div
              key={index}
              className="w-5 h-5 rounded-md cursor-pointer transition-transform hover:scale-110"
              style={{
                background: color.bg,
                border: card.color_index === index ? '2px solid #3b82f6' : '2px solid transparent',
              }}
              onClick={(e) => { e.stopPropagation(); handleColorSelect(index) }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
```

**Important:** The above code uses `React.useState` — you'll need to add `import React` or destructure `useState`. Fix during implementation: use `import { useRef, useEffect, useState } from 'react'` and replace `React.useState` with `useState`.

**Step 2: Commit**

```bash
git add src/components/board/StickyCard.tsx
git commit -m "feat(board): add StickyCard component with edit, color, and delete"
```

---

### Task 5: Toolbar Component

**Files:**
- Create: `src/components/board/Toolbar.tsx`
- Reference: `src/stores/board-store.ts`

**Step 1: Create the toolbar**

```tsx
// src/components/board/Toolbar.tsx
'use client'

import { MousePointer2, Hand, StickyNote, Pencil, ZoomIn, ZoomOut, Maximize2, Eraser } from 'lucide-react'
import { useBoardStore, DRAW_COLORS } from '@/stores/board-store'
import type { Tool } from '@/stores/board-store'

const TOOLS: { tool: Tool; icon: typeof MousePointer2; label: string; shortcut: string }[] = [
  { tool: 'select', icon: MousePointer2, label: 'Select', shortcut: 'V' },
  { tool: 'pan', icon: Hand, label: 'Pan', shortcut: 'H' },
  { tool: 'sticky', icon: StickyNote, label: 'Add Note', shortcut: 'N' },
  { tool: 'draw', icon: Pencil, label: 'Draw', shortcut: 'D' },
]

const BRUSH_SIZES = [2, 4, 6]

interface ToolbarProps {
  onAddCard: () => void
  onClearPaths: () => void
}

export default function Toolbar({ onAddCard, onClearPaths }: ToolbarProps) {
  const tool = useBoardStore((s) => s.tool)
  const zoom = useBoardStore((s) => s.zoom)
  const drawingOptions = useBoardStore((s) => s.drawingOptions)
  const setTool = useBoardStore((s) => s.setTool)
  const setZoom = useBoardStore((s) => s.setZoom)
  const setPan = useBoardStore((s) => s.setPan)
  const setDrawingOptions = useBoardStore((s) => s.setDrawingOptions)

  const handleToolClick = (t: Tool) => {
    if (t === 'sticky') {
      onAddCard()
    } else {
      setTool(t)
    }
  }

  return (
    <aside className="w-[52px] border-r border-border bg-white flex flex-col items-center py-3 gap-1 shrink-0">
      {TOOLS.map(({ tool: t, icon: Icon, label, shortcut }) => (
        <button
          key={t}
          className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
            tool === t ? 'text-primary bg-blue-50' : 'text-muted hover:text-foreground hover:bg-slate-100'
          }`}
          onClick={() => handleToolClick(t)}
          title={`${label} (${shortcut})`}
        >
          <Icon size={18} />
        </button>
      ))}

      {/* Drawing options */}
      {tool === 'draw' && (
        <div className="mt-2 pt-2 border-t border-border flex flex-col gap-1.5 items-center">
          {DRAW_COLORS.map((color) => (
            <button
              key={color}
              className="w-[18px] h-[18px] rounded transition-transform hover:scale-110"
              style={{
                background: color,
                border: drawingOptions.color === color ? '2px solid #3b82f6' : '2px solid transparent',
              }}
              onClick={() => setDrawingOptions({ color })}
            />
          ))}
          <div className="mt-1 flex flex-col gap-0.5">
            {BRUSH_SIZES.map((size) => (
              <button
                key={size}
                className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors ${
                  drawingOptions.size === size ? 'bg-blue-50' : 'hover:bg-slate-100'
                }`}
                onClick={() => setDrawingOptions({ size })}
              >
                <div
                  className="rounded-full bg-muted"
                  style={{ width: size + 2, height: size + 2 }}
                />
              </button>
            ))}
          </div>
          <button
            className="w-9 h-9 rounded-lg flex items-center justify-center text-muted hover:text-foreground hover:bg-slate-100 transition-all mt-1"
            onClick={onClearPaths}
            title="Clear drawings"
          >
            <Eraser size={16} />
          </button>
        </div>
      )}

      <div className="flex-1" />

      {/* Zoom controls */}
      <div className="flex flex-col gap-1 border-t border-border pt-3">
        <button
          className="w-9 h-9 rounded-lg flex items-center justify-center text-muted hover:text-foreground hover:bg-slate-100 transition-all"
          onClick={() => setZoom(zoom + 0.1)}
          title="Zoom In"
        >
          <ZoomIn size={16} />
        </button>
        <span className="text-muted text-[10px] text-center font-medium">
          {Math.round(zoom * 100)}%
        </span>
        <button
          className="w-9 h-9 rounded-lg flex items-center justify-center text-muted hover:text-foreground hover:bg-slate-100 transition-all"
          onClick={() => setZoom(zoom - 0.1)}
          title="Zoom Out"
        >
          <ZoomOut size={16} />
        </button>
        <button
          className="w-9 h-9 rounded-lg flex items-center justify-center text-muted hover:text-foreground hover:bg-slate-100 transition-all"
          onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }) }}
          title="Reset View"
        >
          <Maximize2 size={16} />
        </button>
      </div>
    </aside>
  )
}
```

**Step 2: Commit**

```bash
git add src/components/board/Toolbar.tsx
git commit -m "feat(board): add Toolbar with tool selection, drawing options, and zoom"
```

---

### Task 6: BoardHeader Component

**Files:**
- Create: `src/components/board/BoardHeader.tsx`
- Reference: `src/stores/board-store.ts`

**Step 1: Create the board header**

```tsx
// src/components/board/BoardHeader.tsx
'use client'

import { useRef, useEffect, useCallback } from 'react'
import { LayoutGrid, Share2, Download, Check, Loader2 } from 'lucide-react'
import { useBoardStore } from '@/stores/board-store'

interface BoardHeaderProps {
  onTitleSave: (title: string) => void
}

export default function BoardHeader({ onTitleSave }: BoardHeaderProps) {
  const board = useBoardStore((s) => s.board)
  const saveStatus = useBoardStore((s) => s.saveStatus)
  const updateBoardTitle = useBoardStore((s) => s.updateBoardTitle)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const title = e.target.value
    updateBoardTitle(title)

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      onTitleSave(title)
    }, 500)
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  return (
    <header
      className="h-[52px] border-b border-border bg-white flex items-center justify-between px-4 shrink-0"
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)' }}
    >
      <div className="flex items-center gap-3">
        <div className="w-7 h-7 rounded-md bg-background border border-border flex items-center justify-center text-muted">
          <LayoutGrid size={14} />
        </div>
        <input
          type="text"
          className="bg-transparent border-none outline-none text-sm font-semibold text-foreground w-[200px] px-2 py-1 rounded-md transition-colors hover:bg-slate-100 focus:bg-slate-100"
          value={board?.title ?? ''}
          onChange={handleTitleChange}
          placeholder="Untitled Board"
        />
        {/* Save status */}
        <div className="flex items-center gap-1 text-xs text-muted">
          {saveStatus === 'saving' && (
            <>
              <Loader2 size={12} className="animate-spin" />
              <span>Saving...</span>
            </>
          )}
          {saveStatus === 'saved' && (
            <>
              <Check size={12} className="text-green-600" />
              <span className="text-green-600">Saved</span>
            </>
          )}
          {saveStatus === 'error' && (
            <span className="text-red-500">Save failed</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-muted hover:text-foreground hover:bg-slate-100 transition-colors"
          disabled
          title="Export (coming soon)"
        >
          <Download size={14} />
          Export
        </button>
        <button
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:bg-primary-hover transition-colors"
          disabled
          title="Share (coming soon)"
        >
          <Share2 size={14} />
          Share
        </button>
      </div>
    </header>
  )
}
```

**Step 2: Commit**

```bash
git add src/components/board/BoardHeader.tsx
git commit -m "feat(board): add BoardHeader with editable title and save status"
```

---

### Task 7: Canvas Component

**Files:**
- Create: `src/components/board/Canvas.tsx`
- Reference: `src/stores/board-store.ts`, `src/components/board/SVGDrawingLayer.tsx`, `src/components/board/StickyCard.tsx`

**Step 1: Create the canvas with all mouse event handling**

```tsx
// src/components/board/Canvas.tsx
'use client'

import { useRef, useCallback } from 'react'
import { useBoardStore } from '@/stores/board-store'
import SVGDrawingLayer from './SVGDrawingLayer'
import StickyCard from './StickyCard'
import type { Card } from '@/types'

interface CanvasProps {
  onPersistCardUpdate: (id: string, partial: Partial<Card>) => void
  onPersistCardDelete: (id: string) => void
  onPathCommitted: () => void
}

export default function Canvas({ onPersistCardUpdate, onPersistCardDelete, onPathCommitted }: CanvasProps) {
  const cards = useBoardStore((s) => s.cards)
  const tool = useBoardStore((s) => s.tool)
  const zoom = useBoardStore((s) => s.zoom)
  const pan = useBoardStore((s) => s.pan)
  const selectedCardId = useBoardStore((s) => s.selectedCardId)
  const setSelectedCard = useBoardStore((s) => s.setSelectedCard)
  const setEditingCard = useBoardStore((s) => s.setEditingCard)
  const updateCard = useBoardStore((s) => s.updateCard)
  const setPan = useBoardStore((s) => s.setPan)
  const startDrawing = useBoardStore((s) => s.startDrawing)
  const continueDrawing = useBoardStore((s) => s.continueDrawing)
  const finishDrawing = useBoardStore((s) => s.finishDrawing)
  const setZoom = useBoardStore((s) => s.setZoom)

  const boardRef = useRef<HTMLDivElement>(null)
  const draggingRef = useRef<{ cardId: string; offsetX: number; offsetY: number } | null>(null)
  const panningRef = useRef<{ startX: number; startY: number } | null>(null)
  const drawingRef = useRef(false)

  const toCanvasCoords = useCallback(
    (clientX: number, clientY: number) => {
      if (!boardRef.current) return { x: 0, y: 0 }
      const rect = boardRef.current.getBoundingClientRect()
      return {
        x: (clientX - rect.left - pan.x) / zoom,
        y: (clientY - rect.top - pan.y) / zoom,
      }
    },
    [zoom, pan]
  )

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement

      // If clicking on a card (data-card-id) while in select mode
      const cardEl = target.closest('[data-card-id]') as HTMLElement | null
      if (cardEl && tool === 'select') {
        const cardId = cardEl.dataset.cardId!
        const rect = cardEl.getBoundingClientRect()
        draggingRef.current = {
          cardId,
          offsetX: e.clientX - rect.left,
          offsetY: e.clientY - rect.top,
        }
        setSelectedCard(cardId)
        return
      }

      // Draw
      if (tool === 'draw') {
        const coords = toCanvasCoords(e.clientX, e.clientY)
        startDrawing(coords)
        drawingRef.current = true
        return
      }

      // Pan
      if (tool === 'pan' || e.button === 1) {
        panningRef.current = { startX: e.clientX, startY: e.clientY }
        return
      }

      // Deselect
      if (tool === 'select') {
        setSelectedCard(null)
        setEditingCard(null)
      }
    },
    [tool, toCanvasCoords, startDrawing, setSelectedCard, setEditingCard]
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      // Card dragging
      if (draggingRef.current) {
        const coords = toCanvasCoords(
          e.clientX - draggingRef.current.offsetX + (draggingRef.current.offsetX / zoom),
          e.clientY - draggingRef.current.offsetY + (draggingRef.current.offsetY / zoom)
        )
        // Simpler: just compute position directly
        if (!boardRef.current) return
        const rect = boardRef.current.getBoundingClientRect()
        const x = (e.clientX - rect.left - pan.x - draggingRef.current.offsetX) / zoom
        const y = (e.clientY - rect.top - pan.y - draggingRef.current.offsetY) / zoom
        updateCard(draggingRef.current.cardId, {
          x: Math.max(0, x),
          y: Math.max(0, y),
        })
        return
      }

      // Panning
      if (panningRef.current) {
        const dx = e.clientX - panningRef.current.startX
        const dy = e.clientY - panningRef.current.startY
        setPan({ x: pan.x + dx, y: pan.y + dy })
        panningRef.current = { startX: e.clientX, startY: e.clientY }
        return
      }

      // Drawing
      if (drawingRef.current) {
        const coords = toCanvasCoords(e.clientX, e.clientY)
        continueDrawing(coords)
      }
    },
    [toCanvasCoords, updateCard, setPan, pan, continueDrawing, zoom]
  )

  const handleMouseUp = useCallback(() => {
    // Persist card position if was dragging
    if (draggingRef.current) {
      const cardId = draggingRef.current.cardId
      const card = useBoardStore.getState().cards.find((c) => c.id === cardId)
      if (card) {
        onPersistCardUpdate(cardId, { x: card.x, y: card.y })
      }
      draggingRef.current = null
    }

    panningRef.current = null

    if (drawingRef.current) {
      drawingRef.current = false
      const path = finishDrawing()
      if (path) {
        onPathCommitted()
      }
    }
  }, [finishDrawing, onPersistCardUpdate, onPathCommitted])

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        const delta = e.deltaY > 0 ? -0.1 : 0.1
        setZoom(zoom + delta)
      }
    },
    [zoom, setZoom]
  )

  const cursorStyle = tool === 'select' ? 'default' : tool === 'pan' ? 'grab' : 'crosshair'

  return (
    <main
      ref={boardRef}
      className="flex-1 relative overflow-hidden bg-background"
      style={{ cursor: cursorStyle }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
    >
      {/* Grid background */}
      <div
        className="absolute inset-0 grid-bg"
        style={{
          backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
          backgroundPosition: `${pan.x}px ${pan.y}px`,
        }}
      />

      {/* Zoomable/pannable content */}
      <div
        className="absolute inset-0"
        style={{
          transformOrigin: 'top left',
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
        }}
      >
        <SVGDrawingLayer />

        {cards.map((card) => (
          <StickyCard
            key={card.id}
            card={card}
            onPersistUpdate={onPersistCardUpdate}
            onPersistDelete={onPersistCardDelete}
          />
        ))}
      </div>

      {/* Help text */}
      <div className="absolute bottom-3 left-3 text-[11px] text-slate-400">
        Double-click to edit | Ctrl+scroll to zoom | Drag to move
      </div>
    </main>
  )
}
```

**Step 2: Commit**

```bash
git add src/components/board/Canvas.tsx
git commit -m "feat(board): add Canvas with mouse event handling for select, pan, draw, and zoom"
```

---

### Task 8: BoardEditor (orchestrator) + Page Route

**Files:**
- Create: `src/components/board/BoardEditor.tsx`
- Modify: `src/app/board/[id]/page.tsx`

**Step 1: Create BoardEditor client wrapper**

```tsx
// src/components/board/BoardEditor.tsx
'use client'

import { useEffect, useRef, useMemo } from 'react'
import { useBoardStore } from '@/stores/board-store'
import { createClient } from '@/lib/supabase/client'
import {
  saveCard,
  deleteCardFromDB,
  savePath,
  deletePathsFromDB,
  updateBoardTitleInDB,
  fetchBoardData,
} from '@/lib/board-persistence'
import { toast } from '@/hooks/use-toast'
import BoardHeader from './BoardHeader'
import Toolbar from './Toolbar'
import Canvas from './Canvas'
import { NOTE_COLORS } from './StickyCard'
import type { Board, Card, DrawingPath } from '@/types'

interface BoardEditorProps {
  initialBoard: Board
  initialCards: Card[]
  initialPaths: DrawingPath[]
}

export default function BoardEditor({ initialBoard, initialCards, initialPaths }: BoardEditorProps) {
  const hydrate = useBoardStore((s) => s.hydrate)
  const addCard = useBoardStore((s) => s.addCard)
  const setTool = useBoardStore((s) => s.setTool)
  const setSaveStatus = useBoardStore((s) => s.setSaveStatus)
  const clearPaths = useBoardStore((s) => s.clearPaths)

  const supabase = useMemo(() => createClient(), [])
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Hydrate store on mount
  useEffect(() => {
    hydrate(initialBoard, initialCards, initialPaths)
  }, [hydrate, initialBoard, initialCards, initialPaths])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const { editingCardId, selectedCardId, deleteCard } = useBoardStore.getState()

      // Don't handle shortcuts while editing text
      if (editingCardId) return

      switch (e.key.toLowerCase()) {
        case 'v':
          setTool('select')
          break
        case 'n':
          handleAddCard()
          break
        case 'd':
          setTool('draw')
          break
        case 'h':
          setTool('pan')
          break
        case 'delete':
        case 'backspace':
          if (selectedCardId) {
            deleteCard(selectedCardId)
            handlePersistCardDelete(selectedCardId)
          }
          break
        case 'escape':
          useBoardStore.getState().setSelectedCard(null)
          useBoardStore.getState().setEditingCard(null)
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [setTool])

  const markSaving = () => {
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
    setSaveStatus('saving')
  }

  const markSaved = () => {
    setSaveStatus('saved')
    savedTimerRef.current = setTimeout(() => setSaveStatus('idle'), 2000)
  }

  const handleSaveError = async (errorMsg: string) => {
    setSaveStatus('error')
    toast({ title: 'Save failed', description: errorMsg, variant: 'destructive' })
    // Refetch board data to recover
    const boardId = useBoardStore.getState().board?.id
    if (boardId) {
      const { cards, paths, error } = await fetchBoardData(supabase, boardId)
      if (!error) {
        useBoardStore.getState().applyRemoteUpdate(cards, paths)
      }
    }
  }

  const handleAddCard = () => {
    const { board, pan, zoom } = useBoardStore.getState()
    if (!board) return
    const newCard: Card = {
      id: crypto.randomUUID(),
      board_id: board.id,
      type: 'sticky',
      x: (200 - pan.x) / zoom + Math.random() * 100,
      y: (200 - pan.y) / zoom + Math.random() * 80,
      width: 180,
      height: 140,
      content: 'New note...',
      color_index: Math.floor(Math.random() * NOTE_COLORS.length),
      client_mutation_id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    addCard(newCard)
    useBoardStore.getState().setSelectedCard(newCard.id)
    useBoardStore.getState().setEditingCard(newCard.id)
    setTool('select')

    // Persist
    markSaving()
    saveCard(supabase, newCard).then(({ error }) => {
      if (error) handleSaveError(error)
      else markSaved()
    })
  }

  // Debounce map for content/position updates
  const debounceMap = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const handlePersistCardUpdate = (id: string, partial: Partial<Card>) => {
    const key = `${id}-${Object.keys(partial).join(',')}`
    const existing = debounceMap.current.get(key)
    if (existing) clearTimeout(existing)

    debounceMap.current.set(
      key,
      setTimeout(async () => {
        debounceMap.current.delete(key)
        const card = useBoardStore.getState().cards.find((c) => c.id === id)
        if (!card) return
        const updated = { ...card, ...partial, client_mutation_id: crypto.randomUUID() }
        markSaving()
        const { error } = await saveCard(supabase, updated)
        if (error) handleSaveError(error)
        else markSaved()
      }, 500)
    )
  }

  const handlePersistCardDelete = async (id: string) => {
    markSaving()
    const { error } = await deleteCardFromDB(supabase, id)
    if (error) handleSaveError(error)
    else markSaved()
  }

  const handlePathCommitted = async () => {
    const { paths } = useBoardStore.getState()
    const lastPath = paths[paths.length - 1]
    if (!lastPath) return
    markSaving()
    const { error } = await savePath(supabase, lastPath)
    if (error) handleSaveError(error)
    else markSaved()
  }

  const handleClearPaths = async () => {
    const boardId = useBoardStore.getState().board?.id
    if (!boardId) return
    clearPaths()
    markSaving()
    const { error } = await deletePathsFromDB(supabase, boardId)
    if (error) handleSaveError(error)
    else markSaved()
  }

  const handleTitleSave = async (title: string) => {
    const boardId = useBoardStore.getState().board?.id
    if (!boardId) return
    markSaving()
    const { error } = await updateBoardTitleInDB(supabase, boardId, title)
    if (error) handleSaveError(error)
    else markSaved()
  }

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden">
      <BoardHeader onTitleSave={handleTitleSave} />
      <div className="flex flex-1 overflow-hidden">
        <Toolbar onAddCard={handleAddCard} onClearPaths={handleClearPaths} />
        <Canvas
          onPersistCardUpdate={handlePersistCardUpdate}
          onPersistCardDelete={handlePersistCardDelete}
          onPathCommitted={handlePathCommitted}
        />
      </div>
    </div>
  )
}
```

**Step 2: Update the page route to fetch data and render BoardEditor**

```tsx
// src/app/board/[id]/page.tsx
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import BoardEditor from '@/components/board/BoardEditor'
import type { Card, DrawingPath } from '@/types'

export default async function BoardPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: board, error: boardError } = await supabase
    .from('boards')
    .select('*')
    .eq('id', id)
    .single()

  if (boardError || !board) {
    notFound()
  }

  const [cardsRes, pathsRes] = await Promise.all([
    supabase.from('cards').select('*').eq('board_id', id),
    supabase.from('drawing_paths').select('*').eq('board_id', id),
  ])

  const cards = (cardsRes.data ?? []) as Card[]
  const paths = (pathsRes.data ?? []) as DrawingPath[]

  return <BoardEditor initialBoard={board} initialCards={cards} initialPaths={paths} />
}
```

**Step 3: Commit**

```bash
git add src/components/board/BoardEditor.tsx src/app/board/\[id\]/page.tsx
git commit -m "feat(board): add BoardEditor orchestrator and wire up page route with data fetching"
```

---

### Task 9: Smoke Test & Fix Compilation

**Step 1: Run the dev server and check for compilation errors**

Run: `cd /c/Users/itzzm/OneDrive/Desktop/31DayNicheBlitz/apps/13-collab-board/collab-board-app && npm run build 2>&1 | tail -40`

**Step 2: Fix any TypeScript errors**

Common issues to watch for:
- `React.useState` should be `useState` (imported from 'react') in StickyCard
- Missing `import React` if using `React.ChangeEvent`
- Supabase type mismatches (the `board` from `.single()` may need type assertion)
- The `onWheel` handler on a div may need `{ passive: false }` — switch to `useEffect` with `addEventListener` if needed

**Step 3: Fix each error and re-run build until clean**

**Step 4: Commit fixes**

```bash
git add -A
git commit -m "fix(board): resolve compilation errors from board editor integration"
```

---

### Task 10: Manual Verification of Acceptance Criteria

**Step 1: Start dev server**

Run: `npm run dev`

**Step 2: Verify each acceptance criterion**

1. Navigate to `/dashboard`, create a board, click into it
2. **Add sticky note**: Click N or toolbar button — verify card appears, type content, refresh — verify it persists
3. **Move card**: Drag a card — refresh — verify new position persists
4. **Draw stroke**: Select Draw tool, draw on canvas, release — refresh — verify stroke persists
5. **Error handling**: Temporarily break Supabase URL in env — verify toast appears on save failure
6. **Title edit**: Change board title — verify "Saving..." appears, then "Saved" after 500ms
7. **Keyboard shortcuts**: Test V, N, D, H, Delete, Escape, Ctrl+Scroll
8. **Save status**: Verify "Saving..." during writes, "Saved" when idle

**Step 3: Fix any issues found during testing**

**Step 4: Final commit**

```bash
git add -A
git commit -m "fix(board): polish board editor after manual testing"
```
