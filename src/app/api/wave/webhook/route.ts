import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Use a server-side Supabase client with the service role key for webhook processing
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

function getSupabaseAdmin() {
  return createClient(supabaseUrl, supabaseServiceKey)
}

interface WaveWebhookPayload {
  type: string
  data: {
    id: string
    checkout_status: string
    client_reference: string | null
    amount: string
    currency: string
    when_completed: string | null
    payment_status?: string
  }
}

export async function POST(req: NextRequest) {
  try {
    const payload = (await req.json()) as WaveWebhookPayload

    // Validate payload structure
    if (!payload || !payload.data) {
      return NextResponse.json({ error: 'Invalid webhook payload' }, { status: 400 })
    }

    const { type, data } = payload
    const orderId = data.client_reference

    if (!orderId) {
      console.error('Wave webhook: No client_reference (orderId) in payload')
      return NextResponse.json({ error: 'Missing order reference' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    if (type === 'checkout.session.completed' || data.checkout_status === 'complete') {
      // Payment succeeded — update order status
      const { error } = await supabase
        .from('orders')
        .update({
          status: 'processing',
          payment_status: 'paid',
          payment_method: 'wave',
          wave_checkout_id: data.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId)

      if (error) {
        console.error('Wave webhook: Failed to update order (success):', error)
        return NextResponse.json({ error: 'Failed to update order' }, { status: 500 })
      }

      console.log(`Wave webhook: Order ${orderId} marked as paid`)
      return NextResponse.json({ success: true, status: 'processing' })
    }

    if (type === 'checkout.session.expired' || data.checkout_status === 'expired') {
      // Payment expired
      const { error } = await supabase
        .from('orders')
        .update({
          payment_status: 'expired',
          wave_checkout_id: data.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId)

      if (error) {
        console.error('Wave webhook: Failed to update order (expired):', error)
        return NextResponse.json({ error: 'Failed to update order' }, { status: 500 })
      }

      console.log(`Wave webhook: Order ${orderId} payment expired`)
      return NextResponse.json({ success: true, status: 'expired' })
    }

    if (data.checkout_status === 'error' || data.payment_status === 'failed') {
      // Payment failed
      const { error } = await supabase
        .from('orders')
        .update({
          payment_status: 'failed',
          wave_checkout_id: data.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId)

      if (error) {
        console.error('Wave webhook: Failed to update order (failed):', error)
        return NextResponse.json({ error: 'Failed to update order' }, { status: 500 })
      }

      console.log(`Wave webhook: Order ${orderId} payment failed`)
      return NextResponse.json({ success: true, status: 'failed' })
    }

    // Unhandled event type — acknowledge it to avoid retries
    console.log(`Wave webhook: Unhandled event type "${type}" for order ${orderId}`)
    return NextResponse.json({ success: true, status: 'ignored' })
  } catch (error) {
    console.error('Wave webhook error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
