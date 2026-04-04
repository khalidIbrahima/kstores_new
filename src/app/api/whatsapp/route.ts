import { NextRequest, NextResponse } from 'next/server'

const TWILIO_SID = process.env.NEXT_PUBLIC_TWILIO_ACCOUNT_SID || ''
const TWILIO_TOKEN = process.env.NEXT_PUBLIC_TWILIO_AUTH_TOKEN || ''
const TWILIO_WHATSAPP_FROM = process.env.NEXT_PUBLIC_TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886'

export async function POST(req: NextRequest) {
  try {
    const { to, message } = (await req.json()) as { to: string; message: string }

    if (!to || !message) {
      return NextResponse.json({ error: 'Missing required fields: to, message' }, { status: 400 })
    }

    if (!TWILIO_SID || !TWILIO_TOKEN) {
      return NextResponse.json({ error: 'Twilio credentials are not configured' }, { status: 500 })
    }

    const toNumber = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`

    const body = new URLSearchParams({
      From: TWILIO_WHATSAPP_FROM,
      To: toNumber,
      Body: message,
    })

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: 'Basic ' + Buffer.from(`${TWILIO_SID}:${TWILIO_TOKEN}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      }
    )

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Twilio API error:', errorData)
      return NextResponse.json(
        { error: errorData.message || 'Failed to send WhatsApp message' },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json({ success: true, sid: data.sid })
  } catch (error) {
    console.error('WhatsApp API route error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
