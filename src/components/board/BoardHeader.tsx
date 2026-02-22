'use client'

import { useState, useEffect, useRef } from 'react'
import {
  LayoutGrid,
  Share2,
  Download,
  Check,
  Loader2,
  Undo2,
  Redo2,
} from 'lucide-react'
import { useBoardStore } from '@/stores/board-store'
import type { SaveStatus } from '@/stores/board-store'
import CollaboratorAvatars from './CollaboratorAvatars'
import ShareModal from './ShareModal'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface BoardHeaderProps {
  onTitleSave: (title: string) => void
  onExport?: () => void
}

// ---------------------------------------------------------------------------
// Save-status indicator
// ---------------------------------------------------------------------------

function SaveStatusIndicator({ status }: { status: SaveStatus }) {
  if (status === 'saving') {
    return (
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        Saving...
      </span>
    )
  }

  // status === 'saved' or 'idle' — show persistent "Saved ✓"
  if (status === 'saved' || status === 'idle') {
    return (
      <span className="flex items-center gap-1 text-xs text-green-600">
        <Check className="h-3 w-3" />
        Saved
      </span>
    )
  }

  // status === 'error'
  return (
    <span className="text-xs text-red-500">Save failed</span>
  )
}

// ---------------------------------------------------------------------------
// BoardHeader
// ---------------------------------------------------------------------------

export default function BoardHeader({ onTitleSave, onExport }: BoardHeaderProps) {
  const boardId = useBoardStore((s) => s.boardId)
  const boardTitle = useBoardStore((s) => s.boardTitle)
  const saveStatus = useBoardStore((s) => s.saveStatus)
  const isViewOnly = useBoardStore((s) => s.isViewOnly)
  const undoStack = useBoardStore((s) => s.undoStack)
  const redoStack = useBoardStore((s) => s.redoStack)
  const undo = useBoardStore((s) => s.undo)
  const redo = useBoardStore((s) => s.redo)

  const [shareOpen, setShareOpen] = useState(false)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Clean up debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [])

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value

    // Update store immediately for responsive UI
    useBoardStore.getState().setSaveStatus('idle')

    // Debounce the save callback
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    debounceRef.current = setTimeout(() => {
      onTitleSave(newTitle)
    }, 500)

    // Update local display immediately via controlled input
    useBoardStore.setState({ boardTitle: newTitle })
  }

  const handleExport = () => {
    onExport?.()
  }

  const handleShare = () => {
    setShareOpen(true)
  }

  return (
    <header className="flex h-[52px] shrink-0 items-center justify-between border-b bg-white px-4 shadow-sm">
      {/* ---- Left side ---- */}
      <div className="flex items-center gap-2">
        {/* Icon box */}
        <div className="flex h-7 w-7 items-center justify-center rounded-md border bg-background">
          <LayoutGrid className="h-3.5 w-3.5 text-muted-foreground" />
        </div>

        {/* Inline editable title (read-only for guests) */}
        {isViewOnly ? (
          <span className="px-2 py-1 text-sm font-semibold text-foreground">
            {boardTitle}
          </span>
        ) : (
          <input
            type="text"
            value={boardTitle}
            onChange={handleTitleChange}
            className="w-[200px] rounded-md bg-transparent px-2 py-1 text-sm font-semibold text-foreground outline-none hover:bg-slate-100 focus:bg-slate-100"
          />
        )}

        {/* Save status (owner only) */}
        {!isViewOnly && <SaveStatusIndicator status={saveStatus} />}

        {/* View-only badge */}
        {isViewOnly && (
          <span className="rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-amber-200">
            View only
          </span>
        )}

        {/* Undo / Redo (owner only) */}
        {!isViewOnly && (
          <div className="flex items-center gap-0.5 ml-2">
            <button
              type="button"
              title="Undo (Ctrl+Z)"
              disabled={undoStack.length === 0}
              onClick={undo}
              className="flex items-center justify-center rounded-md p-1.5 text-muted-foreground hover:bg-slate-100 hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-muted-foreground transition"
            >
              <Undo2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              title="Redo (Ctrl+Y)"
              disabled={redoStack.length === 0}
              onClick={redo}
              className="flex items-center justify-center rounded-md p-1.5 text-muted-foreground hover:bg-slate-100 hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-muted-foreground transition"
            >
              <Redo2 className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* ---- Right side ---- */}
      <div className="flex items-center gap-2">
        <CollaboratorAvatars />
        {!isViewOnly && (
          <>
            {/* Export button (active stub) */}
            <button
              type="button"
              onClick={handleExport}
              className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-slate-100 hover:text-foreground transition"
            >
              <Download className="h-3.5 w-3.5" />
              Export
            </button>

            {/* Share button */}
            <button
              type="button"
              onClick={handleShare}
              className="flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition"
            >
              <Share2 className="h-3.5 w-3.5" />
              Share
            </button>
          </>
        )}
      </div>

      {/* ---- Share Modal ---- */}
      {!isViewOnly && boardId && (
        <ShareModal
          boardId={boardId}
          boardTitle={boardTitle}
          open={shareOpen}
          onClose={() => setShareOpen(false)}
        />
      )}
    </header>
  )
}
