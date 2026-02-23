'use server'

import crypto from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import type { BoardShareToken } from '@/types'

// ---------------------------------------------------------------------------
// JWT helpers (manual HMAC-SHA256 — no jsonwebtoken dependency)
// ---------------------------------------------------------------------------

function base64url(input: string | Buffer): string {
  const buf = typeof input === 'string' ? Buffer.from(input, 'utf-8') : input
  return buf.toString('base64url')
}

function signJwt(payload: Record<string, unknown>): string {
  const secret = process.env.SUPABASE_JWT_SECRET
  if (!secret) throw new Error('SUPABASE_JWT_SECRET is not set')

  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body = base64url(JSON.stringify(payload))
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${header}.${body}`)
    .digest('base64url')

  return `${header}.${body}.${signature}`
}

// ---------------------------------------------------------------------------
// mintBoardViewJwt — view-scoped JWT for read-only board access
// ---------------------------------------------------------------------------

export async function mintBoardViewJwt(boardId: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  return signJwt({
    sub: 'guest',
    role: 'anon',
    board_id: boardId,
    permission: 'view',
    exp: now + 60 * 60, // 1 hour
  })
}

// ---------------------------------------------------------------------------
// generateShareToken
// ---------------------------------------------------------------------------

export async function generateShareToken(
  boardId: string,
  permission: 'view' | 'edit',
  expiresInDays: number = 7,
): Promise<{ token: string; expiresAt: string } | { error: string }> {
  const supabase = await createClient()

  // Verify the caller owns this board
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: board } = await supabase
    .from('boards')
    .select('owner_id')
    .eq('id', boardId)
    .single()

  if (!board || board.owner_id !== user.id) {
    return { error: 'Not the board owner' }
  }

  // Delete any existing token for this board+permission (unique constraint)
  await supabase
    .from('board_share_tokens')
    .delete()
    .eq('board_id', boardId)
    .eq('permission', permission)

  const MIN_DAYS = 1
  const MAX_DAYS = 365
  const DEFAULT_DAYS = 7
  const safeDays =
    typeof expiresInDays !== 'number' ||
    !Number.isFinite(expiresInDays) ||
    expiresInDays < MIN_DAYS
      ? DEFAULT_DAYS
      : Math.min(expiresInDays, MAX_DAYS)

  const tokenValue = crypto.randomUUID()
  const expiresAt = new Date(
    Date.now() + safeDays * 86400000,
  ).toISOString()

  const { error } = await supabase
    .from('board_share_tokens')
    .insert({
      board_id: boardId,
      permission,
      token: tokenValue,
      expires_at: expiresAt,
    })

  if (error) return { error: error.message }
  return { token: tokenValue, expiresAt }
}

// ---------------------------------------------------------------------------
// revokeShareToken
// ---------------------------------------------------------------------------

export async function revokeShareToken(
  boardId: string,
  permission: 'view' | 'edit',
): Promise<{ error?: string }> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: board } = await supabase
    .from('boards')
    .select('owner_id')
    .eq('id', boardId)
    .single()

  if (!board || board.owner_id !== user.id) {
    return { error: 'Not the board owner' }
  }

  const { error } = await supabase
    .from('board_share_tokens')
    .delete()
    .eq('board_id', boardId)
    .eq('permission', permission)

  return error ? { error: error.message } : {}
}

// ---------------------------------------------------------------------------
// getShareTokens
// ---------------------------------------------------------------------------

export async function getShareTokens(
  boardId: string,
): Promise<{ tokens: BoardShareToken[] } | { error: string }> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: board } = await supabase
    .from('boards')
    .select('owner_id')
    .eq('id', boardId)
    .single()

  if (!board || board.owner_id !== user.id) {
    return { error: 'Not the board owner' }
  }

  const { data, error } = await supabase
    .from('board_share_tokens')
    .select('*')
    .eq('board_id', boardId)
    .order('created_at', { ascending: false })

  if (error) return { error: error.message }
  return { tokens: (data ?? []) as BoardShareToken[] }
}

// ---------------------------------------------------------------------------
// validateShareToken
// ---------------------------------------------------------------------------

export async function validateShareToken(
  boardId: string,
  token: string,
): Promise<
  | { guestJwt: string; permission: 'view' | 'edit' }
  | { error: string }
> {
  const serviceClient = createServiceClient()

  const { data, error } = await serviceClient
    .from('board_share_tokens')
    .select('*')
    .eq('token', token)
    .eq('board_id', boardId)
    .single()

  if (error || !data) {
    return { error: 'invalid' }
  }

  const row = data as BoardShareToken

  // Check expiry
  if (new Date(row.expires_at) < new Date()) {
    return { error: 'expired' }
  }

  // Mint a short-lived guest JWT for Supabase Realtime
  const now = Math.floor(Date.now() / 1000)
  const guestJwt = signJwt({
    sub: 'guest',
    role: 'anon',
    board_id: boardId,
    permission: row.permission,
    exp: now + 60 * 60, // 1 hour
  })

  return {
    guestJwt,
    permission: row.permission,
  }
}
