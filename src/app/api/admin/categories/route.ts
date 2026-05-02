import { NextResponse } from 'next/server'
import { withAdmin, pickFields, bad } from '@/lib/api/admin-route'

const CATEGORY_FIELDS = ['name', 'slug', 'cover_image_url'] as const

export const POST = withAdmin(async (req, { supabase }) => {
  const body = (await req.json()) as Record<string, unknown>
  if (!body.name || typeof body.name !== 'string') return bad('Missing name')
  if (!body.slug || typeof body.slug !== 'string') return bad('Missing slug')
  const payload = pickFields(body, CATEGORY_FIELDS)
  const { data, error } = await supabase.from('categories').insert(payload).select().single()
  if (error) return bad(error.message, 500)
  return NextResponse.json({ success: true, category: data })
})
