import { NextRequest, NextResponse } from 'next/server'
import { verifyGoogleIdToken } from '@/lib/admin-auth'
import {
  SESSION_COOKIE, SESSION_RENEW_AFTER_S, sessionCookieOptions, sessionKey, signSession, verifySession,
} from '@/lib/session'

export const dynamic = 'force-dynamic'

function noStore(res: NextResponse): NextResponse {
  res.headers.set('Cache-Control', 'no-store')
  return res
}

/** Exchange a fresh Google ID token for a 30-day session cookie. */
export async function POST(req: NextRequest) {
  const key = sessionKey()
  if (!key) return noStore(NextResponse.json({ error: 'Session not configured' }, { status: 500 }))

  let credential = ''
  try {
    const body = (await req.json()) as { credential?: unknown }
    if (typeof body.credential === 'string') credential = body.credential
  } catch { /* invalid body */ }
  if (!credential) return noStore(NextResponse.json({ error: 'Missing credential' }, { status: 400 }))

  const user = await verifyGoogleIdToken(credential)
  if (!user) return noStore(NextResponse.json({ error: 'Invalid Google credential' }, { status: 401 }))

  const res = NextResponse.json({ user })
  res.cookies.set(SESSION_COOKIE, signSession(user, key), sessionCookieOptions())
  return noStore(res)
}

/** Who is signed in? Renews the cookie (sliding 30 days) at most once a day. */
export async function GET(req: NextRequest) {
  const key = sessionKey()
  const session = key ? verifySession(req.cookies.get(SESSION_COOKIE)?.value, key) : null
  if (!key || !session) return noStore(NextResponse.json({ user: null }, { status: 401 }))

  const { iat, ...user } = session
  const res = NextResponse.json({ user })
  if (Date.now() / 1000 - iat > SESSION_RENEW_AFTER_S) {
    res.cookies.set(SESSION_COOKIE, signSession(user, key), sessionCookieOptions())
  }
  return noStore(res)
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.cookies.set(SESSION_COOKIE, '', sessionCookieOptions(0))
  return noStore(res)
}
