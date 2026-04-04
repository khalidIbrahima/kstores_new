import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

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
    const { email } = await req.json()

    if (!email) {
      return NextResponse.json({ error: 'Email requis.' }, { status: 400 })
    }

    await resend.emails.send({
      from: 'Kapital Stores <onboarding@resend.dev>',
      to: email,
      subject: 'Bienvenue dans la famille Kapital Stores !',
      html: layout(`
        <div style="text-align:center">
          <div style="width:80px;height:80px;border-radius:50%;background:linear-gradient(135deg,#22c55e,#16a34a);margin:0 auto 20px;display:flex;align-items:center;justify-content:center">
            <span style="font-size:40px;color:#000">&#9733;</span>
          </div>
          <h2 style="margin:0;color:#ffffff;font-size:24px;font-weight:800">Bienvenue !</h2>
          <p style="margin:12px 0 0;color:#9ca3af;font-size:15px;line-height:1.6">
            Vous faites maintenant partie de la communaute Kapital Stores.
          </p>
        </div>

        <div style="margin:28px 0;border-top:1px solid #1f2937"></div>

        <div style="text-align:center">
          <p style="color:#d1d5db;font-size:14px;line-height:1.7;margin:0 0 20px">
            Preparez-vous a recevoir en avant-premiere :
          </p>

          <table style="width:100%;border-collapse:collapse">
            <tr>
              <td style="padding:12px;text-align:center;width:33%">
                <div style="width:44px;height:44px;border-radius:12px;background:#22c55e15;margin:0 auto 8px;display:flex;align-items:center;justify-content:center">
                  <span style="font-size:20px">&#128640;</span>
                </div>
                <p style="margin:0;color:#e5e7eb;font-size:13px;font-weight:600">Nouveautes</p>
                <p style="margin:4px 0 0;color:#6b7280;font-size:11px">En avant-premiere</p>
              </td>
              <td style="padding:12px;text-align:center;width:33%">
                <div style="width:44px;height:44px;border-radius:12px;background:#22c55e15;margin:0 auto 8px;display:flex;align-items:center;justify-content:center">
                  <span style="font-size:20px">&#127873;</span>
                </div>
                <p style="margin:0;color:#e5e7eb;font-size:13px;font-weight:600">Offres VIP</p>
                <p style="margin:4px 0 0;color:#6b7280;font-size:11px">Exclusives</p>
              </td>
              <td style="padding:12px;text-align:center;width:33%">
                <div style="width:44px;height:44px;border-radius:12px;background:#22c55e15;margin:0 auto 8px;display:flex;align-items:center;justify-content:center">
                  <span style="font-size:20px">&#9889;</span>
                </div>
                <p style="margin:0;color:#e5e7eb;font-size:13px;font-weight:600">Flash Sales</p>
                <p style="margin:4px 0 0;color:#6b7280;font-size:11px">Duree limitee</p>
              </td>
            </tr>
          </table>
        </div>

        <div style="margin:24px 0 0;text-align:center">
          <a href="https://kapital-stores.shop/products" style="display:inline-block;background:#22c55e;color:#000;font-weight:700;font-size:14px;padding:14px 32px;border-radius:10px;text-decoration:none">
            Decouvrir la boutique
          </a>
        </div>
      `),
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Newsletter email error:', error)
    return NextResponse.json({ error: "Erreur lors de l'inscription." }, { status: 500 })
  }
}
