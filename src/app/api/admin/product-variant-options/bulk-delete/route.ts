import { NextResponse } from 'next/server'
import { withAdmin, bad } from '@/lib/api/admin-route'

export const POST = withAdmin(async (req, { supabase }) => {
  const body = (await req.json()) as { ids?: unknown; variant_ids?: unknown }
  const ids = Array.isArray(body.ids) && body.ids.every((v) => typeof v === 'string') ? (body.ids as string[]) : null
  const variantIds = Array.isArray(body.variant_ids) && body.variant_ids.every((v) => typeof v === 'string') ? (body.variant_ids as string[]) : null

  if (!ids && !variantIds) return bad('Provide ids or variant_ids')

  if (ids && ids.length > 0) {
    const { error } = await supabase.from('product_variant_options').delete().in('id', ids)
    if (error) return bad(error.message, 500)
  }
  if (variantIds && variantIds.length > 0) {
    const { error } = await supabase.from('product_variant_options').delete().in('variant_id', variantIds)
    if (error) return bad(error.message, 500)
  }
  return NextResponse.json({ success: true })
})
