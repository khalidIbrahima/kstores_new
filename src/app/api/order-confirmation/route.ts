import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'khalidou.sowba@gmail.com'

interface OrderItem {
  name: string
  quantity: number
  price: number
}

function escapeHtml(str: string) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

const formatXOF = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(n)

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
    const { email, firstName, orderId, total, items } = (await req.json()) as {
      email: string
      firstName: string
      orderId: string
      total: number
      items: OrderItem[]
    }

    if (!email || !orderId) {
      return NextResponse.json({ error: 'Donnees manquantes.' }, { status: 400 })
    }

    const shortId = orderId.slice(0, 8).toUpperCase()
    const safeName = escapeHtml(firstName || 'cher client')

    const itemsHtml = items
      .map(
        (item) => `
          <tr>
            <td style="padding:14px 12px;border-bottom:1px solid #1f2937">
              <p style="margin:0;color:#e5e7eb;font-size:14px;font-weight:600">${escapeHtml(item.name)}</p>
              <p style="margin:4px 0 0;color:#6b7280;font-size:12px">Qte: ${item.quantity}</p>
            </td>
            <td style="padding:14px 12px;border-bottom:1px solid #1f2937;text-align:right">
              <span style="color:#22c55e;font-weight:700;font-size:14px">${formatXOF(item.price * item.quantity)}</span>
            </td>
          </tr>`
      )
      .join('')

    // Customer confirmation
    await resend.emails.send({
      from: 'Kapital Stores <onboarding@resend.dev>',
      to: email,
      subject: `Commande confirmee #${shortId}`,
      html: layout(`
        <!-- Success badge -->
        <div style="text-align:center;margin-bottom:28px">
          <div style="width:72px;height:72px;border-radius:50%;background:linear-gradient(135deg,#22c55e,#16a34a);margin:0 auto 16px;display:flex;align-items:center;justify-content:center">
            <span style="font-size:36px;color:#000">&#10003;</span>
          </div>
          <h2 style="margin:0;color:#ffffff;font-size:24px;font-weight:800">Commande confirmee !</h2>
          <p style="margin:8px 0 0;color:#9ca3af;font-size:14px">Merci pour votre achat, ${safeName}</p>
        </div>

        <!-- Order ID badge -->
        <div style="background:#0d1117;border:1px solid #1f2937;border-radius:12px;padding:16px;text-align:center;margin-bottom:24px">
          <p style="margin:0;color:#6b7280;font-size:11px;text-transform:uppercase;letter-spacing:1.5px">Numero de commande</p>
          <p style="margin:8px 0 0;color:#22c55e;font-size:22px;font-weight:800;font-family:monospace;letter-spacing:2px">#${shortId}</p>
        </div>

        <!-- Items -->
        <table style="width:100%;border-collapse:collapse">
          <thead>
            <tr>
              <th style="padding:10px 12px;text-align:left;color:#6b7280;font-size:11px;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid #1f2937">Produit</th>
              <th style="padding:10px 12px;text-align:right;color:#6b7280;font-size:11px;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid #1f2937">Prix</th>
            </tr>
          </thead>
          <tbody>${itemsHtml}</tbody>
        </table>

        <!-- Total -->
        <div style="background:linear-gradient(135deg,#22c55e10,#16a34a10);border:1px solid #22c55e30;border-radius:12px;padding:20px;margin-top:20px;text-align:center">
          <p style="margin:0;color:#9ca3af;font-size:12px;text-transform:uppercase;letter-spacing:1px">Total</p>
          <p style="margin:8px 0 0;color:#22c55e;font-size:28px;font-weight:900">${formatXOF(total)}</p>
        </div>

        <!-- Next steps -->
        <div style="margin-top:28px;padding-top:24px;border-top:1px solid #1f2937">
          <h3 style="margin:0 0 16px;color:#ffffff;font-size:15px;font-weight:700">Prochaines etapes</h3>
          <table style="width:100%">
            <tr>
              <td style="padding:6px 0;vertical-align:top;width:28px">
                <span style="color:#22c55e;font-size:14px">1.</span>
              </td>
              <td style="padding:6px 0;color:#d1d5db;font-size:13px">Nous verifions votre commande</td>
            </tr>
            <tr>
              <td style="padding:6px 0;vertical-align:top;width:28px">
                <span style="color:#22c55e;font-size:14px">2.</span>
              </td>
              <td style="padding:6px 0;color:#d1d5db;font-size:13px">Vous recevez une confirmation de livraison</td>
            </tr>
            <tr>
              <td style="padding:6px 0;vertical-align:top;width:28px">
                <span style="color:#22c55e;font-size:14px">3.</span>
              </td>
              <td style="padding:6px 0;color:#d1d5db;font-size:13px">Livraison a votre porte !</td>
            </tr>
          </table>
        </div>

        <div style="margin-top:24px;text-align:center">
          <a href="https://kapital-stores.shop/orders" style="display:inline-block;background:#22c55e;color:#000;font-weight:700;font-size:14px;padding:14px 32px;border-radius:10px;text-decoration:none">
            Suivre ma commande
          </a>
        </div>
      `),
    })

    // Admin notification
    await resend.emails.send({
      from: 'Kapital Stores <onboarding@resend.dev>',
      to: ADMIN_EMAIL,
      subject: `Nouvelle commande #${shortId} — ${formatXOF(total)}`,
      html: layout(`
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px">
          <div style="width:48px;height:48px;border-radius:50%;background:#22c55e;display:flex;align-items:center;justify-content:center">
            <span style="font-size:24px;color:#000">&#128176;</span>
          </div>
          <div>
            <h2 style="margin:0;color:#ffffff;font-size:20px;font-weight:700">Nouvelle commande !</h2>
            <p style="margin:4px 0 0;color:#22c55e;font-size:22px;font-weight:800">${formatXOF(total)}</p>
          </div>
        </div>

        <table style="width:100%;margin-bottom:20px">
          <tr>
            <td style="padding:10px 0;color:#9ca3af;font-size:13px;border-bottom:1px solid #1f2937;width:120px">Commande</td>
            <td style="padding:10px 0;color:#22c55e;font-size:14px;font-weight:700;font-family:monospace;border-bottom:1px solid #1f2937">#${shortId}</td>
          </tr>
          <tr>
            <td style="padding:10px 0;color:#9ca3af;font-size:13px;border-bottom:1px solid #1f2937">Client</td>
            <td style="padding:10px 0;color:#e5e7eb;font-size:14px;font-weight:600;border-bottom:1px solid #1f2937">${safeName}</td>
          </tr>
          <tr>
            <td style="padding:10px 0;color:#9ca3af;font-size:13px;border-bottom:1px solid #1f2937">Email</td>
            <td style="padding:10px 0;color:#e5e7eb;font-size:14px;border-bottom:1px solid #1f2937">${escapeHtml(email)}</td>
          </tr>
          <tr>
            <td style="padding:10px 0;color:#9ca3af;font-size:13px">Articles</td>
            <td style="padding:10px 0;color:#e5e7eb;font-size:14px;font-weight:600">${items.length} produit${items.length > 1 ? 's' : ''}</td>
          </tr>
        </table>

        <div style="text-align:center;margin-top:8px">
          <a href="https://kapital-stores.shop/admin/orders" style="display:inline-block;background:#22c55e;color:#000;font-weight:700;font-size:14px;padding:14px 32px;border-radius:10px;text-decoration:none">
            Voir dans le panneau admin
          </a>
        </div>
      `),
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Order confirmation email error:', error)
    return NextResponse.json({ error: "Erreur lors de l'envoi de la confirmation." }, { status: 500 })
  }
}
