'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { TemplateSelector } from './TemplateSelector'
import Link from 'next/link'
import { createBoard, type Template } from '@/app/actions/board'

export function NewBoardModal({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [name, setName] = useState('Untitled Board')
  const [template, setTemplate] = useState<Template>('blank')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      setName('Untitled Board')
      setTemplate('blank')
      setError(null)
    }
  }, [open])

  function handleCreate() {
    setError(null)
    startTransition(async () => {
      const result = await createBoard(name.trim() || 'Untitled Board', template)
      if ('boardId' in result) {
        router.push('/board/' + result.boardId)
        setName('Untitled Board')
        setTemplate('blank')
        setError(null)
        onOpenChange(false)
      } else {
        setError(result.error)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[480px]">
        <DialogHeader>
          <DialogTitle>New Board</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="board-name">Board name</Label>
            <Input
              id="board-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1.5"
            />
            {error && (
              error === 'limit_reached' ? (
                <p className="text-sm text-red-500 mt-1.5">
                  You&apos;ve reached the 5-board limit on the Free plan.{' '}
                  <Link href="/pricing" className="font-medium underline hover:no-underline">
                    Upgrade for unlimited boards
                  </Link>
                </p>
              ) : (
                <p className="text-sm text-red-500 mt-1.5">{error}</p>
              )
            )}
          </div>
          <div>
            <Label className="text-sm text-slate-600">Start from a template</Label>
            <TemplateSelector selected={template} onChange={setTemplate} />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button
            className="bg-slate-800 text-white hover:bg-slate-900"
            disabled={isPending}
            onClick={handleCreate}
          >
            Create Board
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
