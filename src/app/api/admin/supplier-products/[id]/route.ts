import { NextResponse } from 'next/server'
import { withAdmin, pickFields, bad } from '@/lib/api/admin-route'

const SUPPLIER_PRODUCT_FIELDS = [
  'name', 'url', 'supplier_name', 'supplier_profile_url', 'ref', 'sku', 'images',
] as const

export const PATCH = withAdmin<{ id: string }>(async (req, { supabase, params }) => {
  if (!params.id) return bad('Missing item id')
  const body = (await req.json()) as Record<string, unknown>
  const payload = pickFields(body, SUPPLIER_PRODUCT_FIELDS)
  if (Object.keys(payload).length === 0) return bad('No patchable fields')
  const { data, error } = await supabase
    .from('supplier_product').update(payload).eq('id', params.id).select().single()
  if (error) return bad(error.message, 500)
  return NextResponse.json({ success: true, item: data })
})

export const DELETE = withAdmin<{ id: string }>(async (_req, { supabase, params }) => {
  if (!params.id) return bad('Missing item id')
  const { error } = await supabase.from('supplier_product').delete().eq('id', params.id)
  if (error) return bad(error.message, 500)
  return NextResponse.json({ success: true })
})
