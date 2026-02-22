import { createHmac, timingSafeEqual } from 'crypto'

/**
 * Server-only: verify a guest JWT (e.g. from share link) and return its payload if valid and not expired.
 * Uses SUPABASE_JWT_SECRET for HMAC-SHA256 verification.
 */
export function verifyGuestJwt(token: string): { permission?: string; board_id?: string; exp?: number; [key: string]: unknown } | null {
  const secret = process.env.SUPABASE_JWT_SECRET
  if (!secret) return null

  const parts = token.split('.')
  if (parts.length !== 3) return null

  const [headerB64, payloadB64, sigB64] = parts
  const message = `${headerB64}.${payloadB64}`

  let signature: Buffer
  try {
    signature = Buffer.from(sigB64, 'base64url')
  } catch {
    return null
  }

  const expected = createHmac('sha256', secret).update(message, 'utf8').digest()
  if (signature.length !== expected.length || !timingSafeEqual(signature, expected)) {
    return null
  }

  let payload: Record<string, unknown>
  try {
    const decoded = Buffer.from(payloadB64, 'base64url').toString('utf8')
    payload = JSON.parse(decoded) as Record<string, unknown>
  } catch {
    return null
  }

  const exp = payload.exp as number | undefined
  if (typeof exp !== 'number' || exp <= Math.floor(Date.now() / 1000)) {
    return null
  }

  return payload
}
