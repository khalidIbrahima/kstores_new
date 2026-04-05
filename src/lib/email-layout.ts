// Premium email layout for Kapital Stores
// 100% table-based, no SVG images, no data URIs, no flexbox/grid
// Works in Gmail, Outlook, Yahoo, Apple Mail — light AND dark mode

// The logo uses pure HTML/CSS — no images at all
// This guarantees it renders in every email client

function logoHtml() {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center">
  <tr>
    <td style="text-align:center">
      <p style="margin:0;line-height:1.1;font-size:26px;font-weight:900;font-style:italic;letter-spacing:-0.5px;font-family:Arial,Helvetica,sans-serif">
        <span style="color:#ffffff">KAPITAL</span> <span style="color:#22c55e">STORES</span>
      </p>
      <p style="margin:5px 0 0;font-size:9px;color:#6b7280;letter-spacing:3px;line-height:1;font-family:Arial,Helvetica,sans-serif">TECH &amp; ELECTRONICS</p>
    </td>
  </tr>
</table>`
}

export function emailLayout(content: string) {
  return `<!DOCTYPE html>
<html lang="fr" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>Kapital Stores</title>
<!--[if mso]>
<style>table,td{font-family:Arial,Helvetica,sans-serif!important}</style>
<![endif]-->
<style>
  /* Force dark background even in light mode clients */
  body, .email-body { background-color: #050a14 !important; }
  .email-wrapper { background-color: #050a14 !important; }
  .email-card { background-color: #111827 !important; }
  /* Dark mode overrides */
  @media (prefers-color-scheme: dark) {
    body, .email-body { background-color: #050a14 !important; }
    .email-wrapper { background-color: #050a14 !important; }
    .email-card { background-color: #111827 !important; }
  }
  /* Prevent Gmail from overriding colors */
  u + .email-body { background-color: #050a14 !important; }
  /* Mobile padding */
  @media only screen and (max-width: 620px) {
    .email-content { padding: 0 8px !important; }
    .email-card-inner { padding: 20px 16px !important; }
  }
</style>
</head>
<body class="email-body" style="margin:0;padding:0;background-color:#050a14;font-family:Arial,Helvetica,sans-serif;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%">
<!-- Background wrapper for Gmail -->
<div class="email-wrapper" style="background-color:#050a14;width:100%;padding:0;margin:0">
<!--[if mso]><table role="presentation" width="100%" style="background-color:#050a14"><tr><td align="center"><![endif]-->
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:620px;margin:0 auto" class="email-content">
  <!-- Green accent top -->
  <tr><td style="height:4px;background:linear-gradient(90deg,#16a34a,#22c55e,#16a34a);font-size:0;line-height:0">&nbsp;</td></tr>

  <!-- Logo -->
  <tr>
    <td style="padding:28px 20px 20px;text-align:center;background-color:#050a14">
      ${logoHtml()}
    </td>
  </tr>

  <!-- Content card -->
  <tr>
    <td style="padding:0 16px 16px;background-color:#050a14" class="email-content">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" class="email-card" style="background-color:#111827;border:1px solid #1f2937;border-radius:20px;overflow:hidden">
        <tr>
          <td style="padding:28px 24px" class="email-card-inner">
            ${content}
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- Footer -->
  <tr>
    <td style="padding:4px 24px 28px;background-color:#050a14">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-top:1px solid #1a2332">
        <tr>
          <td style="padding:20px 0 0;text-align:center">
            <p style="margin:0 0 6px;color:#4b5563;font-size:12px;font-family:Arial,Helvetica,sans-serif">Kapital Stores &mdash;   Dakar, Senegal</p>
            <p style="margin:0 0 10px;font-size:12px;font-family:Arial,Helvetica,sans-serif">
              <a href="https://kapitalstores.com" style="color:#22c55e;text-decoration:none;font-weight:700">kapitalstores.com</a>
            </p>
            <p style="margin:0;font-size:10px;font-family:Arial,Helvetica,sans-serif">
              <a href="https://kapitalstores.com" style="color:#4b5563;text-decoration:none">Boutique</a>
              <span style="color:#374151">&nbsp;&middot;&nbsp;</span>
              <a href="https://kapitalstores.com/contact" style="color:#4b5563;text-decoration:none">Contact</a>
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- Green accent bottom -->
  <tr><td style="height:3px;background:linear-gradient(90deg,#22c55e,#16a34a,#22c55e);font-size:0;line-height:0">&nbsp;</td></tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
</div>
</body>
</html>`
}

// ─── Reusable email components ───

export function emailButton(text: string, href: string, color = '#22c55e') {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:24px auto 0">
  <tr>
    <td style="background-color:${color};border-radius:12px">
      <a href="${href}" style="display:inline-block;padding:14px 36px;color:#000000;font-size:14px;font-weight:800;text-decoration:none;font-family:Arial,Helvetica,sans-serif;letter-spacing:0.3px">${text}</a>
    </td>
  </tr>
</table>`
}

export function emailDivider() {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:20px 0"><div style="height:1px;background-color:#1f2937;font-size:0;line-height:0">&nbsp;</div></td></tr></table>`
}

export function emailBadge(text: string, color: string, bgColor: string) {
  return `<span style="display:inline-block;background-color:${bgColor};color:${color};font-size:11px;font-weight:700;padding:5px 14px;border-radius:20px;letter-spacing:0.5px;font-family:Arial,Helvetica,sans-serif">${text}</span>`
}

export function emailHeading(text: string, subtitle?: string) {
  return `<h2 style="margin:0;color:#ffffff;font-size:22px;font-weight:800;line-height:1.3;font-family:Arial,Helvetica,sans-serif">${text}</h2>${subtitle ? `<p style="margin:6px 0 0;color:#9ca3af;font-size:14px;line-height:1.5;font-family:Arial,Helvetica,sans-serif">${subtitle}</p>` : ''}`
}

export function emailInfoRow(label: string, value: string) {
  return `<tr><td style="padding:10px 0;color:#6b7280;font-size:13px;border-bottom:1px solid #1f2937;width:130px;font-family:Arial,Helvetica,sans-serif">${label}</td><td style="padding:10px 0;color:#e5e7eb;font-size:14px;font-weight:600;border-bottom:1px solid #1f2937;font-family:Arial,Helvetica,sans-serif">${value}</td></tr>`
}
