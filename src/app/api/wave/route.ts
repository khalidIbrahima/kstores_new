import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createWaveCheckout, isWaveConfigured } from '@/lib/wave'

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  if (!supabaseUrl || !serviceRoleKey) return null
  return createClient(supabaseUrl, serviceRoleKey)
}

/**
 * Creates a Wave checkout session for an order.
 * The amount is always read from the order in the database: whatever amount the
 * browser sends is ignored, so a session can never be created for less than what is due.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as { orderId?: unknown } | null
    const orderId = body?.orderId

    if (typeof orderId !== 'string' || !/^[0-9a-f-]{36}$/i.test(orderId)) {
      return NextResponse.json({ error: 'Missing or invalid orderId' }, { status: 400 })
    }

    if (!isWaveConfigured()) {
      return NextResponse.json(
        { error: 'Wave payment is not configured. Please contact support.' },
        { status: 503 }
      )
    }

    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return NextResponse.json({ error: 'Payment service is not configured.' }, { status: 503 })
    }

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, total, status, payment_status')
      .eq('id', orderId)
      .maybeSingle()

    if (orderError) {
      return NextResponse.json({ error: 'Unable to load the order' }, { status: 500 })
    }
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }
    if (order.payment_status === 'paid') {
      return NextResponse.json({ error: 'Cette commande est deja payee.' }, { status: 409 })
    }
    if (order.status === 'cancelled') {
      return NextResponse.json({ error: 'Cette commande est annulee.' }, { status: 409 })
    }

    const amount = Math.round(Number(order.total))
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: 'Le montant de la commande est invalide.' }, { status: 409 })
    }

    const result = await createWaveCheckout({ amount, orderId: order.id })
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: result.status || 502 })
    }

    const session = result.data
    if (!session.wave_launch_url) {
      return NextResponse.json({ error: 'Wave did not return a payment link' }, { status: 502 })
    }

    // Best effort: the webhook does not depend on this.
    await supabase
      .from('orders')
      .update({ wave_checkout_id: session.id, payment_status: 'pending', updated_at: new Date().toISOString() })
      .eq('id', order.id)
      .or('payment_status.is.null,payment_status.neq.paid')

    return NextResponse.json({
      checkout_url: session.wave_launch_url,
      session_id: session.id,
      expires_at: session.when_expires || null,
    })
  } catch (error) {
    console.error('Wave checkout API route error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
