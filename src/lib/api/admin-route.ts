import { NextRequest, NextResponse } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { requireAdmin, adminGuardResponse } from '@/lib/admin-auth'

export function getSupabaseAdmin(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  if (!url || !key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured')
  return createClient(url, key)
}

type AdminHandler<T> = (
  req: NextRequest,
  ctx: { supabase: SupabaseClient; params: T }
) => Promise<NextResponse>

export function withAdmin<T>(handler: AdminHandler<T>) {
  return async (
    req: NextRequest,
    context?: { params: Promise<T> }
  ): Promise<NextResponse> => {
    const auth = await requireAdmin(req)
    if (!auth.ok) return adminGuardResponse(auth)
    try {
      const params = (context ? await context.params : ({} as T))
      const supabase = getSupabaseAdmin()
      return await handler(req, { supabase, params })
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : 'Internal server error' },
        { status: 500 }
      )
    }
  }
}

export function pickFields<K extends string>(
  body: Record<string, unknown>,
  allowed: readonly K[]
): Partial<Record<K, unknown>> {
  const out: Partial<Record<K, unknown>> = {}
  for (const key of allowed) {
    if (key in body) out[key] = body[key]
  }
  return out
}

export function bad(error: string, status = 400): NextResponse {
  return NextResponse.json({ error }, { status })
}
