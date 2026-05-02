import { NextRequest, NextResponse } from 'next/server'
import { hasAiSecret, setAiSecret } from '@/lib/ai'

type SecretName = 'anthropic_api_key' | 'groq_api_key'

const VALID_NAMES: SecretName[] = ['anthropic_api_key', 'groq_api_key']

function isValidName(name: string): name is SecretName {
  return VALID_NAMES.includes(name as SecretName)
}

export async function GET() {
  try {
    const [anthropic, groq] = await Promise.all([
      hasAiSecret('anthropic_api_key'),
      hasAiSecret('groq_api_key'),
    ])
    return NextResponse.json({ anthropic, groq })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name, value } = (await req.json()) as { name: string; value: string }

    if (!isValidName(name)) {
      return NextResponse.json({ error: 'Invalid secret name' }, { status: 400 })
    }
    if (typeof value !== 'string' || value.trim().length < 10) {
      return NextResponse.json({ error: 'Invalid secret value' }, { status: 400 })
    }

    await setAiSecret(name, value.trim())
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
