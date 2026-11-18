import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { notifyTelegramCriticalError } from '@/lib/telegram'
import {
  decideWaveWebhook,
  getWaveCheckoutSession,
  isWaveConfigured,
  isWaveSessionId,
  verifyWaveWebhookAuth,
} from '@/lib/wave'

// The webhook body is treated as a hint only. Every decision is made from the
// checkout session as returned by Wave's own API, and from the order in the database.

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  if (!supabaseUrl || !serviceRoleKey) return null
  return createClient(supabaseUrl, serviceRoleKey)
}

interface WaveWebhookPayload {
  type?: string
  data?: { id?: unknown }
}

interface OrderRow {
  id: string
  total: number
  status: string
  payment_status: string | null
  shipping_address: ({ _meta?: Record<string, unknown> } & Record<string, unknown>) | null
}

/** Only rows that are not already paid may be touched by a webhook. */
const NOT_PAID = 'payment_status.is.null,payment_status.neq.paid'

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text()

    const supabase = getSupabaseAdmin()
    if (!isWaveConfigured() || !supabase) {
      // Without the Wave API key nothing can be verified, so nothing is accepted.
      console.error('Wave webhook: rejected, Wave or Supabase service key is not configured')
      return NextResponse.json({ error: 'Wave webhook is not configured' }, { status: 503 })
    }

    const webhookSecret = process.env.WAVE_WEBHOOK_SECRET || ''
    if (webhookSecret) {
      const authentic = verifyWaveWebhookAuth(
        rawBody,
        { signature: req.headers.get('wave-signature'), authorization: req.headers.get('authorization') },
        webhookSecret
      )
      if (!authentic) {
        return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 })
      }
    }

    let payload: WaveWebhookPayload | null = null
    try {
      payload = JSON.parse(rawBody) as WaveWebhookPayload
    } catch {
      return NextResponse.json({ error: 'Invalid webhook payload' }, { status: 400 })
    }

    const sessionId = payload?.data?.id
    if (!isWaveSessionId(sessionId)) {
      return NextResponse.json({ error: 'Missing checkout session id' }, { status: 400 })
    }
    const eventType = typeof payload?.type === 'string' ? payload.type : ''

    const sessionResult = await getWaveCheckoutSession(sessionId)
    if (!sessionResult.success) {
      if (sessionResult.status === 404) {
        return NextResponse.json({ error: 'Unknown checkout session' }, { status: 400 })
      }
      // Wave unreachable: answer with an error so that Wave retries later.
      return NextResponse.json({ error: 'Unable to verify the checkout session' }, { status: 502 })
    }
    const session = sessionResult.data

    const orderId = session.client_reference
    if (!orderId) {
      return NextResponse.json({ success: true, status: 'ignored', reason: 'no_client_reference' })
    }

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, total, status, payment_status, shipping_address')
      .eq('id', orderId)
      .maybeSingle<OrderRow>()

    if (orderError) {
      console.error('Wave webhook: failed to load order:', orderError)
      return NextResponse.json({ error: 'Failed to load order' }, { status: 500 })
    }
    if (!order) {
      return NextResponse.json({ success: true, status: 'ignored', reason: 'order_not_found' })
    }

    const decision = decideWaveWebhook(session, order, eventType)
    const now = new Date().toISOString()

    if (decision.action === 'ignore') {
      console.log(`Wave webhook: ignored for order ${orderId} (${decision.reason})`)
      return NextResponse.json({ success: true, status: 'ignored', reason: decision.reason })
    }

    if (decision.action === 'alert') {
      console.error(`Wave webhook: order ${orderId} NOT marked as paid (${decision.reason})`)
      notifyTelegramCriticalError(
        'wave-webhook',
        new Error(`Paiement Wave non applique a la commande ${orderId} (session ${session.id}) : ${decision.reason}`)
      ).catch(() => {})
      // Acknowledged on purpose: retrying would not change the outcome.
      return NextResponse.json({ success: true, status: 'rejected', reason: decision.reason })
    }

    let update: Record<string, unknown>
    if (decision.action === 'mark_paid') {
      update = {
        payment_status: 'paid',
        payment_method: 'wave',
        wave_checkout_id: session.id,
        updated_at: now,
        shipping_address: {
          ...(order.shipping_address || {}),
          _meta: { ...(order.shipping_address?._meta || {}), paid_at: decision.paidAt || now },
        },
      }
      if (decision.setProcessing) update.status = 'processing'
    } else {
      update = {
        payment_status: decision.action === 'mark_expired' ? 'expired' : 'failed',
        wave_checkout_id: session.id,
        updated_at: now,
      }
    }

    const { error: updateError } = await supabase.from('orders').update(update).eq('id', orderId).or(NOT_PAID)
    if (updateError) {
      console.error('Wave webhook: failed to update order:', updateError)
      return NextResponse.json({ error: 'Failed to update order' }, { status: 500 })
    }

    console.log(`Wave webhook: order ${orderId} -> ${decision.action}`)
    return NextResponse.json({ success: true, status: decision.action })
  } catch (error) {
    console.error('Wave webhook error:', error)
    notifyTelegramCriticalError('wave-webhook', error).catch(() => {})
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
