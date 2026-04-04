const WAVE_API_KEY = process.env.WAVE_API_KEY || ''
const WAVE_API_URL = 'https://api.wave.com/v1'
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://kapital-stores.shop'

export interface WaveCheckoutResponse {
  id: string
  checkout_status: string
  wave_launch_url: string
  when_completed: string | null
  when_created: string
  client_reference: string | null
  amount: string
  currency: string
}

export interface WaveCheckoutError {
  error: string
  details?: string
}

export async function createWaveCheckout(data: {
  amount: number
  orderId: string
  customerEmail: string
}): Promise<{ success: true; data: WaveCheckoutResponse } | { success: false; error: string }> {
  if (!WAVE_API_KEY) {
    console.error('Wave API key is not configured')
    return { success: false, error: 'Wave payment is not configured. Please contact support.' }
  }

  try {
    const response = await fetch(`${WAVE_API_URL}/checkout/sessions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${WAVE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: data.amount,
        currency: 'XOF',
        client_reference: data.orderId,
        error_url: `${SITE_URL}/checkout?error=payment_failed&order=${data.orderId}`,
        success_url: `${SITE_URL}/orders?success=true&order=${data.orderId}`,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('Wave checkout error:', errorData)
      return {
        success: false,
        error: (errorData as WaveCheckoutError).error || 'Failed to create Wave checkout session',
      }
    }

    const checkoutData: WaveCheckoutResponse = await response.json()
    return { success: true, data: checkoutData }
  } catch (error) {
    console.error('Wave checkout error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error creating Wave checkout',
    }
  }
}

export async function checkWavePaymentStatus(
  checkoutId: string
): Promise<{ success: true; data: WaveCheckoutResponse } | { success: false; error: string }> {
  if (!WAVE_API_KEY) {
    return { success: false, error: 'Wave payment is not configured.' }
  }

  try {
    const response = await fetch(`${WAVE_API_URL}/checkout/sessions/${checkoutId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${WAVE_API_KEY}`,
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('Wave status check error:', errorData)
      return {
        success: false,
        error: (errorData as WaveCheckoutError).error || 'Failed to check payment status',
      }
    }

    const statusData: WaveCheckoutResponse = await response.json()
    return { success: true, data: statusData }
  } catch (error) {
    console.error('Wave status check error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error checking payment status',
    }
  }
}
