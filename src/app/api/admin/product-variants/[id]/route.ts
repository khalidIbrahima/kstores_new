import { NextResponse } from 'next/server'
import { withAdmin, pickFields, bad } from '@/lib/api/admin-route'

const VARIANT_FIELDS = ['name', 'display_order'] as const

export const PATCH = withAdmin<{ id: string }>(async (req, { supabase, params }) => {
  if (!params.id) return bad('Missing variant id')
  const body = (await req.json()) as Record<string, unknown>
  const payload = pickFields(body, VARIANT_FIELDS)
  if (Object.keys(payload).length === 0) return bad('No patchable fields')
  const { data, error } = await supabase
    .from('product_variants').update(payload).eq('id', params.id).select().single()
  if (error) return bad(error.message, 500)
  return NextResponse.json({ success: true, variant: data })
})

export const DELETE = withAdmin<{ id: string }>(async (_req, { supabase, params }) => {
  if (!params.id) return bad('Missing variant id')
  const optsRes = await supabase.from('product_variant_options').delete().eq('variant_id', params.id)
  if (optsRes.error) return bad(optsRes.error.message, 500)
  const varRes = await supabase.from('product_variants').delete().eq('id', params.id)
  if (varRes.error) return bad(varRes.error.message, 500)
  return NextResponse.json({ success: true })
})
