import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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

async function tryValidateGoogleIdToken(token: string): Promise<string | null> {
  if (!GOOGLE_CLIENT_ID) return null
  try {
    const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(token)}`)
    if (!res.ok) return null
    const info = (await res.json()) as GoogleTokenInfo
    if (info.aud !== GOOGLE_CLIENT_ID) return null
    if (info.exp && Number(info.exp) * 1000 < Date.now()) return null
    if (info.email_verified !== true && info.email_verified !== 'true') return null
    return info.email || null
  } catch {
    return null
  }
}

export async function requireAdmin(req: NextRequest): Promise<AdminCheck> {
  try {
    const auth = req.headers.get('authorization')
    if (!auth || !auth.toLowerCase().startsWith('bearer ')) {
      return { ok: false, status: 401, error: 'Missing Authorization header' }
    }
    const token = auth.slice(7).trim()
    if (!token) return { ok: false, status: 401, error: 'Empty token' }

    const email = (await tryValidateSupabaseJwt(token)) || (await tryValidateGoogleIdToken(token))
    if (!email) return { ok: false, status: 401, error: 'Invalid or expired token' }

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
