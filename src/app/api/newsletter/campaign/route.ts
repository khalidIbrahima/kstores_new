import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { emailLayout, emailButton } from '@/lib/email-layout'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest) {
  try {
    const { email, subject, body } = await req.json()

    if (!email || !subject || !body) {
      return NextResponse.json({ error: 'Donnees manquantes.' }, { status: 400 })
    }

    await resend.emails.send({
      from: 'Kapital Stores <noreply@kapitalstores.com>',
      to: email,
      subject,
      html: emailLayout(`
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td>
              <div style="color:#e5e7eb;font-size:14px;line-height:1.8">${body}</div>
            </td>
          </tr>
        </table>
        ${emailButton('Visiter la boutique', 'https://kapitalstores.com/products')}
      `),
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Campaign email error:', error)
    return NextResponse.json({ error: "Erreur lors de l'envoi." }, { status: 500 })
  }
}
