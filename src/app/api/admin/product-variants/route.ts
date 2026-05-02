import { NextResponse } from 'next/server'
import { withAdmin, pickFields, bad } from '@/lib/api/admin-route'

const VARIANT_FIELDS = ['product_id', 'name', 'display_order'] as const

export const POST = withAdmin(async (req, { supabase }) => {
  const body = (await req.json()) as Record<string, unknown>
  if (!body.product_id || typeof body.product_id !== 'string') return bad('Missing product_id')
  if (!body.name || typeof body.name !== 'string') return bad('Missing name')
  const payload = pickFields(body, VARIANT_FIELDS)
  const { data, error } = await supabase.from('product_variants').insert(payload).select().single()
  if (error) return bad(error.message, 500)
  return NextResponse.json({ success: true, variant: data })
})
