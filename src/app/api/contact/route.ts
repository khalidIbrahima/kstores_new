import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'khalidou.sowba@gmail.com'

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
    <!-- Header -->
    <div style="text-align:center;padding:32px 0 24px">
      <h1 style="margin:0;font-size:28px;font-weight:900;font-style:italic;color:#ffffff">
        KAPITAL<span style="color:#22c55e">.</span>STORES
      </h1>
    </div>
    <!-- Card -->
    <div style="background:#111827;border:1px solid #1f2937;border-radius:16px;padding:32px;margin-bottom:24px">
      ${content}
    </div>
    <!-- Footer -->
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
    const { name, email, subject, message } = await req.json()

    if (!name || !email || !subject || !message) {
      return NextResponse.json({ error: 'Tous les champs sont requis.' }, { status: 400 })
    }

    const safeName = escapeHtml(name)
    const safeSubject = escapeHtml(subject)
    const safeMessage = escapeHtml(message)

    // Send to admin
    await resend.emails.send({
      from: 'Kapital Stores <onboarding@resend.dev>',
      to: ADMIN_EMAIL,
      subject: `[Contact] ${subject}`,
      replyTo: email,
      html: layout(`
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px">
          <div style="width:48px;height:48px;border-radius:50%;background:#22c55e20;display:flex;align-items:center;justify-content:center">
            <span style="font-size:24px">&#9993;</span>
          </div>
          <div>
            <h2 style="margin:0;color:#ffffff;font-size:20px;font-weight:700">Nouveau message</h2>
            <p style="margin:4px 0 0;color:#6b7280;font-size:13px">Via le formulaire de contact</p>
          </div>
        </div>
        <table style="width:100%;margin-bottom:20px">
          <tr>
            <td style="padding:8px 0;color:#9ca3af;font-size:13px;width:80px;vertical-align:top">De</td>
            <td style="padding:8px 0;color:#e5e7eb;font-size:14px;font-weight:600">${safeName} &lt;${escapeHtml(email)}&gt;</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#9ca3af;font-size:13px;vertical-align:top">Sujet</td>
            <td style="padding:8px 0;color:#e5e7eb;font-size:14px;font-weight:600">${safeSubject}</td>
          </tr>
        </table>
        <div style="background:#0d1117;border:1px solid #1f2937;border-radius:12px;padding:20px">
          <p style="margin:0;color:#d1d5db;font-size:14px;line-height:1.7">${safeMessage.replace(/\n/g, '<br />')}</p>
        </div>
      `),
    })

    // Send confirmation to customer
    await resend.emails.send({
      from: 'Kapital Stores <onboarding@resend.dev>',
      to: email,
      subject: 'Nous avons bien recu votre message',
      html: layout(`
        <div style="text-align:center;margin-bottom:24px">
          <div style="width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,#22c55e20,#16a34a20);margin:0 auto 16px;display:flex;align-items:center;justify-content:center">
            <span style="font-size:32px">&#10003;</span>
          </div>
          <h2 style="margin:0;color:#ffffff;font-size:22px;font-weight:700">Message bien recu !</h2>
          <p style="margin:8px 0 0;color:#9ca3af;font-size:14px">Merci de nous avoir contacte, ${safeName}</p>
        </div>
        <div style="background:#0d1117;border-left:3px solid #22c55e;border-radius:0 8px 8px 0;padding:16px 20px;margin:20px 0">
          <p style="margin:0;color:#9ca3af;font-size:12px;text-transform:uppercase;letter-spacing:1px">Votre sujet</p>
          <p style="margin:6px 0 0;color:#e5e7eb;font-size:15px;font-weight:600">${safeSubject}</p>
        </div>
        <p style="color:#d1d5db;font-size:14px;line-height:1.6;margin:0">
          Notre equipe prend connaissance de votre message et vous repondra dans les plus brefs delais.
        </p>
      `),
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Contact email error:', error)
    return NextResponse.json({ error: "Erreur lors de l'envoi du message." }, { status: 500 })
  }
}
