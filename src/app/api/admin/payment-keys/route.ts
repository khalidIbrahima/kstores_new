import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin, adminGuardResponse } from '@/lib/admin-auth'
import { invalidateWaveSecretCache } from '@/lib/wave'

// Wave keys entered from the admin. They are written to Supabase Vault and never
// sent back to the browser: GET only reports whether each key is set, and where from.

const SECRET_NAMES = ['wave_api_key', 'wave_webhook_secret'] as const
type SecretName = (typeof SECRET_NAMES)[number]

const ENV_NAMES: Record<SecretName, string> = {
  wave_api_key: 'WAVE_API_KEY',
  wave_webhook_secret: 'WAVE_WEBHOOK_SECRET',
}

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  if (!url || !key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured')
  return createClient(url, key)
}

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (!auth.ok) return adminGuardResponse(auth)

  try {
    const supabase = getSupabaseAdmin()
    const entries = await Promise.all(
      SECRET_NAMES.map(async (name) => {
        if (process.env[ENV_NAMES[name]]) return [name, { set: true, source: 'env' }] as const
        const { data, error } = await supabase.rpc('has_ai_secret', { p_name: name })
        return [name, { set: !error && data === true, source: 'vault' }] as const
      })
    )
    return NextResponse.json(Object.fromEntries(entries))
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (!auth.ok) return adminGuardResponse(auth)

  try {
    const { name, value } = (await req.json()) as { name?: unknown; value?: unknown }

    if (typeof name !== 'string' || !SECRET_NAMES.includes(name as SecretName)) {
      return NextResponse.json({ error: 'Invalid secret name' }, { status: 400 })
    }
    if (typeof value !== 'string' || value.trim().length < 10) {
      return NextResponse.json({ error: 'Invalid secret value' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()
    const { error } = await supabase.rpc('set_ai_secret', { p_name: name, p_value: value.trim() })
    if (error) {
      const notReady = /Invalid secret name/i.test(error.message)
      return NextResponse.json(
        {
          error: notReady
            ? 'Executez d\'abord db/wave-vault.sql dans Supabase (SQL Editor), puis reessayez.'
            : error.message,
        },
        { status: notReady ? 409 : 500 }
      )
    }

    invalidateWaveSecretCache()
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
