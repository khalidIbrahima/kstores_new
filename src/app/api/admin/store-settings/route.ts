import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  if (!url || !key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured')
  return createClient(url, key)
}

const ALLOWED_FIELDS = new Set([
  'store_name',
  'store_url',
  'contact_email',
  'support_phone',
  'store_description',
  'currency',
  'tax_rate',
  'maintenance_mode',
  'payment_methods',
  'shipping_options',
  'social_media',
  'logo_url',
  'favicon_url',
  'ai_provider',
])

export async function PATCH(req: NextRequest) {
  try {
    const body = (await req.json()) as { id: string; updates: Record<string, unknown> }

    if (!body.id || typeof body.id !== 'string') {
      return NextResponse.json({ error: 'Missing settings id' }, { status: 400 })
    }
    if (!body.updates || typeof body.updates !== 'object') {
      return NextResponse.json({ error: 'Missing updates' }, { status: 400 })
    }

    const sanitized: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(body.updates)) {
      if (ALLOWED_FIELDS.has(k)) sanitized[k] = v
    }

    if (Object.keys(sanitized).length === 0) {
      return NextResponse.json({ error: 'No allowed fields in payload' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('store_settings')
      .update(sanitized)
      .eq('id', body.id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ success: true, data })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
