import { NextResponse } from 'next/server'
import { withAdmin, pickFields, bad } from '@/lib/api/admin-route'

const SUPPLIER_PRODUCT_FIELDS = [
  'name', 'url', 'supplier_name', 'supplier_profile_url', 'ref', 'sku', 'images',
] as const

export const POST = withAdmin(async (req, { supabase }) => {
  const body = (await req.json()) as Record<string, unknown>
  if (!body.name || typeof body.name !== 'string') return bad('Missing name')
  const payload = pickFields(body, SUPPLIER_PRODUCT_FIELDS)
  const { data, error } = await supabase.from('supplier_product').insert(payload).select().single()
  if (error) return bad(error.message, 500)
  return NextResponse.json({ success: true, item: data })
})
