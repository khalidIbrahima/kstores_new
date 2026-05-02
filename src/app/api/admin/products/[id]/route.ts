import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin, adminGuardResponse } from '@/lib/admin-auth'

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  if (!url || !key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured')
  return createClient(url, key)
}

const PATCHABLE_FIELDS = [
  'name', 'description', 'price', 'old_price',
  'image_url', 'image_url1', 'image_url2', 'image_url3', 'image_url4',
  'inventory', 'stock', 'category_id',
  'isActive', 'colors', 'slug', 'properties',
  'promotion_active', 'promotion_start_date', 'promotion_end_date', 'promotion_percentage',
] as const

type PatchableKey = (typeof PATCHABLE_FIELDS)[number]
type PatchPayload = Partial<Record<PatchableKey, unknown>>

function pickPatchable(body: Record<string, unknown>): PatchPayload {
  const out: PatchPayload = {}
  for (const key of PATCHABLE_FIELDS) {
    if (key in body) out[key] = body[key]
  }
  return out
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(req)
  if (!auth.ok) return adminGuardResponse(auth)

  try {
    const { id } = await context.params
    if (!id) return NextResponse.json({ error: 'Missing product id' }, { status: 400 })

    const body = (await req.json()) as Record<string, unknown>
    const patch = pickPatchable(body)
    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: 'No patchable fields provided' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('products')
      .update(patch)
      .eq('id', id)
      .select('*, categories(name, slug)')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, product: data })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(req)
  if (!auth.ok) return adminGuardResponse(auth)

  try {
    const { id } = await context.params
    if (!id) return NextResponse.json({ error: 'Missing product id' }, { status: 400 })

    const supabase = getSupabaseAdmin()
    const { data: deleted, error } = await supabase
      .from('products')
      .delete()
      .eq('id', id)
      .select('id')

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!deleted || deleted.length === 0) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
