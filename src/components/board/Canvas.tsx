'use client'

import React, { useRef, useCallback, useEffect } from 'react'
import { useBoardStore } from '@/stores/board-store'
import SVGDrawingLayer from './SVGDrawingLayer'
import StickyCard from './StickyCard'
import PresenceCursors from './PresenceCursors'

// ---------------------------------------------------------------------------
// Drag state types (refs, NOT React state, to avoid re-renders during drag)
// ---------------------------------------------------------------------------

interface DragState {
  cardId: string
  offsetX: number
  offsetY: number
  startX: number
  startY: number
}

interface PanState {
  startX: number
  startY: number
}

interface ResizeState {
  cardId: string
  handle: 'nw' | 'ne' | 'sw' | 'se'
  startMouseX: number
  startMouseY: number
  startCardX: number
  startCardY: number
  startWidth: number
  startHeight: number
}

interface PinchState {
  initialDist: number
  initialZoom: number
  midX: number
  midY: number
}

// ---------------------------------------------------------------------------
// Cursor mapping
// ---------------------------------------------------------------------------

const CURSOR_MAP: Record<string, string> = {
  select: 'default',
  pan: 'grab',
  draw: 'crosshair',
  sticky: 'crosshair',
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface CanvasProps {
  outerRef?: React.RefObject<HTMLDivElement | null>
  zoomPanRef?: React.RefObject<HTMLDivElement | null>
  onCursorMove?: (canvasX: number, canvasY: number) => void
  onCardDragBroadcast?: (cardId: string, x: number, y: number) => void
  onCardDragEndBroadcast?: (cardId: string) => void
  onDrawBroadcast?: (
    points: Array<{ x: number; y: number }>,
    color: string,
    size: number,
  ) => void
  onDrawEndBroadcast?: () => void
  onViewportBroadcast?: (pan: { x: number; y: number }, zoom: number) => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function Canvas({
  outerRef,
  zoomPanRef,
  onCursorMove,
  onCardDragBroadcast,
  onCardDragEndBroadcast,
  onDrawBroadcast,
  onDrawEndBroadcast,
  onViewportBroadcast,
}: CanvasProps = {}) {
  // --- Store selectors ---
  const cards = useBoardStore((s) => s.cards)
  const ghostCardPositions = useBoardStore((s) => s.ghostCardPositions)
  const isViewOnly = useBoardStore((s) => s.isViewOnly)
  const tool = useBoardStore((s) => s.tool)
  const zoom = useBoardStore((s) => s.zoom)
  const pan = useBoardStore((s) => s.pan)
  const setPan = useBoardStore((s) => s.setPan)
  const moveCardLocal = useBoardStore((s) => s.moveCardLocal)
  const commitCardMove = useBoardStore((s) => s.commitCardMove)
  const setSelectedCard = useBoardStore((s) => s.setSelectedCard)
  const setEditingCard = useBoardStore((s) => s.setEditingCard)
  const startDrawing = useBoardStore((s) => s.startDrawing)
  const continueDrawing = useBoardStore((s) => s.continueDrawing)
  const finishDrawing = useBoardStore((s) => s.finishDrawing)
  const commitCardResize = useBoardStore((s) => s.commitCardResize)
  const commitPath = useBoardStore((s) => s.commitPath)
  const latestRemoteViewport = useBoardStore((s) => s.latestRemoteViewport)
  const setLatestRemoteViewport = useBoardStore((s) => s.setLatestRemoteViewport)
  const setZoom = useBoardStore((s) => s.setZoom)

  // --- Refs ---
  const boardRef = useRef<HTMLDivElement>(null)
  const draggingRef = useRef<DragState | null>(null)
  const resizingRef = useRef<ResizeState | null>(null)
  const panningRef = useRef<PanState | null>(null)
  const drawingRef = useRef<boolean>(false)
  const pinchRef = useRef<PinchState | null>(null)
  const isLerpingRef = useRef(false)
  const lastBroadcastPan = useRef({ x: 0, y: 0 })
  const lastBroadcastZoom = useRef(1)

  // --- Canvas coord conversion helper ---
  // With transform: scale(zoom) translate(pan.x, pan.y)
  // Screen = (canvas + pan) * zoom  →  canvas = screen / zoom - pan
  const toCanvasCoords = useCallback(
    (clientX: number, clientY: number) => {
      if (!boardRef.current) return { x: 0, y: 0 }
      const rect = boardRef.current.getBoundingClientRect()
      return {
        x: (clientX - rect.left) / zoom - pan.x,
        y: (clientY - rect.top) / zoom - pan.y,
      }
    },
    [pan.x, pan.y, zoom],
  )

  // --- Mouse down ---
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      // View-only guests: left-click drag pans the canvas
      if (isViewOnly) {
        panningRef.current = {
          startX: e.clientX,
          startY: e.clientY,
        }
        return
      }

      const target = e.target as HTMLElement

      // 0. Resize handle detection
      const resizeHandle = target.getAttribute('data-resize-handle') as
        | 'nw' | 'ne' | 'sw' | 'se' | null
      if (resizeHandle && tool === 'select') {
        const cardId = target.getAttribute('data-card-id')
        if (cardId) {
          const card = useBoardStore.getState().cards.find((c) => c.id === cardId)
          if (card) {
            resizingRef.current = {
              cardId,
              handle: resizeHandle,
              startMouseX: e.clientX,
              startMouseY: e.clientY,
              startCardX: card.x,
              startCardY: card.y,
              startWidth: card.width,
              startHeight: card.height,
            }
            setSelectedCard(cardId)
            return
          }
        }
      }

      // 1. Card drag (select tool + clicked on a card)
      const cardEl = target.closest('[data-card-id]') as HTMLElement | null
      if (cardEl && tool === 'select') {
        const cardId = cardEl.getAttribute('data-card-id')!
        const cardRect = cardEl.getBoundingClientRect()

        const offsetX = e.clientX - cardRect.left
        const offsetY = e.clientY - cardRect.top

        // Capture pre-drag position for undo
        const card = useBoardStore.getState().cards.find((c) => c.id === cardId)

        draggingRef.current = {
          cardId,
          offsetX,
          offsetY,
          startX: card?.x ?? 0,
          startY: card?.y ?? 0,
        }
        setSelectedCard(cardId)
        return
      }

      // 2. Drawing (draw tool)
      if (tool === 'draw') {
        const coords = toCanvasCoords(e.clientX, e.clientY)
        startDrawing(coords)
        drawingRef.current = true
        return
      }

      // 3. Panning (pan tool or middle mouse button)
      if (tool === 'pan' || e.button === 1) {
        panningRef.current = {
          startX: e.clientX,
          startY: e.clientY,
        }
        return
      }

      // 4. Select tool on empty space — deselect
      if (tool === 'select') {
        setSelectedCard(null)
        setEditingCard(null)
      }
    },
    [isViewOnly, tool, toCanvasCoords, setSelectedCard, setEditingCard, startDrawing],
  )

  // --- Mouse move ---
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const coords = toCanvasCoords(e.clientX, e.clientY)

      // View-only guests: pan + broadcast cursor only
      if (isViewOnly) {
        if (panningRef.current) {
          const dx = e.clientX - panningRef.current.startX
          const dy = e.clientY - panningRef.current.startY

          setPan({ x: pan.x + dx / zoom, y: pan.y + dy / zoom })
          panningRef.current = {
            startX: e.clientX,
            startY: e.clientY,
          }
        }
        onCursorMove?.(coords.x, coords.y)
        return
      }

      // 0. Resizing
      if (resizingRef.current) {
        const r = resizingRef.current
        const dx = (e.clientX - r.startMouseX) / zoom
        const dy = (e.clientY - r.startMouseY) / zoom

        let newX = r.startCardX
        let newY = r.startCardY
        let newW = r.startWidth
        let newH = r.startHeight

        switch (r.handle) {
          case 'se':
            newW = r.startWidth + dx
            newH = r.startHeight + dy
            break
          case 'sw':
            newW = r.startWidth - dx
            newH = r.startHeight + dy
            newX = r.startCardX + dx
            break
          case 'ne':
            newW = r.startWidth + dx
            newH = r.startHeight - dy
            newY = r.startCardY + dy
            break
          case 'nw':
            newW = r.startWidth - dx
            newH = r.startHeight - dy
            newX = r.startCardX + dx
            newY = r.startCardY + dy
            break
        }

        // Clamp minimum size
        const clampedW = Math.max(120, newW)
        const clampedH = Math.max(100, newH)

        // Adjust position if clamped for nw/ne/sw handles
        if (clampedW !== newW) {
          if (r.handle === 'sw' || r.handle === 'nw') {
            newX = r.startCardX + r.startWidth - clampedW
          }
        }
        if (clampedH !== newH) {
          if (r.handle === 'nw' || r.handle === 'ne') {
            newY = r.startCardY + r.startHeight - clampedH
          }
        }

        moveCardLocal(r.cardId, { x: newX, y: newY, width: clampedW, height: clampedH })
        return
      }

      // 1. Card dragging
      if (draggingRef.current) {
        if (!boardRef.current) return
        const rect = boardRef.current.getBoundingClientRect()
        const { cardId, offsetX, offsetY } = draggingRef.current

        // With transform: scale(zoom) translate(pan)
        // card.x = (clientX - offsetX - rect.left) / zoom - pan.x
        const x = Math.max(
          0,
          (e.clientX - offsetX - rect.left) / zoom - pan.x,
        )
        const y = Math.max(
          0,
          (e.clientY - offsetY - rect.top) / zoom - pan.y,
        )

        moveCardLocal(cardId, { x, y })
        onCardDragBroadcast?.(cardId, x, y)
        return
      }

      // 2. Panning — dx/dy are screen-space, divide by zoom for canvas-space pan
      if (panningRef.current) {
        const dx = e.clientX - panningRef.current.startX
        const dy = e.clientY - panningRef.current.startY

        setPan({ x: pan.x + dx / zoom, y: pan.y + dy / zoom })
        panningRef.current = {
          startX: e.clientX,
          startY: e.clientY,
        }
        return
      }

      // 3. Drawing
      if (drawingRef.current) {
        continueDrawing(coords)
        const currentPath = useBoardStore.getState().currentPath
        if (currentPath) {
          onDrawBroadcast?.(currentPath.points, currentPath.color, currentPath.size)
        }
        return
      }

      // 4. Idle — broadcast cursor position
      onCursorMove?.(coords.x, coords.y)
    },
    [
      isViewOnly,
      pan.x,
      pan.y,
      zoom,
      moveCardLocal,
      setPan,
      toCanvasCoords,
      continueDrawing,
      onCursorMove,
      onCardDragBroadcast,
      onDrawBroadcast,
    ],
  )

  // --- Mouse up ---
  const handleMouseUp = useCallback(() => {
    // View-only guests: only clear panning
    if (isViewOnly) {
      panningRef.current = null
      return
    }

    // 0. Finish resize — commit with undo + persist
    if (resizingRef.current) {
      const r = resizingRef.current
      const card = useBoardStore.getState().cards.find((c) => c.id === r.cardId)
      if (card) {
        commitCardResize(
          r.cardId,
          { x: r.startCardX, y: r.startCardY, width: r.startWidth, height: r.startHeight },
          { x: card.x, y: card.y, width: card.width, height: card.height },
        )
      }
      resizingRef.current = null
      return
    }

    // 1. Finish card drag — commit with undo + persist
    if (draggingRef.current) {
      const { cardId, startX, startY } = draggingRef.current
      commitCardMove(cardId, { x: startX, y: startY })
      onCardDragEndBroadcast?.(cardId)
      draggingRef.current = null
      return
    }

    // 2. Finish panning
    if (panningRef.current) {
      panningRef.current = null
      return
    }

    // 3. Finish drawing
    if (drawingRef.current) {
      const path = finishDrawing()
      if (path) {
        commitPath(path)
      }
      onDrawEndBroadcast?.()
      drawingRef.current = false
    }
  }, [isViewOnly, commitCardResize, commitCardMove, finishDrawing, commitPath, onCardDragEndBroadcast, onDrawEndBroadcast])

  // --- Mouse leave (same as mouse up) ---
  const handleMouseLeave = handleMouseUp

  // ---------------------------------------------------------------------------
  // Touch handlers
  // ---------------------------------------------------------------------------

  const handleTouchStart = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      // Two fingers — pinch-to-zoom
      if (e.touches.length === 2) {
        e.preventDefault()
        const t0 = e.touches[0]
        const t1 = e.touches[1]
        const dist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY)

        const rect = boardRef.current?.getBoundingClientRect()
        const midX = (t0.clientX + t1.clientX) / 2 - (rect?.left ?? 0)
        const midY = (t0.clientY + t1.clientY) / 2 - (rect?.top ?? 0)

        pinchRef.current = {
          initialDist: dist,
          initialZoom: useBoardStore.getState().zoom,
          midX,
          midY,
        }

        // Clear any single-finger state
        draggingRef.current = null
        panningRef.current = null
        drawingRef.current = false
        return
      }

      // One finger
      if (e.touches.length === 1) {
        const touch = e.touches[0]
        const { clientX, clientY } = touch

        if (isViewOnly) {
          panningRef.current = { startX: clientX, startY: clientY }
          return
        }

        const target = document.elementFromPoint(clientX, clientY) as HTMLElement | null
        if (!target) return

        // Resize handle
        const resizeHandle = target.getAttribute('data-resize-handle') as
          | 'nw' | 'ne' | 'sw' | 'se' | null
        if (resizeHandle && tool === 'select') {
          const cardId = target.getAttribute('data-card-id')
          if (cardId) {
            const card = useBoardStore.getState().cards.find((c) => c.id === cardId)
            if (card) {
              resizingRef.current = {
                cardId,
                handle: resizeHandle,
                startMouseX: clientX,
                startMouseY: clientY,
                startCardX: card.x,
                startCardY: card.y,
                startWidth: card.width,
                startHeight: card.height,
              }
              setSelectedCard(cardId)
              return
            }
          }
        }

        // Card drag
        const cardEl = target.closest('[data-card-id]') as HTMLElement | null
        if (cardEl && tool === 'select') {
          const cardId = cardEl.getAttribute('data-card-id')!
          const cardRect = cardEl.getBoundingClientRect()
          const offsetX = clientX - cardRect.left
          const offsetY = clientY - cardRect.top
          const card = useBoardStore.getState().cards.find((c) => c.id === cardId)

          draggingRef.current = {
            cardId,
            offsetX,
            offsetY,
            startX: card?.x ?? 0,
            startY: card?.y ?? 0,
          }
          setSelectedCard(cardId)
          return
        }

        // Drawing
        if (tool === 'draw') {
          const coords = toCanvasCoords(clientX, clientY)
          startDrawing(coords)
          drawingRef.current = true
          return
        }

        // Pan tool or select on empty space — start panning
        panningRef.current = { startX: clientX, startY: clientY }
      }
    },
    [isViewOnly, tool, toCanvasCoords, setSelectedCard, startDrawing],
  )

  const handleTouchMove = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      // Two-finger pinch
      if (e.touches.length === 2 && pinchRef.current) {
        e.preventDefault()
        const t0 = e.touches[0]
        const t1 = e.touches[1]
        const newDist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY)

        const rect = boardRef.current?.getBoundingClientRect()
        const newMidX = (t0.clientX + t1.clientX) / 2 - (rect?.left ?? 0)
        const newMidY = (t0.clientY + t1.clientY) / 2 - (rect?.top ?? 0)

        const newZoom = pinchRef.current.initialZoom * (newDist / pinchRef.current.initialDist)
        const { zoomAtPoint, zoom: currentZoom, pan: currentPan } = useBoardStore.getState()

        zoomAtPoint(newZoom, newMidX, newMidY)

        // Pan by midpoint delta
        const dMidX = newMidX - pinchRef.current.midX
        const dMidY = newMidY - pinchRef.current.midY
        const afterState = useBoardStore.getState()
        setPan({
          x: afterState.pan.x + dMidX / afterState.zoom,
          y: afterState.pan.y + dMidY / afterState.zoom,
        })

        pinchRef.current.midX = newMidX
        pinchRef.current.midY = newMidY
        return
      }

      // One finger
      if (e.touches.length === 1) {
        const touch = e.touches[0]
        const { clientX, clientY } = touch
        const coords = toCanvasCoords(clientX, clientY)

        // View-only: pan + cursor
        if (isViewOnly) {
          if (panningRef.current) {
            const dx = clientX - panningRef.current.startX
            const dy = clientY - panningRef.current.startY
            setPan({ x: pan.x + dx / zoom, y: pan.y + dy / zoom })
            panningRef.current = { startX: clientX, startY: clientY }
          }
          onCursorMove?.(coords.x, coords.y)
          return
        }

        // Resizing
        if (resizingRef.current) {
          const r = resizingRef.current
          const dx = (clientX - r.startMouseX) / zoom
          const dy = (clientY - r.startMouseY) / zoom

          let newX = r.startCardX
          let newY = r.startCardY
          let newW = r.startWidth
          let newH = r.startHeight

          switch (r.handle) {
            case 'se':
              newW = r.startWidth + dx
              newH = r.startHeight + dy
              break
            case 'sw':
              newW = r.startWidth - dx
              newH = r.startHeight + dy
              newX = r.startCardX + dx
              break
            case 'ne':
              newW = r.startWidth + dx
              newH = r.startHeight - dy
              newY = r.startCardY + dy
              break
            case 'nw':
              newW = r.startWidth - dx
              newH = r.startHeight - dy
              newX = r.startCardX + dx
              newY = r.startCardY + dy
              break
          }

          const clampedW = Math.max(120, newW)
          const clampedH = Math.max(100, newH)

          if (clampedW !== newW) {
            if (r.handle === 'sw' || r.handle === 'nw') {
              newX = r.startCardX + r.startWidth - clampedW
            }
          }
          if (clampedH !== newH) {
            if (r.handle === 'nw' || r.handle === 'ne') {
              newY = r.startCardY + r.startHeight - clampedH
            }
          }

          moveCardLocal(r.cardId, { x: newX, y: newY, width: clampedW, height: clampedH })
          return
        }

        // Card dragging
        if (draggingRef.current) {
          if (!boardRef.current) return
          const rect = boardRef.current.getBoundingClientRect()
          const { cardId, offsetX, offsetY } = draggingRef.current

          const x = Math.max(0, (clientX - offsetX - rect.left) / zoom - pan.x)
          const y = Math.max(0, (clientY - offsetY - rect.top) / zoom - pan.y)

          moveCardLocal(cardId, { x, y })
          onCardDragBroadcast?.(cardId, x, y)
          return
        }

        // Panning
        if (panningRef.current) {
          const dx = clientX - panningRef.current.startX
          const dy = clientY - panningRef.current.startY
          setPan({ x: pan.x + dx / zoom, y: pan.y + dy / zoom })
          panningRef.current = { startX: clientX, startY: clientY }
          return
        }

        // Drawing
        if (drawingRef.current) {
          continueDrawing(coords)
          const currentPath = useBoardStore.getState().currentPath
          if (currentPath) {
            onDrawBroadcast?.(currentPath.points, currentPath.color, currentPath.size)
          }
          return
        }

        onCursorMove?.(coords.x, coords.y)
      }
    },
    [
      isViewOnly,
      pan.x,
      pan.y,
      zoom,
      moveCardLocal,
      setPan,
      toCanvasCoords,
      continueDrawing,
      onCursorMove,
      onCardDragBroadcast,
      onDrawBroadcast,
    ],
  )

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      // Clear pinch state
      pinchRef.current = null

      // View-only: clear panning
      if (isViewOnly) {
        panningRef.current = null
        return
      }

      // Finish resize
      if (resizingRef.current) {
        const r = resizingRef.current
        const card = useBoardStore.getState().cards.find((c) => c.id === r.cardId)
        if (card) {
          commitCardResize(
            r.cardId,
            { x: r.startCardX, y: r.startCardY, width: r.startWidth, height: r.startHeight },
            { x: card.x, y: card.y, width: card.width, height: card.height },
          )
        }
        resizingRef.current = null
        return
      }

      // Finish card drag
      if (draggingRef.current) {
        const { cardId, startX, startY } = draggingRef.current
        commitCardMove(cardId, { x: startX, y: startY })
        onCardDragEndBroadcast?.(cardId)
        draggingRef.current = null
        return
      }

      // Finish panning — check if it was a tap (delta < 8px)
      if (panningRef.current) {
        if (e.changedTouches.length > 0) {
          const touch = e.changedTouches[0]
          const dx = touch.clientX - panningRef.current.startX
          const dy = touch.clientY - panningRef.current.startY
          const dist = Math.hypot(dx, dy)
          if (dist < 8) {
            // Tap on empty space → deselect
            setSelectedCard(null)
            setEditingCard(null)
          }
        }
        panningRef.current = null
        return
      }

      // Finish drawing
      if (drawingRef.current) {
        const path = finishDrawing()
        if (path) {
          commitPath(path)
        }
        onDrawEndBroadcast?.()
        drawingRef.current = false
      }
    },
    [isViewOnly, commitCardResize, commitCardMove, finishDrawing, commitPath, setSelectedCard, setEditingCard, onCardDragEndBroadcast, onDrawEndBroadcast],
  )

  // --- Wheel handler: cursor-centered Ctrl+Scroll zoom ---
  useEffect(() => {
    const el = boardRef.current
    if (!el) return

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        const rect = el.getBoundingClientRect()
        const pivotX = e.clientX - rect.left
        const pivotY = e.clientY - rect.top
        const delta = e.deltaY > 0 ? -0.1 : 0.1
        const { zoom: currentZoom, zoomAtPoint } = useBoardStore.getState()
        zoomAtPoint(currentZoom + delta, pivotX, pivotY)
      }
    }

    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => {
      el.removeEventListener('wheel', handleWheel)
    }
  }, [])

  // --- Broadcast local viewport changes to remote peers ---
  useEffect(() => {
    if (isLerpingRef.current) return
    const panDelta = Math.hypot(
      pan.x - lastBroadcastPan.current.x,
      pan.y - lastBroadcastPan.current.y,
    )
    const zoomDelta = Math.abs(zoom - lastBroadcastZoom.current)
    if (panDelta > 5 || zoomDelta > 0.05) {
      onViewportBroadcast?.(pan, zoom)
      lastBroadcastPan.current = { x: pan.x, y: pan.y }
      lastBroadcastZoom.current = zoom
    }
  }, [pan.x, pan.y, zoom, onViewportBroadcast])

  // --- Lerp toward latest remote viewport ---
  useEffect(() => {
    if (!latestRemoteViewport) return

    isLerpingRef.current = true
    let rafId: number
    let prevTs: number | null = null

    const loop = (ts: number) => {
      if (prevTs === null) {
        prevTs = ts
      }
      const frameDt = ts - prevTs
      prevTs = ts

      // If user is actively interacting, keep lerp pending and reschedule
      if (panningRef.current || pinchRef.current) {
        prevTs = null
        rafId = requestAnimationFrame(loop)
        return
      }

      const alpha = 1 - Math.exp(-frameDt / 200)
      const { pan: curPan, zoom: curZoom } = useBoardStore.getState()
      const target = latestRemoteViewport

      const newPanX = curPan.x + (target.pan.x - curPan.x) * alpha
      const newPanY = curPan.y + (target.pan.y - curPan.y) * alpha
      const newZoom = curZoom + (target.zoom - curZoom) * alpha

      const panClose =
        Math.hypot(newPanX - target.pan.x, newPanY - target.pan.y) < 0.5
      const zoomClose = Math.abs(newZoom - target.zoom) < 0.005

      if (panClose && zoomClose) {
        setPan({ x: target.pan.x, y: target.pan.y })
        setZoom(target.zoom)
        isLerpingRef.current = false
        setLatestRemoteViewport(null)
        return
      }

      setPan({ x: newPanX, y: newPanY })
      setZoom(newZoom)
      rafId = requestAnimationFrame(loop)
    }

    rafId = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(rafId)
      isLerpingRef.current = false
    }
  }, [latestRemoteViewport, setPan, setZoom, setLatestRemoteViewport])

  // --- Ref callback to assign both boardRef and outerRef ---
  const setOuterRef = useCallback(
    (node: HTMLDivElement | null) => {
      (boardRef as React.MutableRefObject<HTMLDivElement | null>).current = node
      if (outerRef) {
        (outerRef as React.MutableRefObject<HTMLDivElement | null>).current = node
      }
    },
    [outerRef],
  )

  // --- Cursor ---
  const cursor = isViewOnly ? 'grab' : (CURSOR_MAP[tool] ?? 'default')

  return (
    <div
      ref={setOuterRef}
      className="flex-1 relative overflow-hidden bg-background touch-none"
      style={{ cursor }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Presence cursors (screen space, outside zoom/pan) */}
      <PresenceCursors />

      {/* Grid background */}
      <div
        className="absolute inset-0 grid-bg"
        style={{
          backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
          backgroundPosition: `${pan.x * zoom}px ${pan.y * zoom}px`,
        }}
      />

      {/* Zoomable / pannable layer — scale then translate */}
      <div
        ref={zoomPanRef as React.RefObject<HTMLDivElement> | undefined}
        className="absolute inset-0"
        style={{
          transformOrigin: 'top left',
          transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`,
        }}
      >
        {/* SVG drawing layer */}
        <SVGDrawingLayer />

        {/* Sticky cards */}
        {cards.map((card) => (
          <StickyCard key={card.id} card={card} />
        ))}

        {/* Ghost card positions (remote in-progress drags) */}
        {Object.entries(ghostCardPositions).map(([cardId, pos]) => {
          const card = cards.find((c) => c.id === cardId)
          if (!card) return null
          return (
            <div
              key={cardId}
              className="pointer-events-none absolute rounded-lg border-2 border-dashed border-slate-400 bg-slate-100"
              style={{
                left: pos.x,
                top: pos.y,
                width: card.width,
                height: card.height,
                opacity: 0.4,
                pointerEvents: 'none',
              }}
            />
          )
        })}
      </div>
    </div>
  )
}
