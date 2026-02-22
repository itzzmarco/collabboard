'use client'

import { useState } from 'react'
import { toPng, toSvg } from 'html-to-image'
import { Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useBoardStore } from '@/stores/board-store'
import { toast } from '@/hooks/use-toast'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ExportDialogProps {
  open: boolean
  onClose: () => void
  outerRef: React.RefObject<HTMLDivElement | null>
  zoomPanRef: React.RefObject<HTMLDivElement | null>
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Format = 'png' | 'svg'
type Scope = 'viewport' | 'entire'
type BoundingSource = 'cards' | 'include-drawings'

// ---------------------------------------------------------------------------
// Toggle button helper
// ---------------------------------------------------------------------------

function ToggleOption({
  label,
  selected,
  onClick,
}: {
  label: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <Button
      type="button"
      variant={selected ? 'default' : 'outline'}
      size="sm"
      onClick={onClick}
    >
      {label}
    </Button>
  )
}

// ---------------------------------------------------------------------------
// ExportDialog
// ---------------------------------------------------------------------------

export default function ExportDialog({
  open,
  onClose,
  outerRef,
  zoomPanRef,
}: ExportDialogProps) {
  const [format, setFormat] = useState<Format>('png')
  const [scope, setScope] = useState<Scope>('viewport')
  const [boundingSource, setBoundingSource] = useState<BoundingSource>('cards')
  const [isExporting, setIsExporting] = useState(false)

  const handleDialogChange = (isOpen: boolean) => {
    if (!isOpen) onClose()
  }

  const handleExport = async () => {
    const outerEl = outerRef.current
    const zoomPanEl = zoomPanRef.current
    if (!outerEl || !zoomPanEl) {
      toast({ title: 'Export failed', description: 'Canvas not ready.', variant: 'destructive' })
      return
    }

    setIsExporting(true)

    try {
      let dataUrl: string

      if (scope === 'viewport') {
        // Viewport capture — render what's visible
        dataUrl = format === 'png'
          ? await toPng(outerEl, { cacheBust: true })
          : await toSvg(outerEl, { cacheBust: true })
      } else {
        // Entire board capture
        const { cards, paths } = useBoardStore.getState()

        // Compute bounding box
        let minX = Infinity
        let minY = Infinity
        let maxX = -Infinity
        let maxY = -Infinity

        for (const card of cards) {
          minX = Math.min(minX, card.x)
          minY = Math.min(minY, card.y)
          maxX = Math.max(maxX, card.x + card.width)
          maxY = Math.max(maxY, card.y + card.height)
        }

        if (boundingSource === 'include-drawings') {
          for (const path of paths) {
            for (const pt of path.points) {
              minX = Math.min(minX, pt.x)
              minY = Math.min(minY, pt.y)
              maxX = Math.max(maxX, pt.x)
              maxY = Math.max(maxY, pt.y)
            }
          }
        }

        // Fallback if nothing on board
        if (!isFinite(minX)) {
          minX = 0; minY = 0; maxX = 800; maxY = 600
        }

        // Add padding
        const pad = 40
        minX -= pad; minY -= pad; maxX += pad; maxY += pad
        const bboxW = maxX - minX
        const bboxH = maxY - minY

        // Save original styles
        const origOuterStyle = outerEl.style.cssText
        const origZoomPanStyle = zoomPanEl.style.cssText

        // Temporarily modify DOM for full-board capture
        outerEl.style.width = `${bboxW}px`
        outerEl.style.height = `${bboxH}px`
        outerEl.style.overflow = 'hidden'
        outerEl.style.position = 'relative'

        zoomPanEl.style.transform = `translate(${-minX}px, ${-minY}px)`
        zoomPanEl.style.transformOrigin = 'top left'

        // Force layout recalculation
        outerEl.offsetHeight

        try {
          dataUrl = format === 'png'
            ? await toPng(outerEl, { width: bboxW, height: bboxH, cacheBust: true })
            : await toSvg(outerEl, { width: bboxW, height: bboxH, cacheBust: true })
        } finally {
          // Restore original styles
          outerEl.style.cssText = origOuterStyle
          zoomPanEl.style.cssText = origZoomPanStyle
        }
      }

      // Trigger download
      const boardTitle = useBoardStore.getState().boardTitle || 'board'
      const safeName = boardTitle.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase()
      const ext = format === 'png' ? 'png' : 'svg'
      const a = document.createElement('a')
      a.href = dataUrl
      a.download = `${safeName}-export.${ext}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)

      toast({ title: 'Exported', description: `Board exported as ${format.toUpperCase()}.` })
      onClose()
    } catch (err) {
      console.error('Export failed:', err)
      toast({
        title: 'Export failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Export Board</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Format */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Format</label>
            <div className="flex gap-2">
              <ToggleOption label="PNG" selected={format === 'png'} onClick={() => setFormat('png')} />
              <ToggleOption label="SVG" selected={format === 'svg'} onClick={() => setFormat('svg')} />
            </div>
          </div>

          {/* Scope */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Scope</label>
            <div className="flex gap-2">
              <ToggleOption label="Viewport" selected={scope === 'viewport'} onClick={() => setScope('viewport')} />
              <ToggleOption label="Entire board" selected={scope === 'entire'} onClick={() => setScope('entire')} />
            </div>
          </div>

          {/* Bounding source (only for entire board) */}
          {scope === 'entire' && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Bounding box</label>
              <div className="flex gap-2">
                <ToggleOption
                  label="Cards only"
                  selected={boundingSource === 'cards'}
                  onClick={() => setBoundingSource('cards')}
                />
                <ToggleOption
                  label="Include drawings"
                  selected={boundingSource === 'include-drawings'}
                  onClick={() => setBoundingSource('include-drawings')}
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isExporting}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={isExporting}>
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Exporting...
              </>
            ) : (
              'Export'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
