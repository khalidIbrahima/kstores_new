import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { SESSION_COOKIE, sessionKey, verifySession } from './session'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ''

interface AdminContext {
  email: string
  profileId: string
}

export type AdminCheck =
  | { ok: true; admin: AdminContext }
  | { ok: false; status: 401 | 403 | 500; error: string }

function getAdminClient() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured')
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
}

async function profileIsAdmin(email: string): Promise<{ profileId: string } | null> {
  const supabase = getAdminClient()
  const { data } = await supabase
    .from('profiles')
    .select('id, is_admin')
    .eq('email', email)
    .maybeSingle()
  if (data?.is_admin) return { profileId: data.id as string }
  return null
}

async function tryValidateSupabaseJwt(token: string): Promise<string | null> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data.user?.email) return null
  return data.user.email
}

interface GoogleTokenInfo {
  aud?: string
  email?: string
  exp?: string | number
  email_verified?: string | boolean
}

export interface VerifiedGoogleUser {
  sub: string
  email: string
  name: string
  picture: string
}

/** Verifies a Google ID token (audience, expiry, verified email). */
export async function verifyGoogleIdToken(token: string): Promise<VerifiedGoogleUser | null> {
  if (!GOOGLE_CLIENT_ID) return null
  try {
    const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(token)}`)
    if (!res.ok) return null
    const info = (await res.json()) as GoogleTokenInfo & { sub?: string; name?: string; picture?: string }
    if (info.aud !== GOOGLE_CLIENT_ID) return null
    if (info.exp && Number(info.exp) * 1000 < Date.now()) return null
    if (info.email_verified !== true && info.email_verified !== 'true') return null
    if (!info.email || !info.sub) return null
    return { sub: info.sub, email: info.email, name: info.name || '', picture: info.picture || '' }
  } catch {
    return null
  }
}

async function tryValidateGoogleIdToken(token: string): Promise<string | null> {
  return (await verifyGoogleIdToken(token))?.email ?? null
}

/** Google ID tokens are RS256; Supabase access tokens are not. Avoids a pointless call (and a 403 in the Auth logs). */
function jwtAlg(token: string): string | null {
  try {
    const header = JSON.parse(Buffer.from(token.split('.')[0], 'base64').toString('utf8')) as { alg?: string }
    return header.alg ?? null
  } catch {
    return null
  }
}

async function emailFromBearer(token: string): Promise<string | null> {
  if (jwtAlg(token) === 'RS256') {
    return (await tryValidateGoogleIdToken(token)) || (await tryValidateSupabaseJwt(token))
  }
  return (await tryValidateSupabaseJwt(token)) || (await tryValidateGoogleIdToken(token))
}

/** A cookie is sent by the browser automatically, so a state-changing request must come from our own pages. */
function isSameOrigin(req: NextRequest): boolean {
  const fetchSite = req.headers.get('sec-fetch-site')
  if (fetchSite) return fetchSite === 'same-origin'
  const origin = req.headers.get('origin')
  if (!origin) return false
  try {
    return new URL(origin).host === (req.headers.get('x-forwarded-host') || req.headers.get('host'))
  } catch {
    return false
  }
}

function emailFromSessionCookie(req: NextRequest): string | null {
  const key = sessionKey()
  if (!key) return null
  const method = req.method.toUpperCase()
  if (method !== 'GET' && method !== 'HEAD' && !isSameOrigin(req)) return null
  return verifySession(req.cookies.get(SESSION_COOKIE)?.value, key)?.email ?? null
}

export async function requireAdmin(req: NextRequest): Promise<AdminCheck> {
  try {
    const auth = req.headers.get('authorization')
    let email: string | null = null
    if (auth && auth.toLowerCase().startsWith('bearer ') && auth.slice(7).trim()) {
      email = await emailFromBearer(auth.slice(7).trim())
    }
    if (!email) email = emailFromSessionCookie(req)
    if (!email) {
      return { ok: false, status: 401, error: auth ? 'Invalid or expired token' : 'Not signed in' }
    }

    const admin = await profileIsAdmin(email)
    if (!admin) return { ok: false, status: 403, error: 'Forbidden: not an admin' }

    return { ok: true, admin: { email, profileId: admin.profileId } }
  } catch (e) {
    return { ok: false, status: 500, error: e instanceof Error ? e.message : 'Auth check failed' }
  }
}

export function adminGuardResponse(check: Extract<AdminCheck, { ok: false }>): NextResponse {
  return NextResponse.json({ error: check.error }, { status: check.status })
}
