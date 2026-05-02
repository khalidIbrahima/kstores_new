import { NextResponse } from 'next/server'
import { withAdmin, pickFields, bad } from '@/lib/api/admin-route'

const AGENCY_FIELDS = [
  'name', 'phone', 'email', 'address',
  'air_price_per_kg', 'sea_price_per_cbm', 'express_cost_per_kg',
] as const

export const POST = withAdmin(async (req, { supabase }) => {
  const body = (await req.json()) as Record<string, unknown>
  if (!body.name || typeof body.name !== 'string') return bad('Missing name')
  const payload = pickFields(body, AGENCY_FIELDS)
  const { data, error } = await supabase.from('shipping_agencies').insert(payload).select().single()
  if (error) return bad(error.message, 500)
  return NextResponse.json({ success: true, agency: data })
})
