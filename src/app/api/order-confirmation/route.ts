import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { emailLayout, emailButton, emailDivider, emailInfoRow } from '@/lib/email-layout'

const resend = new Resend(process.env.RESEND_API_KEY)
const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'khalidou.dev@gmail.com'

interface OrderItem { name: string; quantity: number; price: number }

function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

const fmtXOF = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(Number(n) || 0)

export async function POST(req: NextRequest) {
  try {
    const { email, firstName, phone, address, orderId, total, items } = (await req.json()) as {
      email: string; firstName: string; phone?: string; address?: string
      orderId: string; total: number; items: OrderItem[]
    }

    if (!orderId) {
      return NextResponse.json({ error: 'Donnees manquantes.' }, { status: 400 })
    }

    const id8 = orderId.slice(0, 8).toUpperCase()
    const name = esc(firstName || 'Client')
    const safePhone = phone ? esc(phone) : null
    const safeAddress = address ? esc(address) : null
    const safeEmail = esc(email)
    const itemCount = items.length
    const date = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })

    // ─── Item rows (shared by both emails) ───
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

    // ─── Customer info section (shared) ───
    const customerSection = `
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        ${emailInfoRow('Client', `<span style="color:#ffffff;font-weight:700">${name}</span>`)}
        ${emailInfoRow('Email', safeEmail)}
        ${safePhone ? emailInfoRow('Telephone', `<a href="tel:${safePhone}" style="color:#22c55e;text-decoration:none;font-weight:600">${safePhone}</a>`) : ''}
        ${safeAddress ? emailInfoRow('Adresse', safeAddress) : ''}
      </table>`

    // ═══════════════════════════════════════════
    // ADMIN EMAIL — Full order details
    // ═══════════════════════════════════════════
    await resend.emails.send({
      from: 'Kapital Stores <noreply@kapitalstores.com>',
      to: ADMIN_EMAIL,
      subject: `Nouvelle commande #${id8} — ${fmtXOF(total)} — ${name}`,
      html: emailLayout(`
        <!-- Header -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td style="text-align:center;padding-bottom:20px">
              <div style="width:64px;height:64px;margin:0 auto 12px;border-radius:50%;background-color:#22c55e;text-align:center;line-height:64px">
                <span style="font-size:32px;color:#000">&#128176;</span>
              </div>
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:900">Nouvelle commande !</h1>
              <p style="margin:8px 0 0;color:#9ca3af;font-size:13px">${date}</p>
            </td>
          </tr>
        </table>

        <!-- Order ID + Total -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:20px">
          <tr>
            <td style="width:50%;padding-right:6px">
              <div style="background-color:#0a0f1a;border:1px solid #1f2937;border-radius:12px;padding:14px;text-align:center">
                <p style="margin:0;color:#6b7280;font-size:9px;text-transform:uppercase;letter-spacing:1.5px;font-weight:600">Commande</p>
                <p style="margin:6px 0 0;color:#22c55e;font-size:20px;font-weight:900;font-family:'Courier New',monospace;letter-spacing:2px">#${id8}</p>
              </div>
            </td>
            <td style="width:50%;padding-left:6px">
              <div style="background:linear-gradient(135deg,#0d2818,#0a1f14);border:2px solid #22c55e40;border-radius:12px;padding:14px;text-align:center">
                <p style="margin:0;color:#6b7280;font-size:9px;text-transform:uppercase;letter-spacing:1.5px;font-weight:600">Total</p>
                <p style="margin:6px 0 0;color:#22c55e;font-size:22px;font-weight:900">${fmtXOF(total)}</p>
              </div>
            </td>
          </tr>
        </table>

        ${emailDivider()}

        <!-- Customer info -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr><td style="padding-bottom:12px"><p style="margin:0;color:#ffffff;font-size:14px;font-weight:800">Informations client</p></td></tr>
        </table>
        ${customerSection}

        ${emailDivider()}

        <!-- Items list -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr><td style="padding-bottom:12px"><p style="margin:0;color:#ffffff;font-size:14px;font-weight:800">Articles (${itemCount})</p></td></tr>
        </table>
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          ${itemRows}
        </table>

        <!-- Total recap -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:16px">
          <tr>
            <td style="border-top:2px solid #22c55e30;padding-top:14px">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="color:#9ca3af;font-size:13px;font-weight:600">Total commande</td>
                  <td style="text-align:right;color:#22c55e;font-size:20px;font-weight:900">${fmtXOF(total)}</td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        ${safePhone ? `
        ${emailDivider()}
        <!-- Quick actions -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td style="text-align:center">
              <p style="margin:0 0 12px;color:#9ca3af;font-size:12px">Contacter le client</p>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center">
                <tr>
                  <td style="padding-right:8px">
                    <a href="https://wa.me/${safePhone.replace(/[^0-9+]/g, '')}" style="display:inline-block;background-color:#25D366;color:#fff;font-size:12px;font-weight:700;padding:10px 20px;border-radius:8px;text-decoration:none">WhatsApp</a>
                  </td>
                  <td style="padding-left:8px">
                    <a href="tel:${safePhone}" style="display:inline-block;background-color:#3b82f6;color:#fff;font-size:12px;font-weight:700;padding:10px 20px;border-radius:8px;text-decoration:none">Appeler</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
        ` : ''}

        ${emailButton('Gerer la commande', `https://kapitalstores.com/admin/orders`)}
      `),
    })

    // ═══════════════════════════════════════════
    // CUSTOMER EMAIL — Order confirmation (only if email provided)
    // ═══════════════════════════════════════════
    if (email) {
    await resend.emails.send({
      from: 'Kapital Stores <noreply@kapitalstores.com>',
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
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:20px">
          <tr>
            <td style="background-color:#0a0f1a;border:1px solid #1f2937;border-radius:14px;padding:16px;text-align:center">
              <p style="margin:0;color:#6b7280;font-size:10px;text-transform:uppercase;letter-spacing:2px;font-weight:600">Numero de commande</p>
              <p style="margin:8px 0 0;color:#22c55e;font-size:24px;font-weight:900;font-family:'Courier New',monospace;letter-spacing:3px">#${id8}</p>
            </td>
          </tr>
        </table>

        <!-- Items -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr><td style="padding-bottom:10px"><p style="margin:0;color:#6b7280;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;font-weight:700">Vos articles</p></td></tr>
          ${itemRows}
        </table>

        <!-- Total -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:16px">
          <tr>
            <td style="background:linear-gradient(135deg,#0d2818,#0a1f14);border:2px solid #22c55e40;border-radius:14px;padding:18px;text-align:center">
              <p style="margin:0;color:#6b7280;font-size:10px;text-transform:uppercase;letter-spacing:2px;font-weight:600">Total</p>
              <p style="margin:8px 0 0;color:#22c55e;font-size:30px;font-weight:900">${fmtXOF(total)}</p>
            </td>
          </tr>
        </table>

        ${safeAddress ? `
        ${emailDivider()}
        <!-- Delivery info -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td style="background-color:#0a0f1a;border-left:4px solid #22c55e;border-radius:0 12px 12px 0;padding:14px 18px">
              <p style="margin:0;color:#6b7280;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;font-weight:700">Adresse de livraison</p>
              <p style="margin:6px 0 0;color:#e5e7eb;font-size:14px;font-weight:600">${safeAddress}</p>
            </td>
          </tr>
        </table>
        ` : ''}

        ${emailDivider()}

        <!-- Steps -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr><td style="padding-bottom:14px"><p style="margin:0;color:#ffffff;font-size:15px;font-weight:800">Et maintenant ?</p></td></tr>
          <tr>
            <td>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="width:36px;vertical-align:top;padding-bottom:10px">
                    <div style="width:26px;height:26px;border-radius:50%;background-color:#22c55e20;text-align:center;line-height:26px;color:#22c55e;font-size:12px;font-weight:800">1</div>
                  </td>
                  <td style="vertical-align:middle;padding-bottom:10px;color:#d1d5db;font-size:13px">Nous verifions et preparons votre commande</td>
                </tr>
                <tr>
                  <td style="width:36px;vertical-align:top;padding-bottom:10px">
                    <div style="width:26px;height:26px;border-radius:50%;background-color:#22c55e20;text-align:center;line-height:26px;color:#22c55e;font-size:12px;font-weight:800">2</div>
                  </td>
                  <td style="vertical-align:middle;padding-bottom:10px;color:#d1d5db;font-size:13px">Vous recevez une notification de livraison</td>
                </tr>
                <tr>
                  <td style="width:36px;vertical-align:top">
                    <div style="width:26px;height:26px;border-radius:50%;background-color:#22c55e20;text-align:center;line-height:26px;color:#22c55e;font-size:12px;font-weight:800">3</div>
                  </td>
                  <td style="vertical-align:middle;color:#d1d5db;font-size:13px">Livraison rapide a votre porte !</td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        ${emailButton('Suivre ma commande', 'https://kapitalstores.com/orders/track')}
      `),
    })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Order confirmation email error:', error)
    return NextResponse.json({ error: "Erreur lors de l'envoi." }, { status: 500 })
  }
}
