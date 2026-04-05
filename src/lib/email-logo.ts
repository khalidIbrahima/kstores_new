// Inline SVG logo for emails (base64 encoded data URI)
// Emails can't reference external files, so we embed the logo directly

const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 48" fill="none">
  <defs>
    <linearGradient id="eg1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#22c55e"/>
      <stop offset="100%" stop-color="#16a34a"/>
    </linearGradient>
  </defs>
  <rect x="1" y="1" width="46" height="46" rx="11" fill="#111827" stroke="#22c55e" stroke-width="1.5" opacity="0.9"/>
  <rect x="12" y="10" width="5" height="28" rx="1" fill="url(#eg1)"/>
  <path d="M17 23 L17 15 L35 10 L35 14 Z" fill="url(#eg1)"/>
  <path d="M17 26 L17 34 L35 39 L35 35 Z" fill="url(#eg1)"/>
  <path d="M27 13 L22 24 L27 23 L24 36 L32 22 L26 23 Z" fill="white" opacity="0.9"/>
  <circle cx="38" cy="34" r="3" fill="#22c55e"/>
  <circle cx="38" cy="34" r="1.2" fill="white" opacity="0.8"/>
  <text x="58" y="27" font-family="Arial,Helvetica,sans-serif" font-size="22" font-weight="900" font-style="italic" fill="white" letter-spacing="-0.5">KAPITAL</text>
  <text x="164" y="27" font-family="Arial,Helvetica,sans-serif" font-size="22" font-weight="900" font-style="italic" fill="#22c55e" letter-spacing="-0.5">STORES</text>
  <text x="58" y="42" font-family="Arial,Helvetica,sans-serif" font-size="7.5" fill="#6b7280" letter-spacing="2.5">TECH &amp; ELECTRONICS</text>
</svg>`

export const EMAIL_LOGO_DATA_URI = `data:image/svg+xml;base64,${typeof Buffer !== 'undefined' ? Buffer.from(LOGO_SVG).toString('base64') : ''}`

export const EMAIL_LOGO_HTML = `<img src="${EMAIL_LOGO_DATA_URI}" alt="Kapital Stores" width="240" height="42" style="display:block;margin:0 auto" />`
