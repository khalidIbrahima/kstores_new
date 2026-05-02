import { NextResponse } from 'next/server'
import { withAdmin, pickFields, bad } from '@/lib/api/admin-route'

const ITEM_FIELDS = [
  'product_name', 'unit_price_usd', 'quantity',
  'unit_weight', 'unit_cbm', 'ads_amount',
  'image_url', 'notes',
] as const

export const PATCH = withAdmin<{ id: string }>(async (req, { supabase, params }) => {
  if (!params.id) return bad('Missing item id')
  const body = (await req.json()) as Record<string, unknown>
  const payload = pickFields(body, ITEM_FIELDS)
  if (Object.keys(payload).length === 0) return bad('No patchable fields')
  const { data, error } = await supabase
    .from('supplier_order_items').update(payload).eq('id', params.id).select().single()
  if (error) return bad(error.message, 500)
  return NextResponse.json({ success: true, item: data })
})

export const DELETE = withAdmin<{ id: string }>(async (_req, { supabase, params }) => {
  if (!params.id) return bad('Missing item id')
  const { error } = await supabase.from('supplier_order_items').delete().eq('id', params.id)
  if (error) return bad(error.message, 500)
  return NextResponse.json({ success: true })
})
