// Inline SVG logo for emails (base64 encoded data URI)
// Emails can't reference external files, so we embed the logo directly

const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 48" fill="none">
  <svg x="0" y="0" width="48" height="48" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="112" fill="#22c55e"/>
  <g transform="translate(256 256) scale(1.0779) translate(-279 -256)">
    <g fill="#0b1220">
      <path d="M124 104h92v304h-92z"/>
      <path d="M208 232 320 104h104L208 352z"/>
      <path d="M230 313 294 241 428 408H322z"/>
    </g>
    <path fill="#ffffff" stroke="#22c55e" stroke-width="16" stroke-linejoin="round" paint-order="stroke" d="M412 168 338 272h42l-30 86 84-116h-44l32-74z"/>
  </g>
  </svg>
  <text x="58" y="27" font-family="Arial,Helvetica,sans-serif" font-size="22" font-weight="900" font-style="italic" fill="white" letter-spacing="-0.5">KAPITAL</text>
  <text x="164" y="27" font-family="Arial,Helvetica,sans-serif" font-size="22" font-weight="900" font-style="italic" fill="#22c55e" letter-spacing="-0.5">STORES</text>
  <text x="58" y="42" font-family="Arial,Helvetica,sans-serif" font-size="7.5" fill="#6b7280" letter-spacing="2.5">TECH &amp; ELECTRONICS</text>
</svg>`

export const EMAIL_LOGO_DATA_URI = `data:image/svg+xml;base64,${typeof Buffer !== 'undefined' ? Buffer.from(LOGO_SVG).toString('base64') : ''}`

export const EMAIL_LOGO_HTML = `<img src="${EMAIL_LOGO_DATA_URI}" alt="Kapital Stores" width="240" height="42" style="display:block;margin:0 auto" />`
