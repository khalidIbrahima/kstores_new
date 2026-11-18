// Wave Checkout — server-side only (uses WAVE_API_KEY).
// API reference: https://docs.wave.com/checkout and https://docs.wave.com/webhook

import { createHmac, timingSafeEqual } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

const WAVE_API_URL = 'https://api.wave.com/v1'
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://kapitalstores.com'
/** Webhook signatures older than this are rejected (replay protection). */
const SIGNATURE_TOLERANCE_MS = 5 * 60 * 1000

type WaveSecretName = 'wave_api_key' | 'wave_webhook_secret' | 'wave_signing_secret'

const ENV_NAMES: Record<WaveSecretName, string> = {
  wave_api_key: 'WAVE_API_KEY',
  wave_webhook_secret: 'WAVE_WEBHOOK_SECRET',
  wave_signing_secret: 'WAVE_SIGNING_SECRET',
}

const SECRET_CACHE_TTL_MS = 60_000
const secretCache = new Map<WaveSecretName, { value: string; expiresAt: number }>()

export function invalidateWaveSecretCache(): void {
  secretCache.clear()
}

/**
 * A Wave secret comes from the environment variable when it is set, otherwise from
 * Supabase Vault (entered in Admin > Parametres > Paiements). Empty string when unset.
 */
async function getWaveSecret(name: WaveSecretName): Promise<string> {
  const fromEnv = process.env[ENV_NAMES[name]]
  if (fromEnv) return fromEnv

  const hit = secretCache.get(name)
  if (hit && hit.expiresAt > Date.now()) return hit.value

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  if (!url || !serviceRoleKey) return ''

  try {
    const { data, error } = await createClient(url, serviceRoleKey).rpc('get_ai_secret', { p_name: name })
    // A failed lookup is not cached: it must not hide a key for a whole minute.
    if (error) return ''
    const value = typeof data === 'string' ? data : ''
    secretCache.set(name, { value, expiresAt: Date.now() + SECRET_CACHE_TTL_MS })
    return value
  } catch {
    return ''
  }
}

const getApiKey = () => getWaveSecret('wave_api_key')

export const getWaveWebhookSecret = () => getWaveSecret('wave_webhook_secret')

/**
 * `Wave-Signature` header for an outgoing API request, for API keys created with
 * request signing: HMAC-SHA256 (hex) over `<unix seconds><raw body>`. GET requests sign
 * the timestamp alone. The body passed here must be the exact string that is sent.
 */
export function signWaveRequest(signingSecret: string, body: string = '', nowMs: number = Date.now()): string {
  const timestamp = Math.floor(nowMs / 1000)
  const signature = createHmac('sha256', signingSecret).update(`${timestamp}${body}`).digest('hex')
  return `t=${timestamp},v1=${signature}`
}

/** Headers for a Wave API call; signed when a request signing secret is configured. */
async function waveHeaders(apiKey: string, body?: string): Promise<Record<string, string>> {
  const headers: Record<string, string> = { Authorization: `Bearer ${apiKey}` }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  const signingSecret = await getWaveSecret('wave_signing_secret')
  if (signingSecret) headers['Wave-Signature'] = signWaveRequest(signingSecret, body ?? '')
  return headers
}

export const isWaveConfigured = async (): Promise<boolean> => (await getApiKey()) !== ''

export interface WaveCheckoutSession {
  id: string
  checkout_status: string // open | complete | expired
  payment_status?: string | null // processing | cancelled | succeeded
  wave_launch_url?: string
  when_completed?: string | null
  when_created?: string
  when_expires?: string | null
  client_reference: string | null
  amount: string
  currency: string
  last_payment_error?: { code?: string; message?: string } | null
}

/** @deprecated use WaveCheckoutSession */
export type WaveCheckoutResponse = WaveCheckoutSession

export interface WaveCheckoutError {
  error: string
  details?: string
}

type WaveResult<T> = { success: true; data: T } | { success: false; error: string; status?: number }

/** Session ids look like `cos-18qq25rgr100a`; anything else never reaches the Wave URL. */
export const isWaveSessionId = (value: unknown): value is string =>
  typeof value === 'string' && /^cos-[A-Za-z0-9]{1,40}$/.test(value)

export async function createWaveCheckout(data: {
  amount: number
  orderId: string
}): Promise<WaveResult<WaveCheckoutSession>> {
  const apiKey = await getApiKey()
  if (!apiKey) {
    console.error('Wave API key is not configured')
    return { success: false, error: 'Wave payment is not configured. Please contact support.', status: 503 }
  }

  try {
    // Serialized once: the signature must cover the exact bytes that are sent.
    const body = JSON.stringify({
      // XOF has no decimals and Wave expects the amount as a string
      amount: String(Math.round(data.amount)),
      currency: 'XOF',
      client_reference: data.orderId,
      error_url: `${SITE_URL}/checkout?error=payment_failed&order=${data.orderId}`,
      success_url: `${SITE_URL}/orders?success=true&order=${data.orderId}`,
    })
    const response = await fetch(`${WAVE_API_URL}/checkout/sessions`, {
      method: 'POST',
      headers: await waveHeaders(apiKey, body),
      body,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('Wave checkout error:', errorData)
      return {
        success: false,
        error: (errorData as WaveCheckoutError).error || 'Failed to create Wave checkout session',
        status: response.status,
      }
    }

    return { success: true, data: (await response.json()) as WaveCheckoutSession }
  } catch (error) {
    console.error('Wave checkout error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error creating Wave checkout',
    }
  }
}

/** Reads a checkout session straight from Wave — the only trusted source for its status and amount. */
export async function getWaveCheckoutSession(checkoutId: string): Promise<WaveResult<WaveCheckoutSession>> {
  const apiKey = await getApiKey()
  if (!apiKey) {
    return { success: false, error: 'Wave payment is not configured.', status: 503 }
  }
  if (!isWaveSessionId(checkoutId)) {
    return { success: false, error: 'Invalid Wave session id', status: 400 }
  }

  try {
    const response = await fetch(`${WAVE_API_URL}/checkout/sessions/${checkoutId}`, {
      method: 'GET',
      headers: await waveHeaders(apiKey),
      cache: 'no-store',
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return {
        success: false,
        error: (errorData as WaveCheckoutError).error || 'Failed to check payment status',
        status: response.status,
      }
    }

    return { success: true, data: (await response.json()) as WaveCheckoutSession }
  } catch (error) {
    console.error('Wave status check error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error checking payment status',
    }
  }
}

export interface WaveKeyTestResult {
  ok: boolean
  /** HTTP status returned by Wave, when Wave could be reached */
  status?: number
  /** Wave's own error code, e.g. `no-matching-api-key` */
  code?: string
  message: string
}

/**
 * Checks the stored API key against Wave with a read-only call: a search for a
 * reference that cannot exist. Nothing is created and no money moves.
 */
export async function testWaveApiKey(): Promise<WaveKeyTestResult> {
  const apiKey = await getApiKey()
  if (!apiKey) return { ok: false, message: 'Aucune cle API Wave configuree.' }

  try {
    const reference = `test-cle-${Date.now()}`
    const response = await fetch(
      `${WAVE_API_URL}/checkout/sessions/search?client_reference=${encodeURIComponent(reference)}`,
      { method: 'GET', headers: await waveHeaders(apiKey), cache: 'no-store' }
    )
    if (response.ok) {
      return { ok: true, status: response.status, message: 'Cle acceptee par Wave (acces aux paiements Checkout).' }
    }

    const body = (await response.json().catch(() => ({}))) as {
      code?: string
      message?: string
      error_code?: string
      error_message?: string
      error?: { code?: string; message?: string } | string
    }
    const nested = typeof body.error === 'object' && body.error ? body.error : null
    const code = nested?.code || body.code || body.error_code
    const detail = nested?.message || body.message || body.error_message || (typeof body.error === 'string' ? body.error : '')
    const SIGNATURE_HINTS: Record<string, string> = {
      'missing-signature': 'Cette cle API exige la signature des requetes : renseignez la cle de signature (wave_sn_AKS_...).',
      'invalid-signature': 'La cle de signature ne correspond pas a cette cle API.',
      'invalid-signature-format': 'Signature mal formee.',
      'invalid-signature-timestamp': 'Horodatage de signature invalide.',
      'expired-signature-timestamp': 'Horodatage de signature hors delai (horloge du serveur).',
    }
    const summary =
      code && SIGNATURE_HINTS[code]
        ? SIGNATURE_HINTS[code]
        : response.status === 401
        ? 'Cle refusee par Wave (inconnue, revoquee ou mal copiee).'
        : response.status === 403
          ? 'Cle reconnue mais non autorisee (permission Checkout manquante ou adresse IP non autorisee).'
          : `Wave a repondu ${response.status}.`
    return { ok: false, status: response.status, code, message: detail ? `${summary} ${detail}` : summary }
  } catch (error) {
    return {
      ok: false,
      message: `Wave est injoignable : ${error instanceof Error ? error.message : 'erreur reseau'}`,
    }
  }
}

/** @deprecated use getWaveCheckoutSession */
export const checkWavePaymentStatus = getWaveCheckoutSession

const safeEqual = (a: string, b: string): boolean => {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  return left.length === right.length && timingSafeEqual(left, right)
}

/**
 * Checks that a webhook request really comes from Wave, for either strategy Wave offers:
 * - signing secret: `Wave-Signature: t=<unix ts>,v1=<hex hmac>` where the HMAC-SHA256 is
 *   computed over `<ts><raw body>` (several v1 values may be present during key rotation);
 * - shared secret: `Authorization: Bearer <secret>`.
 */
export function verifyWaveWebhookAuth(
  rawBody: string,
  headers: { signature?: string | null; authorization?: string | null },
  secret: string,
  nowMs: number = Date.now()
): boolean {
  if (!secret) return false

  const signatureHeader = (headers.signature || '').trim()
  if (signatureHeader) {
    const parts = signatureHeader.split(',').map((part) => part.trim())
    const timestamp = parts.find((part) => part.startsWith('t='))?.slice(2) || ''
    const signatures = parts.filter((part) => part.startsWith('v1=')).map((part) => part.slice(3))
    if (!/^\d+$/.test(timestamp) || signatures.length === 0) return false
    if (Math.abs(nowMs - Number(timestamp) * 1000) > SIGNATURE_TOLERANCE_MS) return false

    const expected = createHmac('sha256', secret).update(timestamp + rawBody).digest('hex')
    return signatures.some((signature) => safeEqual(signature, expected))
  }

  const authorization = (headers.authorization || '').trim()
  if (authorization.startsWith('Bearer ')) {
    return safeEqual(authorization.slice('Bearer '.length), secret)
  }
  return false
}

export interface WaveOrderSnapshot {
  id: string
  total: number
  status: string
  payment_status: string | null
}

export type WaveWebhookDecision =
  | { action: 'mark_paid'; setProcessing: boolean; paidAt: string | null }
  | { action: 'mark_expired' }
  | { action: 'mark_failed' }
  | { action: 'ignore'; reason: string }
  /** Something is wrong and a human must look: nothing is written to the order. */
  | { action: 'alert'; reason: string }

/**
 * Decides what a webhook is allowed to do to an order.
 * `session` must come from getWaveCheckoutSession (Wave's API), never from the webhook body.
 */
export function decideWaveWebhook(
  session: WaveCheckoutSession,
  order: WaveOrderSnapshot,
  eventType: string
): WaveWebhookDecision {
  if (session.client_reference !== order.id) {
    return { action: 'ignore', reason: 'session_does_not_belong_to_order' }
  }

  const alreadyPaid = order.payment_status === 'paid'

  if (session.checkout_status === 'complete' && session.payment_status === 'succeeded') {
    if (alreadyPaid) return { action: 'ignore', reason: 'already_paid' }
    if (session.currency !== 'XOF') {
      return { action: 'alert', reason: `unexpected_currency:${session.currency}` }
    }
    const paid = Number(session.amount)
    const due = Math.round(Number(order.total))
    if (!Number.isFinite(paid) || !Number.isFinite(due) || paid !== due) {
      return { action: 'alert', reason: `amount_mismatch:paid=${session.amount},due=${due}` }
    }
    return {
      action: 'mark_paid',
      // Never pull a shipped/delivered/cancelled order back to "processing"
      setProcessing: order.status === 'pending',
      paidAt: session.when_completed || null,
    }
  }

  // A late "expired"/"failed" event must never undo a payment recorded another way.
  if (alreadyPaid) return { action: 'ignore', reason: 'already_paid' }

  if (session.checkout_status === 'expired') return { action: 'mark_expired' }

  if (eventType === 'checkout.session.payment_failed' || session.payment_status === 'cancelled') {
    return { action: 'mark_failed' }
  }

  return { action: 'ignore', reason: `nothing_to_do:${session.checkout_status}/${session.payment_status ?? 'none'}` }
}
