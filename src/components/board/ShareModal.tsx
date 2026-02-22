'use client'

import { useState, useEffect, useCallback } from 'react'
import { Copy, Check, Link, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  generateShareToken,
  revokeShareToken,
  getShareTokens,
} from '@/app/actions/share'
import { toast } from '@/hooks/use-toast'
import type { BoardShareToken } from '@/types'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ShareModalProps {
  boardId: string
  boardTitle: string
  open: boolean
  onClose: () => void
}

// ---------------------------------------------------------------------------
// Expiry options
// ---------------------------------------------------------------------------

const EXPIRY_OPTIONS = [
  { label: '7 days', days: 7 },
  { label: '14 days', days: 14 },
  { label: '30 days', days: 30 },
  { label: 'Custom', days: 0 },
] as const

// ---------------------------------------------------------------------------
// ShareModal
// ---------------------------------------------------------------------------

export default function ShareModal({ boardId, boardTitle, open, onClose }: ShareModalProps) {
  const [tokens, setTokens] = useState<BoardShareToken[]>([])
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState<'view' | 'edit' | null>(null)
  const [copiedPerm, setCopiedPerm] = useState<'view' | 'edit' | null>(null)
  const [revoking, setRevoking] = useState<'view' | 'edit' | null>(null)

  // Fetch existing tokens when modal opens
  const fetchTokens = useCallback(async () => {
    if (!boardId) return
    setLoading(true)
    const result = await getShareTokens(boardId)
    if ('error' in result) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' })
    } else {
      setTokens(result.tokens)
    }
    setLoading(false)
  }, [boardId])

  useEffect(() => {
    if (open) {
      fetchTokens()
      setRevoking(null)
    }
  }, [open, fetchTokens])

  // Find the single token per permission (unique constraint)
  const viewToken = tokens.find((t) => t.permission === 'view') ?? null
  const editToken = tokens.find((t) => t.permission === 'edit') ?? null

  // Generate a new share link (replaces any existing one for this permission)
  const handleGenerate = async (permission: 'view' | 'edit', days: number) => {
    setGenerating(permission)
    const result = await generateShareToken(boardId, permission, days)
    if ('error' in result) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' })
    } else {
      // Refetch to get the full token row
      await fetchTokens()
      toast({
        title: 'Link created',
        description: `${permission === 'view' ? 'View-only' : 'Edit'} link generated.`,
      })
    }
    setGenerating(null)
  }

  // Copy share URL to clipboard
  const handleCopy = async (token: BoardShareToken) => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
    const url = `${baseUrl}/board/${token.board_id}?token=${token.token}`
    await navigator.clipboard.writeText(url)
    setCopiedPerm(token.permission as 'view' | 'edit')
    setTimeout(() => setCopiedPerm(null), 2000)
  }

  // Revoke — step 1: show confirmation
  const handleRevokeClick = (permission: 'view' | 'edit') => {
    setRevoking(permission)
  }

  // Revoke — step 2: confirm
  const handleRevokeConfirm = async (permission: 'view' | 'edit') => {
    const result = await revokeShareToken(boardId, permission)
    if (result.error) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' })
    } else {
      setTokens((prev) => prev.filter((t) => t.permission !== permission))
      toast({ title: 'Link revoked' })
    }
    setRevoking(null)
  }

  // Format expiry
  const formatExpiry = (expiresAt: string) => {
    const diff = new Date(expiresAt).getTime() - Date.now()
    if (diff <= 0) return 'Expired'
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
    if (days === 1) return '1 day left'
    return `${days} days left`
  }

  const handleDialogChange = (isOpen: boolean) => {
    if (!isOpen) onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share this board</DialogTitle>
          <DialogDescription>
            {boardTitle} · Owned by you
          </DialogDescription>
        </DialogHeader>

        {/* ---- View link section ---- */}
        <LinkSection
          permission="view"
          badgeLabel="View only"
          badgeColor="bg-green-50 text-green-700 ring-green-200"
          description="Anyone with this link can view the board."
          token={viewToken}
          loading={loading}
          generating={generating}
          copiedPerm={copiedPerm}
          revoking={revoking}
          boardId={boardId}
          onGenerate={handleGenerate}
          onCopy={handleCopy}
          onRevokeClick={handleRevokeClick}
          onRevokeConfirm={handleRevokeConfirm}
          onRevokeCancel={() => setRevoking(null)}
          formatExpiry={formatExpiry}
        />

        {/* ---- Edit link section ---- */}
        <LinkSection
          permission="edit"
          badgeLabel="Can edit"
          badgeColor="bg-blue-50 text-blue-700 ring-blue-200"
          description="Anyone with this link can edit (sign-in required)."
          token={editToken}
          loading={loading}
          generating={generating}
          copiedPerm={copiedPerm}
          revoking={revoking}
          boardId={boardId}
          onGenerate={handleGenerate}
          onCopy={handleCopy}
          onRevokeClick={handleRevokeClick}
          onRevokeConfirm={handleRevokeConfirm}
          onRevokeCancel={() => setRevoking(null)}
          formatExpiry={formatExpiry}
        />
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// LinkSection — one section per permission level
// ---------------------------------------------------------------------------

function LinkSection({
  permission,
  badgeLabel,
  badgeColor,
  description,
  token,
  loading,
  generating,
  copiedPerm,
  revoking,
  boardId,
  onGenerate,
  onCopy,
  onRevokeClick,
  onRevokeConfirm,
  onRevokeCancel,
  formatExpiry,
}: {
  permission: 'view' | 'edit'
  badgeLabel: string
  badgeColor: string
  description: string
  token: BoardShareToken | null
  loading: boolean
  generating: 'view' | 'edit' | null
  copiedPerm: 'view' | 'edit' | null
  revoking: 'view' | 'edit' | null
  boardId: string
  onGenerate: (permission: 'view' | 'edit', days: number) => void
  onCopy: (token: BoardShareToken) => void
  onRevokeClick: (permission: 'view' | 'edit') => void
  onRevokeConfirm: (permission: 'view' | 'edit') => void
  onRevokeCancel: () => void
  formatExpiry: (expiresAt: string) => string
}) {
  const [expiryDays, setExpiryDays] = useState(7)
  const [customDays, setCustomDays] = useState(7)
  const [showCustom, setShowCustom] = useState(false)
  const effectiveDays = showCustom ? customDays : expiryDays

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const shareUrl = token ? `${baseUrl}/board/${boardId}?token=${token.token}` : ''
  const expired = token ? new Date(token.expires_at) < new Date() : false

  return (
    <div className="space-y-2 rounded-lg border p-3">
      {/* Header row */}
      <div className="flex items-center gap-2">
        <Badge
          variant="outline"
          className={`ring-1 text-[11px] ${badgeColor}`}
        >
          {badgeLabel}
        </Badge>
        {token && !expired && (
          <span className="text-[11px] text-muted-foreground">
            {formatExpiry(token.expires_at)}
          </span>
        )}
        {token && expired && (
          <span className="text-[11px] text-red-500">Expired</span>
        )}
      </div>

      <p className="text-xs text-muted-foreground">{description}</p>

      {/* Expiry selector */}
      <div className="flex items-center gap-2 text-sm flex-wrap">
        <span className="text-muted-foreground shrink-0">Link expires in:</span>
        <div className="flex gap-1 flex-wrap">
          {EXPIRY_OPTIONS.map((opt) => (
            <button
              key={opt.label}
              onClick={() => {
                if (opt.days === 0) {
                  setShowCustom(true)
                } else {
                  setShowCustom(false)
                  setExpiryDays(opt.days)
                }
              }}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                (opt.days === 0 && showCustom) ||
                (opt.days !== 0 && !showCustom && expiryDays === opt.days)
                  ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200'
                  : 'text-muted-foreground hover:bg-slate-100'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {showCustom && (
          <div className="flex items-center gap-1">
            <Input
              type="number"
              min={1}
              max={365}
              value={customDays}
              onChange={(e) => setCustomDays(Math.max(1, Number(e.target.value)))}
              className="w-16 h-7 text-xs"
            />
            <span className="text-xs text-muted-foreground">days</span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-3">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      ) : token && !expired ? (
        <>
          {/* URL row */}
          <div className="flex items-center gap-1.5">
            <Input
              readOnly
              value={shareUrl}
              className="h-8 text-xs font-mono bg-slate-50"
              onClick={(e) => (e.target as HTMLInputElement).select()}
            />
            <Button
              variant="outline"
              size="sm"
              className="shrink-0 h-8 px-2.5"
              onClick={() => onCopy(token)}
            >
              {copiedPerm === permission ? (
                <>
                  <Check className="h-3.5 w-3.5 text-green-600" />
                  <span className="text-xs">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span className="text-xs">Copy</span>
                </>
              )}
            </Button>
          </div>

          {/* Revoke confirmation */}
          {revoking === permission ? (
            <div className="rounded-md bg-red-50 p-2.5 space-y-2">
              <p className="text-xs text-red-700">
                Revoke this link? Anyone using it will lose access.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => onRevokeConfirm(permission)}
                >
                  Confirm
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={onRevokeCancel}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => onRevokeClick(permission)}
              className="text-xs text-muted-foreground hover:text-red-500 transition underline"
            >
              Revoke
            </button>
          )}
        </>
      ) : (
        /* No token or expired → generate button */
        <Button
          variant="outline"
          size="sm"
          onClick={() => onGenerate(permission, effectiveDays)}
          disabled={generating !== null}
          className="w-full"
        >
          {generating === permission ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Link className="h-3.5 w-3.5" />
          )}
          {expired ? 'Regenerate link' : 'Generate link'}
        </Button>
      )}
    </div>
  )
}
