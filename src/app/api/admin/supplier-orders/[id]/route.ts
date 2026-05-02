import { NextResponse } from 'next/server'
import { withAdmin, pickFields, bad } from '@/lib/api/admin-route'

const SUPPLIER_ORDER_FIELDS = [
  'title', 'order_date', 'order_number',
  'total_amount_usd', 'bank_fees_usd', 'shipping_fees_usd', 'usd_xof_value',
  'image_url', 'notes',
] as const

export const PATCH = withAdmin<{ id: string }>(async (req, { supabase, params }) => {
  if (!params.id) return bad('Missing order id')
  const body = (await req.json()) as Record<string, unknown>
  const payload = pickFields(body, SUPPLIER_ORDER_FIELDS)
  if (Object.keys(payload).length === 0) return bad('No patchable fields')
  const { data, error } = await supabase
    .from('supplier_orders').update(payload).eq('id', params.id).select().single()
  if (error) return bad(error.message, 500)
  return NextResponse.json({ success: true, order: data })
})

export const DELETE = withAdmin<{ id: string }>(async (_req, { supabase, params }) => {
  if (!params.id) return bad('Missing order id')
  const itemsRes = await supabase.from('supplier_order_items').delete().eq('supplier_order_id', params.id)
  if (itemsRes.error) return bad(itemsRes.error.message, 500)
  const orderRes = await supabase.from('supplier_orders').delete().eq('id', params.id)
  if (orderRes.error) return bad(orderRes.error.message, 500)
  return NextResponse.json({ success: true })
})
