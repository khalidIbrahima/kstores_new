import { NextResponse } from 'next/server'
import { withAdmin, pickFields, bad } from '@/lib/api/admin-route'

const ITEM_FIELDS = [
  'product_name', 'unit_price_usd', 'quantity',
  'unit_weight', 'unit_cbm', 'ads_amount',
  'image_url', 'notes', 'supplier_order_id',
] as const

export const POST = withAdmin(async (req, { supabase }) => {
  const body = (await req.json()) as Record<string, unknown>
  if (!body.supplier_order_id || typeof body.supplier_order_id !== 'string') {
    return bad('Missing supplier_order_id')
  }
  if (!body.product_name || typeof body.product_name !== 'string') return bad('Missing product_name')
  const payload = pickFields(body, ITEM_FIELDS)
  const { data, error } = await supabase
    .from('supplier_order_items').insert(payload).select().single()
  if (error) return bad(error.message, 500)
  return NextResponse.json({ success: true, item: data })
})
