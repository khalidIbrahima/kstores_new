import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { emailLayout, emailButton, emailDivider } from '@/lib/email-layout'
import { verifyTurnstile } from '@/lib/turnstile'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest) {
  try {
    const { email, turnstileToken } = await req.json()

    const valid = await verifyTurnstile(turnstileToken)
    if (!valid) {
      return NextResponse.json({ error: 'Verification anti-bot echouee.' }, { status: 403 })
    }

    if (!email) {
      return NextResponse.json({ error: 'Email requis.' }, { status: 400 })
    }

    // Save subscriber to database (upsert to handle duplicates)
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { error: dbError } = await supabase.from('newsletter_subscribers').upsert(
      { email, status: 'active', source: 'website', subscribed_at: new Date().toISOString() },
      { onConflict: 'email' }
    )
    if (dbError) console.error('Newsletter DB error:', dbError)

    // Send welcome email
    await resend.emails.send({
      from: 'Kapital Stores <onboarding@resend.dev>',
      to: email,
      subject: 'Bienvenue dans la famille Kapital Stores !',
      html: emailLayout(`
        <!-- Welcome hero -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td style="text-align:center;padding-bottom:24px">
              <div style="width:88px;height:88px;margin:0 auto 18px;border-radius:50%;background:linear-gradient(135deg,#22c55e,#16a34a);text-align:center;line-height:88px">
                <span style="font-size:44px;color:#000">&#9733;</span>
              </div>
              <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:900;letter-spacing:-0.5px">Bienvenue !</h1>
              <p style="margin:10px 0 0;color:#9ca3af;font-size:15px;line-height:1.6">
                Vous faites maintenant partie de la communaute Kapital Stores.
              </p>
            </td>
          </tr>
        </table>

        ${emailDivider()}

        <!-- Benefits -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr><td style="padding-bottom:16px"><p style="margin:0;color:#ffffff;font-size:15px;font-weight:800;text-align:center">Ce qui vous attend</p></td></tr>
          <tr>
            <td>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="width:33%;text-align:center;padding:8px 4px;vertical-align:top">
                    <div style="width:48px;height:48px;margin:0 auto 10px;border-radius:14px;background-color:#22c55e15;text-align:center;line-height:48px">
                      <span style="font-size:24px">&#128640;</span>
                    </div>
                    <p style="margin:0;color:#e5e7eb;font-size:13px;font-weight:700">Nouveautes</p>
                    <p style="margin:4px 0 0;color:#6b7280;font-size:11px">En avant-premiere</p>
                  </td>
                  <td style="width:33%;text-align:center;padding:8px 4px;vertical-align:top">
                    <div style="width:48px;height:48px;margin:0 auto 10px;border-radius:14px;background-color:#22c55e15;text-align:center;line-height:48px">
                      <span style="font-size:24px">&#127873;</span>
                    </div>
                    <p style="margin:0;color:#e5e7eb;font-size:13px;font-weight:700">Offres VIP</p>
                    <p style="margin:4px 0 0;color:#6b7280;font-size:11px">Exclusives</p>
                  </td>
                  <td style="width:33%;text-align:center;padding:8px 4px;vertical-align:top">
                    <div style="width:48px;height:48px;margin:0 auto 10px;border-radius:14px;background-color:#22c55e15;text-align:center;line-height:48px">
                      <span style="font-size:24px">&#9889;</span>
                    </div>
                    <p style="margin:0;color:#e5e7eb;font-size:13px;font-weight:700">Flash Sales</p>
                    <p style="margin:4px 0 0;color:#6b7280;font-size:11px">Duree limitee</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        ${emailButton('Decouvrir la boutique', 'https://kapital-stores.shop/products')}
      `),
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Newsletter email error:', error)
    return NextResponse.json({ error: "Erreur lors de l'inscription." }, { status: 500 })
  }
}
