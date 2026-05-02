import { NextResponse } from 'next/server'
import { withAdmin, pickFields, bad } from '@/lib/api/admin-route'

const AGENCY_FIELDS = [
  'name', 'phone', 'email', 'address',
  'air_price_per_kg', 'sea_price_per_cbm', 'express_cost_per_kg',
] as const

export const PATCH = withAdmin<{ id: string }>(async (req, { supabase, params }) => {
  if (!params.id) return bad('Missing agency id')
  const body = (await req.json()) as Record<string, unknown>
  const payload = pickFields(body, AGENCY_FIELDS)
  if (Object.keys(payload).length === 0) return bad('No patchable fields')
  const { data, error } = await supabase
    .from('shipping_agencies').update(payload).eq('id', params.id).select().single()
  if (error) return bad(error.message, 500)
  return NextResponse.json({ success: true, agency: data })
})

export const DELETE = withAdmin<{ id: string }>(async (_req, { supabase, params }) => {
  if (!params.id) return bad('Missing agency id')
  const { error } = await supabase.from('shipping_agencies').delete().eq('id', params.id)
  if (error) return bad(error.message, 500)
  return NextResponse.json({ success: true })
})
