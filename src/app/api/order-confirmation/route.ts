import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { emailLayout, emailButton, emailDivider, emailInfoRow } from '@/lib/email-layout'

const resend = new Resend(process.env.RESEND_API_KEY)
const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'khalidou.sowba@gmail.com'

interface OrderItem { name: string; quantity: number; price: number }

function esc(str: string) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

const fmtXOF = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(n)

export async function POST(req: NextRequest) {
  try {
    const { email, firstName, orderId, total, items } = (await req.json()) as {
      email: string; firstName: string; orderId: string; total: number; items: OrderItem[]
    }

    if (!email || !orderId) {
      return NextResponse.json({ error: 'Donnees manquantes.' }, { status: 400 })
    }

    const id8 = orderId.slice(0, 8).toUpperCase()
    const name = esc(firstName || 'cher client')

    const itemRows = items.map((item, i) => `
      <tr>
        <td style="padding:12px 0;${i < items.length - 1 ? 'border-bottom:1px solid #1a2332' : ''}">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr>
              <td style="vertical-align:top;width:32px">
                <div style="width:28px;height:28px;background-color:#1a2332;border-radius:8px;text-align:center;line-height:28px;font-size:12px;font-weight:700;color:#22c55e">${item.quantity}</div>
              </td>
              <td style="vertical-align:middle;padding:0 12px">
                <p style="margin:0;color:#e5e7eb;font-size:14px;font-weight:600">${esc(item.name)}</p>
                <p style="margin:3px 0 0;color:#6b7280;font-size:11px">${fmtXOF(item.price)} x ${item.quantity}</p>
              </td>
              <td style="vertical-align:middle;text-align:right">
                <p style="margin:0;color:#22c55e;font-size:15px;font-weight:800">${fmtXOF(item.price * item.quantity)}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>`).join('')

    // ─── Customer email ───
    await resend.emails.send({
      from: 'Kapital Stores <onboarding@resend.dev>',
      to: email,
      subject: `Commande confirmee #${id8}`,
      html: emailLayout(`
        <!-- Hero -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td style="text-align:center;padding-bottom:24px">
              <div style="width:80px;height:80px;margin:0 auto 16px;border-radius:50%;background:linear-gradient(135deg,#22c55e,#16a34a);text-align:center;line-height:80px">
                <span style="font-size:40px;color:#000">&#10003;</span>
              </div>
              <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:900;letter-spacing:-0.3px">Commande confirmee !</h1>
              <p style="margin:8px 0 0;color:#9ca3af;font-size:15px">Merci pour votre achat, ${name}</p>
            </td>
          </tr>
        </table>

        <!-- Order ID -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:24px">
          <tr>
            <td style="background-color:#0a0f1a;border:1px solid #1f2937;border-radius:14px;padding:18px;text-align:center">
              <p style="margin:0;color:#6b7280;font-size:10px;text-transform:uppercase;letter-spacing:2px;font-weight:600">Numero de commande</p>
              <p style="margin:10px 0 0;color:#22c55e;font-size:26px;font-weight:900;font-family:'Courier New',monospace;letter-spacing:3px">#${id8}</p>
            </td>
          </tr>
        </table>

        <!-- Items -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:4px">
          <tr><td style="padding-bottom:12px"><p style="margin:0;color:#6b7280;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;font-weight:700">Articles commandes</p></td></tr>
          ${itemRows}
        </table>

        <!-- Total -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:16px">
          <tr>
            <td style="background:linear-gradient(135deg,#0d2818,#0a1f14);border:2px solid #22c55e40;border-radius:14px;padding:20px;text-align:center">
              <p style="margin:0;color:#6b7280;font-size:10px;text-transform:uppercase;letter-spacing:2px;font-weight:600">Total de la commande</p>
              <p style="margin:10px 0 0;color:#22c55e;font-size:32px;font-weight:900;letter-spacing:-0.5px">${fmtXOF(total)}</p>
            </td>
          </tr>
        </table>

        ${emailDivider()}

        <!-- Steps -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr><td style="padding-bottom:16px"><p style="margin:0;color:#ffffff;font-size:15px;font-weight:800">Et maintenant ?</p></td></tr>
          <tr>
            <td>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="width:36px;vertical-align:top;padding-bottom:12px">
                    <div style="width:28px;height:28px;border-radius:50%;background-color:#22c55e20;text-align:center;line-height:28px;color:#22c55e;font-size:13px;font-weight:800">1</div>
                  </td>
                  <td style="vertical-align:middle;padding-bottom:12px;color:#d1d5db;font-size:13px">Nous verifions et preparons votre commande</td>
                </tr>
                <tr>
                  <td style="width:36px;vertical-align:top;padding-bottom:12px">
                    <div style="width:28px;height:28px;border-radius:50%;background-color:#22c55e20;text-align:center;line-height:28px;color:#22c55e;font-size:13px;font-weight:800">2</div>
                  </td>
                  <td style="vertical-align:middle;padding-bottom:12px;color:#d1d5db;font-size:13px">Vous recevez un SMS/WhatsApp de confirmation de livraison</td>
                </tr>
                <tr>
                  <td style="width:36px;vertical-align:top">
                    <div style="width:28px;height:28px;border-radius:50%;background-color:#22c55e20;text-align:center;line-height:28px;color:#22c55e;font-size:13px;font-weight:800">3</div>
                  </td>
                  <td style="vertical-align:middle;color:#d1d5db;font-size:13px">Livraison rapide a votre porte !</td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        ${emailButton('Suivre ma commande', 'https://kapital-stores.shop/orders')}
      `),
    })

    // ─── Admin email ───
    await resend.emails.send({
      from: 'Kapital Stores <onboarding@resend.dev>',
      to: ADMIN_EMAIL,
      subject: `Nouvelle commande #${id8} — ${fmtXOF(total)}`,
      html: emailLayout(`
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td style="text-align:center;padding-bottom:20px">
              <div style="width:64px;height:64px;margin:0 auto 12px;border-radius:50%;background-color:#22c55e;text-align:center;line-height:64px">
                <span style="font-size:32px;color:#000">&#128176;</span>
              </div>
              <h2 style="margin:0;color:#ffffff;font-size:22px;font-weight:800">Nouvelle commande !</h2>
              <p style="margin:8px 0 0;color:#22c55e;font-size:28px;font-weight:900">${fmtXOF(total)}</p>
            </td>
          </tr>
        </table>

        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          ${emailInfoRow('Commande', `<span style="color:#22c55e;font-family:monospace;font-weight:800">#${id8}</span>`)}
          ${emailInfoRow('Client', name)}
          ${emailInfoRow('Email', esc(email))}
          ${emailInfoRow('Articles', `${items.length} produit${items.length > 1 ? 's' : ''}`)}
        </table>

        ${emailButton('Voir dans le panneau admin', 'https://kapital-stores.shop/admin/orders')}
      `),
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Order confirmation email error:', error)
    return NextResponse.json({ error: "Erreur lors de l'envoi." }, { status: 500 })
  }
}
