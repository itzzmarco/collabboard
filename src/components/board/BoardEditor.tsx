'use client'

import { useEffect, useCallback, useRef, useState } from 'react'
import { useBoardStore } from '@/stores/board-store'
import { useRealtimeBoard } from '@/hooks/use-realtime-board'
import BoardHeader from './BoardHeader'
import Toolbar from './Toolbar'
import Canvas from './Canvas'
import ExportDialog from './ExportDialog'
import { NOTE_COLORS } from './StickyCard'
import type { Board, Card, DrawingPath } from '@/types'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface BoardEditorProps {
  initialBoard: Board
  initialCards: Card[]
  initialPaths: DrawingPath[]
  userId: string
  userProfile: { displayName: string; avatarColor: string }
  isViewOnly?: boolean
  guestJwt?: string | null
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function BoardEditor({
  initialBoard,
  initialCards,
  initialPaths,
  userId,
  userProfile,
  isViewOnly = false,
  guestJwt,
}: BoardEditorProps) {
  // ---- Hydrate the Zustand store on mount ----------------------------------
  const initBoard = useBoardStore((s) => s.initBoard)

  useEffect(() => {
    initBoard(initialBoard, initialCards, initialPaths, isViewOnly, guestJwt)
  }, [initBoard, initialBoard, initialCards, initialPaths, isViewOnly, guestJwt])

  // ---- Canvas refs for export -------------------------------------------------
  const outerCanvasRef = useRef<HTMLDivElement>(null)
  const zoomPanRef = useRef<HTMLDivElement>(null)
  const [exportOpen, setExportOpen] = useState(false)

  // ---- Realtime collaboration ---------------------------------------------
  const {
    broadcastCursor,
    broadcastCardDrag,
    broadcastCardDragEnd,
    broadcastDrawStroke,
    broadcastDrawStrokeEnd,
  } = useRealtimeBoard(initialBoard.id, userId, userProfile, guestJwt)

  // ---- handleAddCard -------------------------------------------------------
  const handleAddCard = useCallback(() => {
    const { boardId, pan, zoom, addCard, setSelectedCard, setEditingCard, setTool } =
      useBoardStore.getState()

    if (!boardId) return

    const cardW = 180
    const cardH = 140

    // Compute viewport center in screen coords (account for header=52px, toolbar=52px)
    const screenCenterX = 52 + (window.innerWidth - 52) / 2
    const screenCenterY = 52 + (window.innerHeight - 52) / 2

    // Convert to canvas coords: with transform scale(zoom) translate(pan)
    // canvas = screen / zoom - pan
    const canvasCenterX = screenCenterX / zoom - pan.x
    const canvasCenterY = screenCenterY / zoom - pan.y

    const newCard: Card = {
      id: crypto.randomUUID(),
      board_id: boardId,
      type: 'sticky',
      x: canvasCenterX - cardW / 2,
      y: canvasCenterY - cardH / 2,
      width: cardW,
      height: cardH,
      content: 'New note...',
      color_index: Math.floor(Math.random() * NOTE_COLORS.length),
      client_mutation_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    addCard(newCard)
    setSelectedCard(newCard.id)
    setEditingCard(newCard.id)
    setTool('select')
  }, [])

  // ---- handleClearPaths ----------------------------------------------------
  const handleClearPaths = useCallback(() => {
    useBoardStore.getState().clearPaths()
  }, [])

  // ---- handleTitleSave -----------------------------------------------------
  const handleTitleSave = useCallback((title: string) => {
    useBoardStore.getState().updateBoardTitle(title)
  }, [])

  // ---- Keyboard shortcuts --------------------------------------------------
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const {
        isViewOnly: viewOnly,
        editingCardId,
        selectedCardId,
        deleteCard,
        setTool,
        setSelectedCard,
        setEditingCard,
        undo,
        redo,
      } = useBoardStore.getState()

      // Block all mutating shortcuts in view-only mode
      if (viewOnly) return

      // Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y — work even when editing
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        if (e.shiftKey) {
          redo()
        } else {
          undo()
        }
        return
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault()
        redo()
        return
      }

      // Skip remaining shortcuts when editing card text
      if (editingCardId) return

      // Skip if the user is typing in any other input/textarea
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return

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
          }
          break
        case 'escape':
          setSelectedCard(null)
          setEditingCard(null)
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleAddCard])

  // ---- Render --------------------------------------------------------------
  return (
    <div className="h-screen w-full flex flex-col overflow-hidden">
      <BoardHeader onTitleSave={handleTitleSave} onExport={() => setExportOpen(true)} />
      <div className="flex flex-1 overflow-hidden">
        <Toolbar onAddCard={handleAddCard} onClearPaths={handleClearPaths} />
        <Canvas
          outerRef={outerCanvasRef}
          zoomPanRef={zoomPanRef}
          onCursorMove={broadcastCursor}
          onCardDragBroadcast={broadcastCardDrag}
          onCardDragEndBroadcast={broadcastCardDragEnd}
          onDrawBroadcast={broadcastDrawStroke}
          onDrawEndBroadcast={broadcastDrawStrokeEnd}
        />
      </div>
      <ExportDialog
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        outerRef={outerCanvasRef}
        zoomPanRef={zoomPanRef}
      />
    </div>
  )
}
