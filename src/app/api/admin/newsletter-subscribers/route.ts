import { NextResponse } from 'next/server'
import { withAdmin, bad } from '@/lib/api/admin-route'

export const POST = withAdmin(async (req, { supabase }) => {
  const body = (await req.json()) as { email?: string; status?: string; source?: string }
  if (!body.email || typeof body.email !== 'string') return bad('Missing email')
  const { data, error } = await supabase
    .from('newsletter_subscribers')
    .upsert(
      {
        email: body.email.trim().toLowerCase(),
        status: body.status || 'active',
        source: body.source || 'admin',
      },
      { onConflict: 'email' }
    )
    .select()
    .single()
  if (error) return bad(error.message, 500)
  return NextResponse.json({ success: true, subscriber: data })
})
