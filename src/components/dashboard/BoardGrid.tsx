'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { MoreHorizontal, ExternalLink, Pencil, Trash2 } from 'lucide-react'
import { motion, AnimatePresence, useMotionValue, animate } from 'framer-motion'
import { useWindowVirtualizer } from '@tanstack/react-virtual'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { NewBoardModal } from './NewBoardModal'
import { EmptyState } from './EmptyState'
import { renameBoard, deleteBoard } from '@/app/actions/board'
import { useToast } from '@/hooks/use-toast'
import type { Board } from '@/types'

const COLOR_MAP = ['#fef9c3', '#dbeafe', '#dcfce7', '#fce7f3', '#f3e8ff', '#ffedd5']

function formatRelativeTime(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffM = Math.floor(diffMs / 60000)
  const diffH = Math.floor(diffMs / 3600000)
  const diffD = Math.floor(diffMs / 86400000)
  if (diffM < 1) return "just now"
  if (diffM < 60) return `${diffM}m ago`
  if (diffH < 24) return `${diffH}h ago`
  if (diffD === 1) return "yesterday"
  if (diffD < 7) return `${diffD} days ago`
  return d.toLocaleDateString()
}

type BoardCardProps = {
  board: Board
  cardColors: number[]
  onRename?: (boardId: string, newTitle: string) => Promise<void>
  onDelete?: (boardId: string) => Promise<void>
}

function BoardCard({ board, cardColors, onRename, onDelete }: BoardCardProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isRenaming, setIsRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState(board.title)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [loading, setLoading] = useState(false)
  const x = useMotionValue(0)

  useEffect(() => {
    if (!isRenaming) setRenameValue(board.title)
  }, [board.title, isRenaming])

  async function handleRename() {
    const newTitle = renameValue.trim() || board.title
    if (newTitle === board.title) {
      setIsRenaming(false)
      return
    }
    setLoading(true)
    if (onRename) {
      await onRename(board.id, newTitle)
    } else {
      const result = await renameBoard(board.id, newTitle)
      if (result?.error) {
        toast({ title: 'Error', description: result.error, variant: 'destructive' })
        setLoading(false)
        return
      }
      router.refresh()
    }
    setLoading(false)
    setIsRenaming(false)
  }

  async function handleDelete() {
    setLoading(true)
    if (onDelete) {
      await onDelete(board.id)
    } else {
      const result = await deleteBoard(board.id)
      if (result?.error) {
        toast({ title: 'Error', description: result.error, variant: 'destructive' })
        setLoading(false)
        return
      }
      setShowDeleteDialog(false)
      router.refresh()
    }
    setLoading(false)
    setShowDeleteDialog(false)
  }

  function handleCardClick(e: React.MouseEvent) {
    const target = e.target as HTMLElement
    if (
      target.closest("[data-board-card-menu]") ||
      target.closest("input")
    ) {
      return
    }
    router.push(`/board/${board.id}`)
  }

  return (
    <>
      <div className="relative overflow-hidden rounded-xl">
        <div className="absolute inset-y-0 right-0 w-[72px] flex items-center justify-center bg-red-500 rounded-r-xl">
          <Trash2 className="text-white h-5 w-5" />
        </div>
        <motion.div
          style={{ x }}
          role="button"
          aria-label={board.title}
          tabIndex={0}
          onClick={handleCardClick}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault()
              const target = e.target as HTMLElement
              if (
                target.closest("[data-board-card-menu]") ||
                target.closest("input")
              ) {
                return
              }
              router.push(`/board/${board.id}`)
            }
          }}
          drag="x"
          dragConstraints={{ left: -72, right: 0 }}
          dragElastic={0.05}
          onDragEnd={(_, info) => {
            if (info.offset.x <= -60) {
              setShowDeleteDialog(true)
            } else {
              animate(x, 0, { type: "spring", stiffness: 300, damping: 30 })
            }
          }}
          className="flex cursor-pointer flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 relative z-10"
        >
        <div
          className={
            cardColors.length === 0
              ? 'flex h-24 flex-wrap items-end gap-1 border-b bg-slate-50 p-2'
              : 'flex h-24 flex-wrap items-end gap-1 border-b bg-muted/30 p-2'
          }
        >
          {cardColors.length === 0
            ? null
            : cardColors.slice(0, 3).map((ci, i) => (
                <div
                  key={i}
                  className="rounded border border-black/10"
                  style={{
                    width: 32,
                    height: 28,
                    backgroundColor: COLOR_MAP[ci % COLOR_MAP.length],
                  }}
                />
              ))}
        </div>
        <div className="flex flex-1 flex-col gap-1 p-3">
          <div className="flex items-center justify-between gap-2">
            {isRenaming ? (
              <Input
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={handleRename}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleRename()
                  if (e.key === "Escape") {
                    setRenameValue(board.title)
                    setIsRenaming(false)
                  }
                }}
                onClick={(e) => e.stopPropagation()}
                className="h-8 flex-1"
                autoFocus
                disabled={loading}
              />
            ) : (
              <span className="truncate font-medium">{board.title}</span>
            )}
            <div data-board-card-menu onClick={(e) => e.stopPropagation()}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-11 w-11 sm:h-8 sm:w-8 shrink-0" aria-label="Board options">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => router.push(`/board/${board.id}`)}
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Open
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setIsRenaming(true)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Rename
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setShowDeleteDialog(true)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          <span className="text-xs text-muted-foreground">
            Updated {formatRelativeTime(board.updated_at)}
          </span>
        </div>
        </motion.div>
      </div>

      <Dialog 
        open={showDeleteDialog} 
        onOpenChange={(open) => {
          setShowDeleteDialog(open)
          if (!open) {
            animate(x, 0, { type: "spring", stiffness: 300, damping: 30 })
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete board?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Delete this board? This cannot be undone.
          </p>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={loading}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } }
}

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" as const } },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } },
}

export function BoardGrid({
  boards,
  cardColorMap,
}: {
  boards: Board[]
  cardColorMap: Record<string, number[]>
}) {
  const router = useRouter()
  const { toast } = useToast()
  const [modalOpen, setModalOpen] = useState(false)
  const [localBoards, setLocalBoards] = useState(boards)

  useEffect(() => {
    setLocalBoards(boards)
  }, [boards])

  async function handleRename(boardId: string, newTitle: string) {
    setLocalBoards((prev) =>
      prev.map((b) =>
        b.id === boardId ? { ...b, title: newTitle, updated_at: new Date().toISOString() } : b
      )
    )
    const result = await renameBoard(boardId, newTitle)
    if (result?.error) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' })
      router.refresh()
      return
    }
    router.refresh()
  }

  async function handleDelete(boardId: string) {
    setLocalBoards((prev) => prev.filter((b) => b.id !== boardId))
    const result = await deleteBoard(boardId)
    if (result?.error) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' })
      router.refresh()
      return
    }
    router.refresh()
  }

  if (localBoards.length === 0) {
    return (
      <>
        <EmptyState onNewBoard={() => setModalOpen(true)} />
        <NewBoardModal open={modalOpen} onOpenChange={setModalOpen} />
      </>
    )
  }

  if (localBoards.length > 20) {
    return (
      <VirtualizedBoardGrid
        boards={localBoards}
        cardColorMap={cardColorMap}
        handleRename={handleRename}
        handleDelete={handleDelete}
      />
    )
  }

  return (
    <motion.div 
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      role="grid"
      aria-label="Your boards"
    >
      <AnimatePresence mode="popLayout">
        {localBoards.map((board) => (
          <motion.div
            key={board.id}
            variants={cardVariants}
            layout
            whileHover={{ y: -3, transition: { duration: 0.15 } }}
          >
            <BoardCard
              board={board}
              cardColors={cardColorMap[board.id] ?? []}
              onRename={handleRename}
              onDelete={handleDelete}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  )
}

function VirtualizedBoardGrid({
  boards,
  cardColorMap,
  handleRename,
  handleDelete,
}: {
  boards: Board[]
  cardColorMap: Record<string, number[]>
  handleRename: (id: string, newTitle: string) => Promise<void>
  handleDelete: (id: string) => Promise<void>
}) {
  const [columns, setColumns] = useState(1)

  useEffect(() => {
    const updateColumns = () => {
      if (window.innerWidth >= 1024) setColumns(4)
      else if (window.innerWidth >= 640) setColumns(2)
      else setColumns(1)
    }
    updateColumns()
    window.addEventListener('resize', updateColumns)
    return () => window.removeEventListener('resize', updateColumns)
  }, [])

  const rows = Math.ceil(boards.length / columns)

  const rowVirtualizer = useWindowVirtualizer({
    count: rows,
    estimateSize: () => 160,
    overscan: 2,
  })

  return (
    <div
      style={{
        height: `${rowVirtualizer.getTotalSize()}px`,
        width: '100%',
        position: 'relative',
      }}
      role="grid"
      aria-label="Your boards"
    >
      {rowVirtualizer.getVirtualItems().map((virtualRow) => {
        const rowBoards = boards.slice(
          virtualRow.index * columns,
          (virtualRow.index + 1) * columns
        )
        return (
          <motion.div
            key={virtualRow.index}
            ref={rowVirtualizer.measureElement}
            data-index={virtualRow.index}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${virtualRow.start}px)`,
            }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pb-4"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <AnimatePresence mode="popLayout">
              {rowBoards.map((board) => (
                <motion.div
                  key={board.id}
                  variants={cardVariants}
                  layout
                  whileHover={{ y: -3, transition: { duration: 0.15 } }}
                >
                  <BoardCard
                    board={board}
                    cardColors={cardColorMap[board.id] ?? []}
                    onRename={handleRename}
                    onDelete={handleDelete}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )
      })}
    </div>
  )
}
