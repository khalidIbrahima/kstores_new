import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const STATUS_CONFIG: Record<string, { label: string; emoji: string; message: string; color: string }> = {
  confirmed: {
    label: 'Confirmee',
    emoji: '&#9989;',
    message: 'Votre commande a ete confirmee et est en cours de preparation par notre equipe.',
    color: '#3b82f6',
  },
  shipped: {
    label: 'Expediee',
    emoji: '&#128666;',
    message: 'Votre commande est en route ! Vous la recevrez tres bientot.',
    color: '#a855f7',
  },
  delivered: {
    label: 'Livree',
    emoji: '&#127881;',
    message: 'Votre commande a ete livree avec succes. Nous esperons que vous etes satisfait(e) !',
    color: '#22c55e',
  },
  cancelled: {
    label: 'Annulee',
    emoji: '&#10060;',
    message: 'Votre commande a ete annulee. Si vous avez des questions, n\'hesitez pas a nous contacter.',
    color: '#ef4444',
  },
}

function escapeHtml(str: string) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function layout(content: string) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#060a13;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <div style="max-width:600px;margin:0 auto;padding:24px 16px">
    <div style="text-align:center;padding:32px 0 24px">
      <h1 style="margin:0;font-size:28px;font-weight:900;font-style:italic;color:#ffffff">
        KAPITAL<span style="color:#22c55e">.</span>STORES
      </h1>
    </div>
    <div style="background:#111827;border:1px solid #1f2937;border-radius:16px;padding:32px;margin-bottom:24px">
      ${content}
    </div>
    <div style="text-align:center;padding:16px 0">
      <p style="margin:0 0 8px;color:#6b7280;font-size:12px">Kapital Stores — Fass Delorme, Dakar, Senegal</p>
      <p style="margin:0;color:#374151;font-size:11px">kapital-stores.shop</p>
    </div>
  </div>
</body>
</html>`
}

export async function POST(req: NextRequest) {
  try {
    const { email, firstName, orderId, status } = await req.json()

    if (!email || !orderId || !status) {
      return NextResponse.json({ error: 'Donnees manquantes.' }, { status: 400 })
    }

    const config = STATUS_CONFIG[status]
    if (!config) {
      return NextResponse.json({ error: 'Statut non reconnu.' }, { status: 400 })
    }

    const shortId = orderId.slice(0, 8).toUpperCase()
    const safeName = escapeHtml(firstName || 'cher client')

    // Progress bar
    const steps = ['pending', 'confirmed', 'shipped', 'delivered']
    const currentIdx = steps.indexOf(status)
    const isCancelled = status === 'cancelled'

    const progressHtml = isCancelled
      ? ''
      : `
        <div style="margin:24px 0">
          <table style="width:100%;border-collapse:collapse">
            <tr>
              ${steps
                .map((s, i) => {
                  const done = i <= currentIdx
                  const labels: Record<string, string> = { pending: 'Recue', confirmed: 'Confirmee', shipped: 'Expediee', delivered: 'Livree' }
                  return `
                    <td style="text-align:center;width:25%;padding:0 4px">
                      <div style="width:32px;height:32px;border-radius:50%;background:${done ? '#22c55e' : '#1f2937'};margin:0 auto 6px;display:flex;align-items:center;justify-content:center">
                        <span style="color:${done ? '#000' : '#6b7280'};font-size:14px;font-weight:700">${done ? '&#10003;' : i + 1}</span>
                      </div>
                      <p style="margin:0;color:${done ? '#e5e7eb' : '#6b7280'};font-size:11px;font-weight:${done ? '600' : '400'}">${labels[s]}</p>
                    </td>`
                })
                .join('')}
            </tr>
          </table>
          <!-- Progress bar -->
          <div style="margin:12px 12%;height:3px;background:#1f2937;border-radius:2px;position:relative">
            <div style="width:${currentIdx === 0 ? 0 : Math.round((currentIdx / (steps.length - 1)) * 100)}%;height:100%;background:#22c55e;border-radius:2px"></div>
          </div>
        </div>`

    await resend.emails.send({
      from: 'Kapital Stores <onboarding@resend.dev>',
      to: email,
      subject: `Commande #${shortId} — ${config.label}`,
      html: layout(`
        <!-- Status badge -->
        <div style="text-align:center;margin-bottom:24px">
          <div style="width:72px;height:72px;border-radius:50%;background:${config.color}20;margin:0 auto 16px;display:flex;align-items:center;justify-content:center">
            <span style="font-size:36px">${config.emoji}</span>
          </div>
          <h2 style="margin:0;color:#ffffff;font-size:22px;font-weight:800">Commande ${config.label}</h2>
          <p style="margin:8px 0 0;color:#9ca3af;font-size:13px">Commande <span style="color:#22c55e;font-family:monospace;font-weight:700">#${shortId}</span></p>
        </div>

        ${progressHtml}

        <!-- Message -->
        <div style="background:#0d1117;border:1px solid #1f2937;border-radius:12px;padding:20px;margin:20px 0">
          <p style="margin:0;color:#d1d5db;font-size:14px;line-height:1.7">
            Bonjour ${safeName},<br /><br />
            ${config.message}
          </p>
        </div>

        <div style="text-align:center;margin-top:24px">
          <a href="https://kapital-stores.shop/orders" style="display:inline-block;background:#22c55e;color:#000;font-weight:700;font-size:14px;padding:14px 32px;border-radius:10px;text-decoration:none">
            Voir mes commandes
          </a>
        </div>

        ${status === 'delivered' ? `
        <div style="margin-top:24px;padding-top:20px;border-top:1px solid #1f2937;text-align:center">
          <p style="color:#9ca3af;font-size:13px;margin:0">Satisfait de votre achat ? Laissez-nous un avis !</p>
        </div>` : ''}
      `),
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Order status email error:', error)
    return NextResponse.json({ error: "Erreur lors de l'envoi de la notification." }, { status: 500 })
  }
}
