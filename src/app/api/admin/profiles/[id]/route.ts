import { NextResponse } from 'next/server'
import { withAdmin, pickFields, bad } from '@/lib/api/admin-route'

const PROFILE_FIELDS = ['is_admin', 'full_name', 'email', 'avatar_url'] as const

export const PATCH = withAdmin<{ id: string }>(async (req, { supabase, params }) => {
  if (!params.id) return bad('Missing profile id')
  const body = (await req.json()) as Record<string, unknown>
  const payload = pickFields(body, PROFILE_FIELDS)
  if (Object.keys(payload).length === 0) return bad('No patchable fields')
  const { data, error } = await supabase
    .from('profiles').update(payload).eq('id', params.id).select().single()
  if (error) return bad(error.message, 500)
  return NextResponse.json({ success: true, profile: data })
})
