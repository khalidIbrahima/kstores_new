import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { emailLayout, emailButton, emailDivider, emailBadge } from '@/lib/email-layout'

const resend = new Resend(process.env.RESEND_API_KEY)

const STATUS: Record<string, { label: string; icon: string; msg: string; color: string; bg: string }> = {
  confirmed: {
    label: 'Confirmee', icon: '&#9989;', color: '#3b82f6', bg: '#3b82f620',
    msg: 'Votre commande a ete confirmee et est en cours de preparation.',
  },
  shipped: {
    label: 'Expediee', icon: '&#128666;', color: '#a855f7', bg: '#a855f720',
    msg: 'Votre commande est en route ! Vous la recevrez tres bientot.',
  },
  delivered: {
    label: 'Livree', icon: '&#127881;', color: '#22c55e', bg: '#22c55e20',
    msg: 'Votre commande a ete livree. Nous esperons que vous etes satisfait(e) !',
  },
  cancelled: {
    label: 'Annulee', icon: '&#10060;', color: '#ef4444', bg: '#ef444420',
    msg: "Votre commande a ete annulee. Contactez-nous pour toute question.",
  },
}

function esc(s: string) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') }

export async function POST(req: NextRequest) {
  try {
    const { email, firstName, orderId, status } = await req.json()
    if (!email || !orderId || !status) return NextResponse.json({ error: 'Donnees manquantes.' }, { status: 400 })

    const cfg = STATUS[status]
    if (!cfg) return NextResponse.json({ error: 'Statut non reconnu.' }, { status: 400 })

    const id8 = orderId.slice(0, 8).toUpperCase()
    const name = esc(firstName || 'cher client')
    const isCancelled = status === 'cancelled'

    // Progress tracker
    const steps = ['pending', 'confirmed', 'shipped', 'delivered']
    const idx = steps.indexOf(status)
    const progressHtml = isCancelled ? '' : `
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:24px 0">
        <tr>
          ${steps.map((s, i) => {
            const done = i <= idx
            const labels: Record<string, string> = { pending: 'Recue', confirmed: 'Confirmee', shipped: 'Expediee', delivered: 'Livree' }
            return `<td style="text-align:center;width:25%;padding:0 2px">
              <div style="width:32px;height:32px;margin:0 auto 6px;border-radius:50%;background-color:${done ? '#22c55e' : '#1a2332'};text-align:center;line-height:32px;font-size:14px;font-weight:800;color:${done ? '#000' : '#6b7280'}">${done ? '&#10003;' : i + 1}</div>
              <p style="margin:0;color:${done ? '#e5e7eb' : '#6b7280'};font-size:10px;font-weight:${done ? '700' : '400'}">${labels[s]}</p>
            </td>`
          }).join('')}
        </tr>
        <tr>
          <td colspan="4" style="padding:10px 12%">
            <div style="height:4px;background-color:#1a2332;border-radius:4px;overflow:hidden">
              <div style="width:${idx === 0 ? 5 : Math.round((idx / (steps.length - 1)) * 100)}%;height:100%;background:linear-gradient(90deg,#16a34a,#22c55e);border-radius:4px"></div>
            </div>
          </td>
        </tr>
      </table>`

    await resend.emails.send({
      from: 'Kapital Stores <onboarding@resend.dev>',
      to: email,
      subject: `Commande #${id8} — ${cfg.label}`,
      html: emailLayout(`
        <!-- Status hero -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td style="text-align:center;padding-bottom:20px">
              <div style="width:80px;height:80px;margin:0 auto 16px;border-radius:50%;background-color:${cfg.bg};text-align:center;line-height:80px">
                <span style="font-size:42px">${cfg.icon}</span>
              </div>
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:900">Commande ${cfg.label}</h1>
              <p style="margin:10px 0 0">${emailBadge('#' + id8, '#22c55e', '#22c55e15')}</p>
            </td>
          </tr>
        </table>

        ${progressHtml}

        <!-- Message -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td style="background-color:#0a0f1a;border-left:4px solid ${cfg.color};border-radius:0 12px 12px 0;padding:18px 20px">
              <p style="margin:0;color:#e5e7eb;font-size:14px;line-height:1.7">Bonjour ${name},</p>
              <p style="margin:10px 0 0;color:#d1d5db;font-size:14px;line-height:1.7">${cfg.msg}</p>
            </td>
          </tr>
        </table>

        ${status === 'delivered' ? `
        ${emailDivider()}
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td style="text-align:center">
              <p style="margin:0;color:#9ca3af;font-size:13px">Satisfait de votre achat ?</p>
              <p style="margin:4px 0 0;color:#6b7280;font-size:12px">Laissez un avis pour aider d'autres clients !</p>
            </td>
          </tr>
        </table>` : ''}

        ${emailButton('Voir mes commandes', 'https://kapital-stores.shop/orders')}
      `),
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Order status email error:', error)
    return NextResponse.json({ error: "Erreur lors de l'envoi." }, { status: 500 })
  }
}
