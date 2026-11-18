import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, adminGuardResponse } from '@/lib/admin-auth'
import { invalidateWaveSecretCache, testWaveApiKey } from '@/lib/wave'

/** Checks the stored Wave API key against Wave (read-only call). Admin only. */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (!auth.ok) return adminGuardResponse(auth)

  try {
    // Always test the key as it is stored right now, not a cached copy.
    invalidateWaveSecretCache()
    return NextResponse.json(await testWaveApiKey())
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
