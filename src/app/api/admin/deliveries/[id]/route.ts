import { NextResponse } from 'next/server'
import { withAdmin, pickFields, bad } from '@/lib/api/admin-route'

const DELIVERY_FIELDS = [
  'shipping_agency_id', 'type',
  'weight_kg', 'cbm', 'shipping_fees_xof', 'other_fees_xof',
  'send_date', 'receive_date', 'tracking_number', 'status', 'notes',
] as const

const SELECT = '*, shipping_agencies(id, name, phone, air_price_per_kg, sea_price_per_cbm, express_cost_per_kg)'

export const PATCH = withAdmin<{ id: string }>(async (req, { supabase, params }) => {
  if (!params.id) return bad('Missing delivery id')
  const body = (await req.json()) as Record<string, unknown>
  const payload = pickFields(body, DELIVERY_FIELDS)
  if (Object.keys(payload).length === 0) return bad('No patchable fields')
  const { data, error } = await supabase
    .from('deliveries').update(payload).eq('id', params.id).select(SELECT).single()
  if (error) return bad(error.message, 500)
  return NextResponse.json({ success: true, delivery: data })
})

export const DELETE = withAdmin<{ id: string }>(async (_req, { supabase, params }) => {
  if (!params.id) return bad('Missing delivery id')
  const { error } = await supabase.from('deliveries').delete().eq('id', params.id)
  if (error) return bad(error.message, 500)
  return NextResponse.json({ success: true })
})
