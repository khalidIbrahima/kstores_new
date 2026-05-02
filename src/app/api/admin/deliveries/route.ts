import { NextResponse } from 'next/server'
import { withAdmin, pickFields, bad } from '@/lib/api/admin-route'

const DELIVERY_FIELDS = [
  'supplier_order_id', 'shipping_agency_id', 'type',
  'weight_kg', 'cbm', 'shipping_fees_xof', 'other_fees_xof',
  'send_date', 'receive_date', 'tracking_number', 'status', 'notes',
] as const

const SELECT = '*, shipping_agencies(id, name, phone, air_price_per_kg, sea_price_per_cbm, express_cost_per_kg)'

export const POST = withAdmin(async (req, { supabase }) => {
  const body = (await req.json()) as Record<string, unknown>
  if (!body.supplier_order_id || typeof body.supplier_order_id !== 'string') {
    return bad('Missing supplier_order_id')
  }
  const payload = pickFields(body, DELIVERY_FIELDS)
  const { data, error } = await supabase.from('deliveries').insert(payload).select(SELECT).single()
  if (error) return bad(error.message, 500)
  return NextResponse.json({ success: true, delivery: data })
})
