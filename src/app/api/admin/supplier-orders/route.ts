import { NextResponse } from 'next/server'
import { withAdmin, pickFields, bad } from '@/lib/api/admin-route'

const SUPPLIER_ORDER_FIELDS = [
  'title', 'order_date', 'order_number',
  'total_amount_usd', 'bank_fees_usd', 'shipping_fees_usd', 'usd_xof_value',
  'image_url', 'notes',
] as const

export const POST = withAdmin(async (req, { supabase }) => {
  const body = (await req.json()) as Record<string, unknown>
  const payload = pickFields(body, SUPPLIER_ORDER_FIELDS)
  if (!payload.order_date) return bad('Missing order_date')
  const { data, error } = await supabase.from('supplier_orders').insert(payload).select().single()
  if (error) return bad(error.message, 500)
  return NextResponse.json({ success: true, order: data })
})
