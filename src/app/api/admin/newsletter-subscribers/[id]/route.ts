import { NextResponse } from 'next/server'
import { withAdmin, pickFields, bad } from '@/lib/api/admin-route'

const SUBSCRIBER_FIELDS = ['status', 'unsubscribed_at', 'source'] as const

export const PATCH = withAdmin<{ id: string }>(async (req, { supabase, params }) => {
  if (!params.id) return bad('Missing subscriber id')
  const body = (await req.json()) as Record<string, unknown>
  const payload = pickFields(body, SUBSCRIBER_FIELDS)
  if (Object.keys(payload).length === 0) return bad('No patchable fields')
  const { data, error } = await supabase
    .from('newsletter_subscribers').update(payload).eq('id', params.id).select().single()
  if (error) return bad(error.message, 500)
  return NextResponse.json({ success: true, subscriber: data })
})

export const DELETE = withAdmin<{ id: string }>(async (_req, { supabase, params }) => {
  if (!params.id) return bad('Missing subscriber id')
  const { error } = await supabase.from('newsletter_subscribers').delete().eq('id', params.id)
  if (error) return bad(error.message, 500)
  return NextResponse.json({ success: true })
})
