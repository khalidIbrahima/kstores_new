import { NextRequest, NextResponse } from 'next/server'

const WAVE_API_KEY = process.env.WAVE_API_KEY || ''
const WAVE_API_URL = 'https://api.wave.com/v1'
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://kapitalstores.com'

export async function POST(req: NextRequest) {
  try {
    const { amount, orderId, customerEmail } = (await req.json()) as {
      amount: number
      orderId: string
      customerEmail: string
    }

    if (!amount || !orderId || !customerEmail) {
      return NextResponse.json(
        { error: 'Missing required fields: amount, orderId, customerEmail' },
        { status: 400 }
      )
    }

    if (!WAVE_API_KEY) {
      return NextResponse.json(
        { error: 'Wave payment is not configured. Please contact support.' },
        { status: 503 }
      )
    }

    const response = await fetch(`${WAVE_API_URL}/checkout/sessions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${WAVE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount,
        currency: 'XOF',
        client_reference: orderId,
        error_url: `${SITE_URL}/checkout?error=payment_failed&order=${orderId}`,
        success_url: `${SITE_URL}/orders?success=true&order=${orderId}`,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('Wave API error:', errorData)
      return NextResponse.json(
        { error: errorData.error || 'Failed to create Wave checkout session' },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json({
      checkout_url: data.wave_launch_url,
      session_id: data.id,
    })
  } catch (error) {
    console.error('Wave checkout API route error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
