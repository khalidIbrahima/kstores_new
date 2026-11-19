import { createHash, createHmac, timingSafeEqual } from 'crypto'

/**
 * Long-lived sign-in session for Google users.
 *
 * Google ID tokens expire after one hour, so keeping only that token meant
 * being signed out on almost every visit. After verifying the Google token
 * once, the server issues its own signed session in an HttpOnly cookie.
 */

export const SESSION_COOKIE = 'ks_session'
export const SESSION_MAX_AGE_S = 30 * 24 * 60 * 60 // 30 days, renewed on use
export const SESSION_RENEW_AFTER_S = 24 * 60 * 60 // re-issue at most once a day

export interface SessionUser {
  sub: string
  email: string
  name: string
  picture: string
}

interface SessionPayload extends SessionUser {
  iat: number
  exp: number
}

function b64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromB64url(s: string): Buffer {
  return Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64')
}

/** Server-only key, derived so no new environment variable is needed. */
export function sessionKey(): Buffer | null {
  const base = process.env.SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  if (!base) return null
  return createHash('sha256').update(`ks-session-v1:${base}`).digest()
}

export function signSession(user: SessionUser, key: Buffer, nowMs: number = Date.now()): string {
  const iat = Math.floor(nowMs / 1000)
  const payload: SessionPayload = {
    sub: user.sub, email: user.email, name: user.name, picture: user.picture,
    iat, exp: iat + SESSION_MAX_AGE_S,
  }
  const body = b64url(Buffer.from(JSON.stringify(payload)))
  const sig = b64url(createHmac('sha256', key).update(body).digest())
  return `${body}.${sig}`
}

export function verifySession(
  token: string | undefined | null,
  key: Buffer,
  nowMs: number = Date.now(),
): (SessionUser & { iat: number }) | null {
  if (!token) return null
  const parts = token.split('.')
  if (parts.length !== 2) return null
  const [body, sig] = parts
  const expected = createHmac('sha256', key).update(body).digest()
  const given = fromB64url(sig)
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null
  try {
    const p = JSON.parse(fromB64url(body).toString('utf8')) as SessionPayload
    if (typeof p.exp !== 'number' || p.exp * 1000 <= nowMs) return null
    if (!p.email || !p.sub) return null
    return { sub: p.sub, email: p.email, name: p.name || '', picture: p.picture || '', iat: p.iat }
  } catch {
    return null
  }
}

export function sessionCookieOptions(maxAge: number = SESSION_MAX_AGE_S) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge,
  }
}
