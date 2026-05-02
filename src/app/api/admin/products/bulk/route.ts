import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin, adminGuardResponse } from '@/lib/admin-auth'

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  if (!url || !key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured')
  return createClient(url, key)
}

const BULK_PATCHABLE_FIELDS = ['isActive', 'promotion_active', 'category_id'] as const
type BulkPatchKey = (typeof BULK_PATCHABLE_FIELDS)[number]
type BulkPatch = Partial<Record<BulkPatchKey, unknown>>

interface BulkBody {
  op?: 'update' | 'delete'
  ids?: unknown
  patch?: Record<string, unknown>
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (!auth.ok) return adminGuardResponse(auth)

  try {
    const body = (await req.json()) as BulkBody
    const { op, ids, patch } = body

    if (op !== 'update' && op !== 'delete') {
      return NextResponse.json({ error: 'op must be "update" or "delete"' }, { status: 400 })
    }
    if (!Array.isArray(ids) || ids.length === 0 || !ids.every((v) => typeof v === 'string')) {
      return NextResponse.json({ error: 'ids must be a non-empty array of strings' }, { status: 400 })
    }
    const idList = ids as string[]

    const supabase = getSupabaseAdmin()

    if (op === 'delete') {
      const { error } = await supabase.from('products').delete().in('id', idList)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true, count: idList.length })
    }

    if (!patch || typeof patch !== 'object') {
      return NextResponse.json({ error: 'patch is required for op=update' }, { status: 400 })
    }
    const filtered: BulkPatch = {}
    for (const key of BULK_PATCHABLE_FIELDS) {
      if (key in patch) filtered[key] = patch[key]
    }
    if (Object.keys(filtered).length === 0) {
      return NextResponse.json({ error: 'No bulk-patchable fields provided' }, { status: 400 })
    }

    const { error } = await supabase.from('products').update(filtered).in('id', idList)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, count: idList.length })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
