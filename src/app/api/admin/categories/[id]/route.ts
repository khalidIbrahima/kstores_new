import { NextResponse } from 'next/server'
import { withAdmin, pickFields, bad } from '@/lib/api/admin-route'

const CATEGORY_FIELDS = ['name', 'slug', 'cover_image_url'] as const

export const PATCH = withAdmin<{ id: string }>(async (req, { supabase, params }) => {
  if (!params.id) return bad('Missing category id')
  const body = (await req.json()) as Record<string, unknown>
  const payload = pickFields(body, CATEGORY_FIELDS)
  if (Object.keys(payload).length === 0) return bad('No patchable fields')
  const { data, error } = await supabase
    .from('categories').update(payload).eq('id', params.id).select().single()
  if (error) return bad(error.message, 500)
  return NextResponse.json({ success: true, category: data })
})

export const DELETE = withAdmin<{ id: string }>(async (_req, { supabase, params }) => {
  if (!params.id) return bad('Missing category id')
  const { data: deleted, error } = await supabase
    .from('categories').delete().eq('id', params.id).select('id')
  if (error) return bad(error.message, 500)
  if (!deleted || deleted.length === 0) return bad('Category not found', 404)
  return NextResponse.json({ success: true })
})
