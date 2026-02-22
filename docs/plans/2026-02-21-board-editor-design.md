# T5: Board Editor Design

**Date:** 2026-02-21
**Status:** Approved

## Decisions

- **Canvas rendering:** DOM + SVG (cards as DOM nodes, drawing as SVG paths, CSS transforms for zoom/pan)
- **Store architecture:** Single Zustand store (`useBoardStore`) with slices
- **Persistence:** Client-side Supabase calls (browser client), RLS for auth
- **Optimistic updates:** Immediate store mutation, background Supabase write, rollback/refetch on failure

## Architecture

```
/board/[id]/page.tsx (server component — fetches initial data)
  └── BoardEditor.tsx (client component)
        ├── BoardHeader.tsx — title, save status, export/share stubs
        ├── Toolbar.tsx — tools, drawing options, zoom
        └── Canvas.tsx — mouse events, CSS transform
              ├── SVGDrawingLayer.tsx — committed + in-progress paths
              └── StickyCard.tsx[] — draggable, editable cards
```

## Component Responsibilities

### `/board/[id]/page.tsx` (server component)
- Fetches board, cards, and drawing_paths from Supabase server client
- Returns 404 if board not found
- Passes initial data as props to `<BoardEditor>`

### `BoardEditor.tsx` (client, "use client")
- Receives `initialBoard`, `initialCards`, `initialPaths`
- Hydrates `useBoardStore` on mount via `useEffect`
- Renders header, toolbar, canvas
- Registers keyboard shortcuts (V, N, D, H, Delete, Escape, Ctrl+Scroll)

### `useBoardStore` (Zustand)

**State:**
- `board: Board | null`
- `cards: Card[]`
- `paths: DrawingPath[]`
- `selectedCardId: string | null`
- `tool: 'select' | 'pan' | 'draw' | 'sticky'`
- `zoom: number` (0.25–2.0)
- `pan: { x: number; y: number }`
- `saveStatus: 'idle' | 'saving' | 'saved' | 'error'`
- `drawingOptions: { color: string; size: number; eraser: boolean }`
- `isDrawing: boolean`
- `currentPath: { color: string; size: number; points: Array<{x: number; y: number}> } | null`

**Actions:**
- `hydrate(board, cards, paths)` — initial load
- `addCard(card)` — optimistic add
- `updateCard(id, partial)` — optimistic update
- `deleteCard(id)` — optimistic delete
- `addPath(path)` — commit drawing
- `clearPaths()` — clear all paths
- `setTool(tool)`
- `setZoom(zoom)`
- `setPan(pan)`
- `setSelectedCard(id | null)`
- `updateBoardTitle(title)`
- `setSaveStatus(status)`
- `setDrawingOptions(partial)`
- `startDrawing(point)` — begin in-progress path
- `continueDrawing(point)` — add point to currentPath
- `finishDrawing()` — commit currentPath to paths
- `applyRemoteUpdate(update)` — for T6 real-time (stub for now)

### Persistence (`lib/board-persistence.ts`)
- `saveCard(supabase, card)` — upsert card row
- `deleteCardFromDB(supabase, cardId)` — delete card row
- `savePath(supabase, path)` — insert path row
- `deletePathsFromDB(supabase, boardId)` — delete all paths for board
- `updateBoardTitleInDB(supabase, boardId, title)` — update board title
- Each function returns `{ error }` for rollback handling

### `BoardHeader.tsx`
- Inline-editable title (input field), debounced 500ms save
- Save status: "Saving..." during pending writes, "Saved" checkmark when idle
- Export button (disabled stub), Share button (disabled stub)

### `Toolbar.tsx`
- Tool buttons: Select (V), Pan (H), Sticky Note (N), Draw (D)
- Active tool highlighted
- Drawing options panel (visible when Draw active): 6 colors, 3 brush sizes, eraser toggle, clear all
- Zoom: +, -, reset, percentage display

### `Canvas.tsx`
- Outer div: `overflow: hidden`, captures mouse/wheel events
- Inner div: `transform: scale(${zoom}) translate(${panX}px, ${panY}px)`
- Dot-grid CSS background
- Mouse event dispatch by tool:
  - **Select:** click=select card, drag=move card
  - **Pan:** drag=translate viewport
  - **Draw:** down=start path, move=add points, up=commit
  - **Sticky:** click=place new card

### `StickyCard.tsx`
- Absolutely positioned at `(x, y)`, sized `width x height`
- Drag-to-move via mousedown on card body
- Double-click to edit (textarea overlay)
- Color picker (6 pastel colors)
- Delete button (top-right)
- Selected state: blue ring

### `SVGDrawingLayer.tsx`
- Full-size SVG, `pointer-events: none` (except in draw mode)
- Committed paths: rendered as `<path>` with stroke color/width
- In-progress path: rendered with lower opacity

## Optimistic Update Flow

```
User action
  → Store update (immediate, generate clientMutationId)
  → saveStatus: "saving"
  → Supabase write (background)
    → Success: saveStatus: "saved" (auto-reset to "idle" after 2s)
    → Failure: toast error, refetch full board, replace store state
```

- `clientMutationId` stored on DB row for T6 self-echo filtering
- Title edits: debounced 500ms
- Structural changes (add/delete card, commit path): immediate persist
- Card content/position edits: debounced 500ms

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| V | Select tool |
| N | Sticky note tool |
| D | Draw tool |
| H | Pan tool |
| Delete/Backspace | Delete selected card |
| Escape | Deselect / cancel edit |
| Ctrl+Scroll | Zoom in/out |

## New Files

```
src/
  stores/
    board-store.ts
  lib/
    board-persistence.ts
  components/board/
    BoardEditor.tsx
    BoardHeader.tsx
    Toolbar.tsx
    Canvas.tsx
    StickyCard.tsx
    SVGDrawingLayer.tsx
```

## Out of Scope
- Real-time subscriptions (T6)
- Undo/redo, card resize, export (T8)
- Share modal (T7)
- Presence cursors (T6)

## Design Tokens (from existing globals.css)

**Sticky Colors (6):**
0. Yellow: `#fef9c3` / `#fcd34d`
1. Blue: `#dbeafe` / `#93c5fd`
2. Green: `#dcfce7` / `#86efac`
3. Pink: `#fce7f3` / `#f9a8d4`
4. Purple: `#ede9fe` / `#c4b5fd`
5. Orange: `#ffedd5` / `#fdba74`

**Drawing Colors (6):**
Dark Slate, Red, Blue, Green, Amber, Purple

**Brush Sizes (3):** 2px, 4px, 6px
