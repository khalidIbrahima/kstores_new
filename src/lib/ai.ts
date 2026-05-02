import { createClient } from '@supabase/supabase-js'

export type AiProvider = 'groq' | 'anthropic'

export interface AiMessage {
  role: 'user' | 'assistant'
  content: string
}

interface AiConfig {
  provider: AiProvider
  apiKey: string
}

const CACHE_TTL_MS = 5_000
let cached: { value: AiConfig; expiresAt: number } | null = null

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  if (!url || !key) throw new Error('Supabase service-role credentials are not configured')
  return createClient(url, key)
}

export function invalidateAiConfigCache() {
  cached = null
}

export type AiConfigFailure =
  | { reason: 'settings_missing'; details?: string }
  | { reason: 'rpc_error'; details: string }
  | { reason: 'secret_not_found'; provider: AiProvider; secretName: string }

export async function getAiConfig(): Promise<
  { ok: true; config: AiConfig } | { ok: false; failure: AiConfigFailure }
> {
  if (cached && cached.expiresAt > Date.now()) return { ok: true, config: cached.value }

  const supabase = getSupabaseAdmin()

  const { data: settings, error: settingsError } = await supabase
    .from('store_settings')
    .select('ai_provider')
    .single()

  if (settingsError || !settings) {
    return {
      ok: false,
      failure: { reason: 'settings_missing', details: settingsError?.message },
    }
  }

  const provider: AiProvider = settings.ai_provider === 'anthropic' ? 'anthropic' : 'groq'
  const secretName = provider === 'anthropic' ? 'anthropic_api_key' : 'groq_api_key'

  const { data: apiKey, error: rpcError } = await supabase.rpc('get_ai_secret', { p_name: secretName })

  if (rpcError) {
    return { ok: false, failure: { reason: 'rpc_error', details: rpcError.message } }
  }
  if (!apiKey || typeof apiKey !== 'string') {
    return { ok: false, failure: { reason: 'secret_not_found', provider, secretName } }
  }

  const config: AiConfig = { provider, apiKey }
  cached = { value: config, expiresAt: Date.now() + CACHE_TTL_MS }
  return { ok: true, config }
}

export async function hasAiSecret(name: 'anthropic_api_key' | 'groq_api_key'): Promise<boolean> {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase.rpc('has_ai_secret', { p_name: name })
  if (error) return false
  return data === true
}

export async function setAiSecret(
  name: 'anthropic_api_key' | 'groq_api_key',
  value: string
): Promise<void> {
  const supabase = getSupabaseAdmin()
  const { error } = await supabase.rpc('set_ai_secret', { p_name: name, p_value: value })
  if (error) throw new Error(error.message)
  invalidateAiConfigCache()
}

interface ChatResult {
  reply: string
}

export async function callAi(
  config: AiConfig,
  systemPrompt: string,
  messages: AiMessage[]
): Promise<ChatResult> {
  if (config.provider === 'anthropic') return callAnthropic(config.apiKey, systemPrompt, messages)
  return callGroq(config.apiKey, systemPrompt, messages)
}

const ANTHROPIC_MODEL = 'claude-haiku-4-5-20251001'
const GROQ_MODEL = 'llama-3.3-70b-versatile'

async function callGroq(apiKey: string, systemPrompt: string, messages: AiMessage[]): Promise<ChatResult> {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
      temperature: 0.3,
      max_tokens: 2000,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Groq API error (${res.status}): ${err}`)
  }

  const data = await res.json()
  return { reply: data.choices?.[0]?.message?.content || '' }
}

async function callAnthropic(apiKey: string, systemPrompt: string, messages: AiMessage[]): Promise<ChatResult> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 2000,
      temperature: 0.3,
      system: [
        {
          type: 'text',
          text: systemPrompt,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Anthropic API error (${res.status}): ${err}`)
  }

  const data = await res.json()
  const reply =
    Array.isArray(data.content)
      ? data.content
          .filter((block: { type: string }) => block.type === 'text')
          .map((block: { text: string }) => block.text)
          .join('')
      : ''
  return { reply }
}
