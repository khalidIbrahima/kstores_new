import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { emailLayout, emailButton, emailDivider, emailInfoRow } from '@/lib/email-layout'
import { verifyTurnstile } from '@/lib/turnstile'

const resend = new Resend(process.env.RESEND_API_KEY)
const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'khalidou.dev@gmail.com'

function esc(s: string) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;') }

export async function POST(req: NextRequest) {
  try {
    const { name, email, subject, message, turnstileToken } = await req.json()

    // Verify Turnstile
    const valid = await verifyTurnstile(turnstileToken)
    if (!valid) {
      return NextResponse.json({ error: 'Verification anti-bot echouee. Reessayez.' }, { status: 403 })
    }

    if (!name || !email || !subject || !message) {
      return NextResponse.json({ error: 'Tous les champs sont requis.' }, { status: 400 })
    }

    const safeName = esc(name)
    const safeSubject = esc(subject)
    const safeMessage = esc(message)

    // ─── Admin email ───
    await resend.emails.send({
      from: 'Kapital Stores <onboarding@resend.dev>',
      to: ADMIN_EMAIL,
      subject: `[Contact] ${subject}`,
      replyTo: email,
      html: emailLayout(`
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td style="padding-bottom:20px">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="width:48px;vertical-align:top">
                    <div style="width:44px;height:44px;border-radius:50%;background-color:#22c55e20;text-align:center;line-height:44px">
                      <span style="font-size:22px">&#9993;</span>
                    </div>
                  </td>
                  <td style="vertical-align:middle;padding-left:14px">
                    <h2 style="margin:0;color:#ffffff;font-size:20px;font-weight:800">Nouveau message</h2>
                    <p style="margin:4px 0 0;color:#6b7280;font-size:12px">Via le formulaire de contact</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          ${emailInfoRow('De', `${safeName} &lt;${esc(email)}&gt;`)}
          ${emailInfoRow('Sujet', safeSubject)}
        </table>

        ${emailDivider()}

        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td style="background-color:#0a0f1a;border:1px solid #1f2937;border-radius:14px;padding:20px">
              <p style="margin:0;color:#d1d5db;font-size:14px;line-height:1.8">${safeMessage.replace(/\n/g, '<br />')}</p>
            </td>
          </tr>
        </table>

        ${emailButton('Repondre par email', `mailto:${esc(email)}`)}
      `),
    })

    // ─── Customer confirmation ───
    await resend.emails.send({
      from: 'Kapital Stores <onboarding@resend.dev>',
      to: email,
      subject: 'Nous avons bien recu votre message',
      html: emailLayout(`
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td style="text-align:center;padding-bottom:24px">
              <div style="width:72px;height:72px;margin:0 auto 16px;border-radius:50%;background:linear-gradient(135deg,#22c55e20,#16a34a20);text-align:center;line-height:72px">
                <span style="font-size:36px;color:#22c55e">&#10003;</span>
              </div>
              <h2 style="margin:0;color:#ffffff;font-size:22px;font-weight:800">Message bien recu !</h2>
              <p style="margin:8px 0 0;color:#9ca3af;font-size:14px">Merci de nous avoir contacte, ${safeName}</p>
            </td>
          </tr>
        </table>

        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td style="background-color:#0a0f1a;border-left:4px solid #22c55e;border-radius:0 12px 12px 0;padding:16px 20px">
              <p style="margin:0;color:#6b7280;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;font-weight:700">Votre sujet</p>
              <p style="margin:8px 0 0;color:#e5e7eb;font-size:15px;font-weight:700">${safeSubject}</p>
            </td>
          </tr>
        </table>

        ${emailDivider()}

        <p style="margin:0;color:#d1d5db;font-size:14px;line-height:1.7">
          Notre equipe prend connaissance de votre message et vous repondra dans les plus brefs delais.
        </p>

        ${emailButton('Visiter la boutique', 'https://kapital-stores.shop')}
      `),
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Contact email error:', error)
    return NextResponse.json({ error: "Erreur lors de l'envoi." }, { status: 500 })
  }
}
