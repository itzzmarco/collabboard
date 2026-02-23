import { create } from 'zustand'
import {
  upsertCard,
  removeCard,
  insertPath,
  removePath,
  removeAllPaths,
  updateBoardTitle as updateBoardTitleAction,
  fetchBoardData,
} from '@/app/actions/canvas'
import { decompressPoints } from '@/lib/drawing-utils'
import { toast } from '@/hooks/use-toast'
import type {
  Board,
  Card,
  DrawingPath,
  HistoryEntry,
  PresenceCursor,
  BroadcastStroke,
} from '@/types'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const DRAW_COLORS = [
  '#1e293b',
  '#ef4444',
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#8b5cf6',
] as const

const UNDO_CAP = 50

// ---------------------------------------------------------------------------
// Exported types
// ---------------------------------------------------------------------------

export type Tool = 'select' | 'pan' | 'draw' | 'sticky'

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export interface DrawingOptions {
  color: string
  size: number
}

export interface InProgressPath {
  color: string
  size: number
  points: Array<{ x: number; y: number }>
}

// ---------------------------------------------------------------------------
// Store shape
// ---------------------------------------------------------------------------

interface BoardState {
  boardId: string
  boardTitle: string
  cards: Card[]
  paths: DrawingPath[]

  selectedCardId: string | null
  editingCardId: string | null

  tool: Tool
  zoom: number
  pan: { x: number; y: number }

  saveStatus: SaveStatus

  drawingOptions: DrawingOptions
  isDrawing: boolean
  currentPath: InProgressPath | null

  undoStack: HistoryEntry[]
  redoStack: HistoryEntry[]
  pendingMutationIds: Set<string>

  isViewOnly: boolean
  guestJwt: string | null

  presenceCursors: Record<string, PresenceCursor>
  ghostCardPositions: Record<string, { x: number; y: number }>
  ghostStroke: BroadcastStroke | null
  latestRemoteViewport: { pan: { x: number; y: number }; zoom: number } | null
}

interface BoardActions {
  // Hydration
  initBoard: (
    board: Board,
    cards: Card[],
    paths: DrawingPath[],
    isViewOnly?: boolean,
    guestJwt?: string | null,
  ) => void

  // View-only
  setViewOnly: (viewOnly: boolean) => void

  // Card CRUD (optimistic + persist + undo)
  addCard: (card: Card) => void
  updateCard: (id: string, partial: Partial<Card>) => void
  deleteCard: (id: string) => void

  // Local-only card update (for drag — no undo, no persist)
  moveCardLocal: (id: string, partial: Partial<Card>) => void

  // Commit drag position (undo + persist, but card already in correct position)
  commitCardMove: (id: string, before: { x: number; y: number }) => void

  // Commit resize (undo + persist, card already in correct position/size)
  commitCardResize: (
    id: string,
    before: { x: number; y: number; width: number; height: number },
    after: { x: number; y: number; width: number; height: number },
  ) => void

  // Drawing paths (optimistic + persist + undo)
  commitPath: (path: DrawingPath) => void
  deletePath: (id: string) => void
  clearPaths: () => void

  // Undo / Redo
  undo: () => void
  redo: () => void

  // Toolbar
  setTool: (tool: Tool) => void
  setZoom: (zoom: number) => void
  zoomAtPoint: (newZoom: number, pivotX: number, pivotY: number) => void
  setPan: (pan: { x: number; y: number }) => void

  // Selection
  setSelectedCard: (id: string | null) => void
  setEditingCard: (id: string | null) => void

  // Board meta
  updateBoardTitle: (title: string) => void

  // Save status
  setSaveStatus: (status: SaveStatus) => void

  // Drawing options
  setDrawingOptions: (partial: Partial<DrawingOptions>) => void

  // In-progress drawing
  startDrawing: (point: { x: number; y: number }) => void
  continueDrawing: (point: { x: number; y: number }) => void
  finishDrawing: () => DrawingPath | null

  // Real-time sync (Postgres Changes + echo prevention)
  applyRemoteCardUpdate: (
    eventType: 'INSERT' | 'UPDATE' | 'DELETE',
    payload: Partial<Card> & { id: string },
  ) => void
  applyRemotePathUpdate: (
    eventType: 'INSERT' | 'DELETE',
    payload: Partial<DrawingPath> & { id: string },
  ) => void

  // Presence / ghost (broadcast ephemeral state)
  setPresenceCursors: (cursors: Record<string, PresenceCursor>) => void
  setGhostCardPosition: (cardId: string, pos: { x: number; y: number }) => void
  clearGhostCardPosition: (cardId: string) => void
  setGhostStroke: (stroke: BroadcastStroke | null) => void
  setLatestRemoteViewport: (viewport: { pan: { x: number; y: number }; zoom: number } | null) => void
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function markSaved(
  set: (partial: Partial<BoardState>) => void,
  _get: () => BoardState & BoardActions,
) {
  set({ saveStatus: 'saved' })
}

async function handlePersistError(
  set: (
    partial:
      | Partial<BoardState>
      | ((state: BoardState & BoardActions) => Partial<BoardState>),
  ) => void,
  get: () => BoardState & BoardActions,
  errorMsg: string,
) {
  set({ saveStatus: 'error' })
  toast({
    title: 'Save failed',
    description: errorMsg,
    variant: 'destructive',
  })

  const boardId = get().boardId
  const guestJwt = get().guestJwt
  if (boardId) {
    const result = await fetchBoardData(boardId, guestJwt)
    if (!result.error) {
      set({ cards: result.cards, paths: result.paths })
    }
  }
}

function removeMutationId(
  state: BoardState,
  clientMutationId: string,
): Partial<BoardState> {
  const next = new Set(state.pendingMutationIds)
  next.delete(clientMutationId)
  return { pendingMutationIds: next }
}

function cardToPayload(card: Card, clientMutationId: string) {
  return {
    id: card.id,
    board_id: card.board_id,
    type: card.type,
    x: card.x,
    y: card.y,
    width: card.width,
    height: card.height,
    content: card.content,
    color_index: card.color_index,
    client_mutation_id: clientMutationId,
  }
}

function pathToPayload(path: DrawingPath, clientMutationId: string) {
  return {
    id: path.id,
    board_id: path.board_id,
    color: path.color,
    size: path.size,
    points: path.points,
    client_mutation_id: clientMutationId,
  }
}

// Debounce state for content-only card updates (500ms)
const contentDebounce = new Map<
  string,
  { timer: ReturnType<typeof setTimeout>; beforeSnapshot: Card }
>()

// Debounce state for card-move persists (50ms)
const movePersistDebounce = new Map<
  string,
  { timer: ReturnType<typeof setTimeout>; clientMutationId: string }
>()

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useBoardStore = create<BoardState & BoardActions>()((set, get) => ({
  // ----- Initial state -----------------------------------------------------
  boardId: '',
  boardTitle: '',
  cards: [],
  paths: [],

  selectedCardId: null,
  editingCardId: null,

  tool: 'select',
  zoom: 1,
  pan: { x: 0, y: 0 },

  saveStatus: 'idle',

  drawingOptions: {
    color: DRAW_COLORS[0],
    size: 2,
  },
  isDrawing: false,
  currentPath: null,

  undoStack: [],
  redoStack: [],
  pendingMutationIds: new Set(),

  isViewOnly: false,
  guestJwt: null,

  presenceCursors: {},
  ghostCardPositions: {},
  ghostStroke: null,
  latestRemoteViewport: null,

  // ----- Hydration ---------------------------------------------------------
  initBoard: (board, cards, paths, isViewOnly, guestJwt) => {
    set({
      boardId: board.id,
      boardTitle: board.title,
      cards,
      paths,
      undoStack: [],
      redoStack: [],
      pendingMutationIds: new Set(),
      saveStatus: 'idle',
      isViewOnly: isViewOnly ?? false,
      guestJwt: guestJwt ?? null,
    })
  },

  // ----- View-only --------------------------------------------------------
  setViewOnly: (viewOnly) => {
    set({ isViewOnly: viewOnly })
  },

  // ----- Card CRUD (optimistic + persist + undo) ---------------------------
  addCard: (card) => {
    if (get().isViewOnly) return
    const clientMutationId = crypto.randomUUID()
    const newCard: Card = { ...card, client_mutation_id: clientMutationId }

    const entry: HistoryEntry = {
      type: 'card_add',
      entityId: newCard.id,
      before: null,
      after: newCard,
    }

    set((state) => ({
      cards: [...state.cards, newCard],
      undoStack: [...state.undoStack, entry].slice(-UNDO_CAP),
      redoStack: [],
      pendingMutationIds: new Set([...state.pendingMutationIds, clientMutationId]),
      saveStatus: 'saving',
    }))

    upsertCard(cardToPayload(newCard, clientMutationId), get().guestJwt).then(({ error }) => {
      set((state) => removeMutationId(state, clientMutationId))
      if (error) {
        handlePersistError(set, get, error)
      } else {
        markSaved(set, get)
      }
    })
  },

  updateCard: (id, partial) => {
    if (get().isViewOnly) return
    const card = get().cards.find((c) => c.id === id)
    if (!card) return

    const isContentOnly =
      Object.keys(partial).length === 1 && 'content' in partial

    // --- Debounced path for content-only patches (500ms) ---
    if (isContentOnly) {
      const existing = contentDebounce.get(id)
      const beforeSnapshot = existing?.beforeSnapshot ?? { ...card }

      // Update local state immediately (no undo / persist yet)
      set((state) => ({
        cards: state.cards.map((c) =>
          c.id === id ? { ...c, ...partial } : c,
        ),
      }))

      if (existing?.timer) clearTimeout(existing.timer)

      const timer = setTimeout(() => {
        contentDebounce.delete(id)

        const currentCard = get().cards.find((c) => c.id === id)
        if (!currentCard) return

        const clientMutationId = crypto.randomUUID()
        const updated: Card = {
          ...currentCard,
          client_mutation_id: clientMutationId,
          updated_at: new Date().toISOString(),
        }

        const entry: HistoryEntry = {
          type: 'card_update',
          entityId: id,
          before: beforeSnapshot,
          after: updated,
        }

        set((state) => ({
          cards: state.cards.map((c) => (c.id === id ? updated : c)),
          undoStack: [...state.undoStack, entry].slice(-UNDO_CAP),
          redoStack: [],
          pendingMutationIds: new Set([
            ...state.pendingMutationIds,
            clientMutationId,
          ]),
          saveStatus: 'saving',
        }))

        upsertCard(cardToPayload(updated, clientMutationId), get().guestJwt).then(
          ({ error }) => {
            set((state) => removeMutationId(state, clientMutationId))
            if (error) {
              handlePersistError(set, get, error)
            } else {
              markSaved(set, get)
            }
          },
        )
      }, 500)

      contentDebounce.set(id, { timer, beforeSnapshot })
      return
    }

    // --- Immediate path for structural changes (x/y/width/height/color_index) ---

    // Flush any pending content debounce for this card
    const pendingContent = contentDebounce.get(id)
    if (pendingContent) {
      clearTimeout(pendingContent.timer)
      contentDebounce.delete(id)
    }

    const clientMutationId = crypto.randomUUID()
    const updated: Card = {
      ...card,
      ...partial,
      client_mutation_id: clientMutationId,
      updated_at: new Date().toISOString(),
    }

    const entry: HistoryEntry = {
      type: 'card_update',
      entityId: id,
      before: pendingContent?.beforeSnapshot ?? card,
      after: updated,
    }

    set((state) => ({
      cards: state.cards.map((c) => (c.id === id ? updated : c)),
      undoStack: [...state.undoStack, entry].slice(-UNDO_CAP),
      redoStack: [],
      pendingMutationIds: new Set([
        ...state.pendingMutationIds,
        clientMutationId,
      ]),
      saveStatus: 'saving',
    }))

    upsertCard(cardToPayload(updated, clientMutationId), get().guestJwt).then(({ error }) => {
      set((state) => removeMutationId(state, clientMutationId))
      if (error) {
        handlePersistError(set, get, error)
      } else {
        markSaved(set, get)
      }
    })
  },

  deleteCard: (id) => {
    if (get().isViewOnly) return
    const card = get().cards.find((c) => c.id === id)
    if (!card) return

    const entry: HistoryEntry = {
      type: 'card_delete',
      entityId: id,
      before: card,
      after: null,
    }

    const clientMutationId = crypto.randomUUID()

    set((state) => ({
      cards: state.cards.filter((c) => c.id !== id),
      selectedCardId: state.selectedCardId === id ? null : state.selectedCardId,
      editingCardId: state.editingCardId === id ? null : state.editingCardId,
      undoStack: [...state.undoStack, entry].slice(-UNDO_CAP),
      redoStack: [],
      pendingMutationIds: new Set([...state.pendingMutationIds, clientMutationId]),
      saveStatus: 'saving',
    }))

    removeCard(id, get().boardId, get().guestJwt).then(({ error }) => {
      set((state) => removeMutationId(state, clientMutationId))
      if (error) {
        handlePersistError(set, get, error)
      } else {
        markSaved(set, get)
      }
    })
  },

  // ----- Local-only card update (drag) ------------------------------------
  moveCardLocal: (id, partial) => {
    if (get().isViewOnly) return
    set((state) => ({
      cards: state.cards.map((c) => (c.id === id ? { ...c, ...partial } : c)),
    }))
  },

  // ----- Commit drag position (undo + debounced persist) ------------------
  commitCardMove: (id, before) => {
    if (get().isViewOnly) return
    const card = get().cards.find((c) => c.id === id)
    if (!card) return
    if (card.x === before.x && card.y === before.y) return

    // Cancel any existing debounce for this card
    const existing = movePersistDebounce.get(id)
    if (existing) {
      clearTimeout(existing.timer)
      // Remove the old clientMutationId from pending set
      set((state) => removeMutationId(state, existing.clientMutationId))
      movePersistDebounce.delete(id)
    }

    const clientMutationId = crypto.randomUUID()
    const beforeCard: Card = { ...card, x: before.x, y: before.y }

    const entry: HistoryEntry = {
      type: 'card_update',
      entityId: id,
      before: beforeCard,
      after: card,
    }

    // Update local state immediately (undo entry + pendingMutationIds)
    set((state) => ({
      cards: state.cards.map((c) =>
        c.id === id ? { ...c, client_mutation_id: clientMutationId } : c,
      ),
      undoStack: [...state.undoStack, entry].slice(-UNDO_CAP),
      redoStack: [],
      pendingMutationIds: new Set([...state.pendingMutationIds, clientMutationId]),
      saveStatus: 'saving',
    }))

    // Schedule persist after 50ms debounce
    const timer = setTimeout(() => {
      movePersistDebounce.delete(id)
      const latestCard = get().cards.find((c) => c.id === id)
      if (!latestCard) return

      upsertCard(cardToPayload(latestCard, clientMutationId), get().guestJwt).then(({ error }) => {
        set((state) => removeMutationId(state, clientMutationId))
        if (error) {
          handlePersistError(set, get, error)
        } else {
          markSaved(set, get)
        }
      })
    }, 50)

    movePersistDebounce.set(id, { timer, clientMutationId })
  },

  // ----- Commit resize (undo + persist) -----------------------------------
  commitCardResize: (id, before, after) => {
    if (get().isViewOnly) return
    const card = get().cards.find((c) => c.id === id)
    if (!card) return

    // No-op if nothing changed
    if (
      before.x === after.x &&
      before.y === after.y &&
      before.width === after.width &&
      before.height === after.height
    ) return

    const clientMutationId = crypto.randomUUID()
    const beforeCard: Card = { ...card, ...before }
    const afterCard: Card = { ...card, ...after, client_mutation_id: clientMutationId }

    const entry: HistoryEntry = {
      type: 'card_update',
      entityId: id,
      before: beforeCard,
      after: afterCard,
    }

    set((state) => ({
      cards: state.cards.map((c) =>
        c.id === id ? { ...c, client_mutation_id: clientMutationId } : c,
      ),
      undoStack: [...state.undoStack, entry].slice(-UNDO_CAP),
      redoStack: [],
      pendingMutationIds: new Set([...state.pendingMutationIds, clientMutationId]),
      saveStatus: 'saving',
    }))

    upsertCard(cardToPayload(afterCard, clientMutationId), get().guestJwt).then(({ error }) => {
      set((state) => removeMutationId(state, clientMutationId))
      if (error) {
        handlePersistError(set, get, error)
      } else {
        markSaved(set, get)
      }
    })
  },

  // ----- Drawing paths (optimistic + persist + undo) ----------------------
  commitPath: (path) => {
    if (get().isViewOnly) return
    const clientMutationId = crypto.randomUUID()
    const newPath: DrawingPath = { ...path, client_mutation_id: clientMutationId }

    const entry: HistoryEntry = {
      type: 'path_add',
      entityId: newPath.id,
      before: null,
      after: newPath,
    }

    set((state) => ({
      paths: [...state.paths, newPath],
      undoStack: [...state.undoStack, entry].slice(-UNDO_CAP),
      redoStack: [],
      pendingMutationIds: new Set([...state.pendingMutationIds, clientMutationId]),
      saveStatus: 'saving',
    }))

    insertPath(pathToPayload(newPath, clientMutationId), get().guestJwt).then(({ error }) => {
      set((state) => removeMutationId(state, clientMutationId))
      if (error) {
        handlePersistError(set, get, error)
      } else {
        markSaved(set, get)
      }
    })
  },

  deletePath: (id) => {
    if (get().isViewOnly) return
    const path = get().paths.find((p) => p.id === id)
    if (!path) return

    const clientMutationId = crypto.randomUUID()

    const entry: HistoryEntry = {
      type: 'path_delete',
      entityId: id,
      before: path,
      after: null,
    }

    set((state) => ({
      paths: state.paths.filter((p) => p.id !== id),
      undoStack: [...state.undoStack, entry].slice(-UNDO_CAP),
      redoStack: [],
      pendingMutationIds: new Set([...state.pendingMutationIds, clientMutationId]),
      saveStatus: 'saving',
    }))

    removePath(id, get().boardId, get().guestJwt).then(({ error }) => {
      set((state) => removeMutationId(state, clientMutationId))
      if (error) {
        handlePersistError(set, get, error)
      } else {
        markSaved(set, get)
      }
    })
  },

  clearPaths: () => {
    if (get().isViewOnly) return
    const { boardId, paths: currentPaths } = get()
    if (currentPaths.length === 0) return

    const clientMutationId = crypto.randomUUID()

    // Push one path_delete entry per path for granular undo
    const entries: HistoryEntry[] = currentPaths.map((p) => ({
      type: 'path_delete' as const,
      entityId: p.id,
      before: p,
      after: null,
    }))

    set((state) => ({
      paths: [],
      undoStack: [...state.undoStack, ...entries].slice(-UNDO_CAP),
      redoStack: [],
      pendingMutationIds: new Set([...state.pendingMutationIds, clientMutationId]),
      saveStatus: 'saving',
    }))

    removeAllPaths(boardId, get().guestJwt).then(({ error }) => {
      set((state) => removeMutationId(state, clientMutationId))
      if (error) {
        handlePersistError(set, get, error)
      } else {
        markSaved(set, get)
      }
    })
  },

  // ----- Undo / Redo ------------------------------------------------------
  undo: () => {
    if (get().isViewOnly) return
    const { undoStack } = get()
    if (undoStack.length === 0) return

    const entry = undoStack[undoStack.length - 1]
    const newUndo = undoStack.slice(0, -1)

    switch (entry.type) {
      case 'card_add': {
        set((state) => ({
          cards: state.cards.filter((c) => c.id !== entry.entityId),
          undoStack: newUndo,
          redoStack: [...state.redoStack, entry],
          saveStatus: 'saving',
        }))
        removeCard(entry.entityId, get().boardId, get().guestJwt).then(({ error }) => {
          if (error) handlePersistError(set, get, error)
          else markSaved(set, get)
        })
        break
      }
      case 'card_update': {
        const before = entry.before as Card
        set((state) => ({
          cards: state.cards.map((c) =>
            c.id === entry.entityId ? { ...c, ...before } : c,
          ),
          undoStack: newUndo,
          redoStack: [...state.redoStack, entry],
          saveStatus: 'saving',
        }))
        upsertCard(cardToPayload(before, crypto.randomUUID()), get().guestJwt).then(
          ({ error }) => {
            if (error) handlePersistError(set, get, error)
            else markSaved(set, get)
          },
        )
        break
      }
      case 'card_delete': {
        const card = entry.before as Card
        set((state) => ({
          cards: [...state.cards, card],
          undoStack: newUndo,
          redoStack: [...state.redoStack, entry],
          saveStatus: 'saving',
        }))
        upsertCard(cardToPayload(card, crypto.randomUUID()), get().guestJwt).then(
          ({ error }) => {
            if (error) handlePersistError(set, get, error)
            else markSaved(set, get)
          },
        )
        break
      }
      case 'path_add': {
        set((state) => ({
          paths: state.paths.filter((p) => p.id !== entry.entityId),
          undoStack: newUndo,
          redoStack: [...state.redoStack, entry],
          saveStatus: 'saving',
        }))
        removePath(entry.entityId, get().boardId, get().guestJwt).then(({ error }) => {
          if (error) handlePersistError(set, get, error)
          else markSaved(set, get)
        })
        break
      }
      case 'path_delete': {
        const path = entry.before as DrawingPath
        set((state) => ({
          paths: [...state.paths, path],
          undoStack: newUndo,
          redoStack: [...state.redoStack, entry],
          saveStatus: 'saving',
        }))
        insertPath(pathToPayload(path, crypto.randomUUID()), get().guestJwt).then(
          ({ error }) => {
            if (error) handlePersistError(set, get, error)
            else markSaved(set, get)
          },
        )
        break
      }
    }
  },

  redo: () => {
    if (get().isViewOnly) return
    const { redoStack } = get()
    if (redoStack.length === 0) return

    const entry = redoStack[redoStack.length - 1]
    const newRedo = redoStack.slice(0, -1)

    switch (entry.type) {
      case 'card_add': {
        const card = entry.after as Card
        set((state) => ({
          cards: [...state.cards, card],
          undoStack: [...state.undoStack, entry].slice(-UNDO_CAP),
          redoStack: newRedo,
          saveStatus: 'saving',
        }))
        upsertCard(cardToPayload(card, crypto.randomUUID()), get().guestJwt).then(
          ({ error }) => {
            if (error) handlePersistError(set, get, error)
            else markSaved(set, get)
          },
        )
        break
      }
      case 'card_update': {
        const after = entry.after as Card
        set((state) => ({
          cards: state.cards.map((c) =>
            c.id === entry.entityId ? { ...c, ...after } : c,
          ),
          undoStack: [...state.undoStack, entry].slice(-UNDO_CAP),
          redoStack: newRedo,
          saveStatus: 'saving',
        }))
        upsertCard(cardToPayload(after, crypto.randomUUID()), get().guestJwt).then(
          ({ error }) => {
            if (error) handlePersistError(set, get, error)
            else markSaved(set, get)
          },
        )
        break
      }
      case 'card_delete': {
        set((state) => ({
          cards: state.cards.filter((c) => c.id !== entry.entityId),
          undoStack: [...state.undoStack, entry].slice(-UNDO_CAP),
          redoStack: newRedo,
          saveStatus: 'saving',
        }))
        removeCard(entry.entityId, get().boardId, get().guestJwt).then(({ error }) => {
          if (error) handlePersistError(set, get, error)
          else markSaved(set, get)
        })
        break
      }
      case 'path_add': {
        const path = entry.after as DrawingPath
        set((state) => ({
          paths: [...state.paths, path],
          undoStack: [...state.undoStack, entry].slice(-UNDO_CAP),
          redoStack: newRedo,
          saveStatus: 'saving',
        }))
        insertPath(pathToPayload(path, crypto.randomUUID()), get().guestJwt).then(
          ({ error }) => {
            if (error) handlePersistError(set, get, error)
            else markSaved(set, get)
          },
        )
        break
      }
      case 'path_delete': {
        set((state) => ({
          paths: state.paths.filter((p) => p.id !== entry.entityId),
          undoStack: [...state.undoStack, entry].slice(-UNDO_CAP),
          redoStack: newRedo,
          saveStatus: 'saving',
        }))
        removePath(entry.entityId, get().boardId, get().guestJwt).then(({ error }) => {
          if (error) handlePersistError(set, get, error)
          else markSaved(set, get)
        })
        break
      }
    }
  },

  // ----- Toolbar ----------------------------------------------------------
  setTool: (tool) => {
    if (tool !== 'select') {
      set({ tool, selectedCardId: null, editingCardId: null })
    } else {
      set({ tool })
    }
  },

  setZoom: (zoom) => {
    set({ zoom: Math.min(2, Math.max(0.25, zoom)) })
  },

  zoomAtPoint: (newZoom, pivotX, pivotY) => {
    const oldZoom = get().zoom
    const clamped = Math.min(2, Math.max(0.25, newZoom))
    if (clamped === oldZoom) return
    const { pan } = get()
    set({
      zoom: clamped,
      pan: {
        x: pan.x + pivotX * (1 / clamped - 1 / oldZoom),
        y: pan.y + pivotY * (1 / clamped - 1 / oldZoom),
      },
    })
  },

  setPan: (pan) => {
    set({ pan })
  },

  // ----- Selection --------------------------------------------------------
  setSelectedCard: (id) => {
    set({ selectedCardId: id })
  },

  setEditingCard: (id) => {
    set({ editingCardId: id })
  },

  // ----- Board meta -------------------------------------------------------
  updateBoardTitle: (title) => {
    if (get().isViewOnly) return
    set({ boardTitle: title })

    const boardId = get().boardId
    if (!boardId) return

    set({ saveStatus: 'saving' })
    updateBoardTitleAction(boardId, title, get().guestJwt).then(({ error }) => {
      if (error) {
        set({ saveStatus: 'error' })
        toast({
          title: 'Save failed',
          description: error,
          variant: 'destructive',
        })
      } else {
        markSaved(set, get)
      }
    })
  },

  // ----- Save status ------------------------------------------------------
  setSaveStatus: (status) => {
    set({ saveStatus: status })
  },

  // ----- Drawing options --------------------------------------------------
  setDrawingOptions: (partial) => {
    set((state) => ({
      drawingOptions: { ...state.drawingOptions, ...partial },
    }))
  },

  // ----- In-progress drawing ----------------------------------------------
  startDrawing: (point) => {
    if (get().isViewOnly) return
    const { drawingOptions } = get()
    set({
      isDrawing: true,
      currentPath: {
        color: drawingOptions.color,
        size: drawingOptions.size,
        points: [point],
      },
    })
  },

  continueDrawing: (point) => {
    if (get().isViewOnly) return
    set((state) => {
      if (!state.currentPath) return state
      return {
        currentPath: {
          ...state.currentPath,
          points: [...state.currentPath.points, point],
        },
      }
    })
  },

  finishDrawing: () => {
    if (get().isViewOnly) return null
    const { currentPath, boardId } = get()

    if (!currentPath || currentPath.points.length < 2) {
      set({ isDrawing: false, currentPath: null })
      return null
    }

    const newPath: DrawingPath = {
      id: crypto.randomUUID(),
      board_id: boardId,
      color: currentPath.color,
      size: currentPath.size,
      points: currentPath.points,
      client_mutation_id: null,
      created_at: new Date().toISOString(),
    }

    set({ isDrawing: false, currentPath: null })

    // Caller should use commitPath() to add to paths with undo + persist
    return newPath
  },

  // ----- Real-time sync (Postgres Changes + echo prevention) --------------
  applyRemoteCardUpdate: (eventType, payload) => {
    const { pendingMutationIds } = get()
    const clientMutationId =
      'client_mutation_id' in payload ? payload.client_mutation_id : null

    if (eventType === 'INSERT' || eventType === 'UPDATE') {
      if (clientMutationId != null && pendingMutationIds.has(clientMutationId)) {
        return // echo prevention
      }
      const card = payload as Card
      set((state) => {
        const existing = state.cards.find((c) => c.id === card.id)
        const next = existing
          ? state.cards.map((c) => (c.id === card.id ? { ...c, ...card } : c))
          : [...state.cards, { ...card } as Card]
        return { cards: next }
      })
      return
    }

    if (eventType === 'DELETE') {
      set((state) => ({
        cards: state.cards.filter((c) => c.id !== payload.id),
        selectedCardId: state.selectedCardId === payload.id ? null : state.selectedCardId,
        editingCardId: state.editingCardId === payload.id ? null : state.editingCardId,
      }))
    }
  },

  applyRemotePathUpdate: (eventType, payload) => {
    const { pendingMutationIds } = get()
    const clientMutationId =
      'client_mutation_id' in payload ? payload.client_mutation_id : null

    if (eventType === 'INSERT') {
      if (clientMutationId != null && pendingMutationIds.has(clientMutationId)) {
        return
      }
      const rawPath = payload as DrawingPath
      const path: DrawingPath = {
        ...rawPath,
        points: decompressPoints(rawPath.points as unknown as Array<Record<string, number>>),
      }
      set((state) => {
        if (state.paths.some((p) => p.id === path.id)) return state
        return { paths: [...state.paths, path] }
      })
      return
    }

    if (eventType === 'DELETE') {
      set((state) => ({
        paths: state.paths.filter((p) => p.id !== payload.id),
      }))
    }
  },

  setPresenceCursors: (cursors) => {
    set({ presenceCursors: cursors })
  },

  setGhostCardPosition: (cardId, pos) => {
    set((state) => ({
      ghostCardPositions: { ...state.ghostCardPositions, [cardId]: pos },
    }))
  },

  clearGhostCardPosition: (cardId) => {
    set((state) => {
      const next = { ...state.ghostCardPositions }
      delete next[cardId]
      return { ghostCardPositions: next }
    })
  },

  setGhostStroke: (stroke) => {
    set({ ghostStroke: stroke })
  },

  setLatestRemoteViewport: (viewport) => {
    set({ latestRemoteViewport: viewport })
  },
}))
