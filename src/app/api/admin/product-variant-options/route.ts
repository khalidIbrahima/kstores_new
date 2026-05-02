import { NextResponse } from 'next/server'
import { withAdmin, bad } from '@/lib/api/admin-route'

interface OptionInput {
  variant_id?: unknown
  name?: unknown
  image_url?: unknown
  display_order?: unknown
  stock?: unknown
}

function sanitize(input: OptionInput) {
  if (typeof input.variant_id !== 'string') throw new Error('variant_id must be a string')
  if (typeof input.name !== 'string') throw new Error('name must be a string')
  return {
    variant_id: input.variant_id,
    name: input.name,
    image_url: typeof input.image_url === 'string' ? input.image_url : null,
    display_order: typeof input.display_order === 'number' ? input.display_order : 0,
    stock: typeof input.stock === 'number' ? input.stock : null,
  }
}

export const POST = withAdmin(async (req, { supabase }) => {
  const body = (await req.json()) as { option?: OptionInput; options?: OptionInput[] }
  if (Array.isArray(body.options)) {
    if (body.options.length === 0) return bad('options must be non-empty')
    const sanitized = body.options.map(sanitize)
    const { data, error } = await supabase.from('product_variant_options').insert(sanitized).select()
    if (error) return bad(error.message, 500)
    return NextResponse.json({ success: true, options: data })
  }
  if (body.option) {
    const sanitized = sanitize(body.option)
    const { data, error } = await supabase
      .from('product_variant_options').insert(sanitized).select().single()
    if (error) return bad(error.message, 500)
    return NextResponse.json({ success: true, option: data })
  }
  return bad('Provide option or options')
})
