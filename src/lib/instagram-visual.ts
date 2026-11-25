/**
 * Instagram visuals for a product (post 1080×1350, story 1080×1920),
 * drawn on a canvas in the style of the brand visuals.
 */

export type VisualFormat = 'post' | 'story'

export interface VisualProduct {
  name: string
  price: number
  oldPrice?: number | null
  promoPercentage?: number | null
  imageUrl?: string | null
  categoryName?: string | null
}

const BG = '#0a0f1a'
const CARD = '#111827'
const GREEN = '#22c55e'
const WHITE = '#ffffff'
const MUTED = '#9ca3af'
const FONT = 'Archivo'

const SIZES: Record<VisualFormat, { w: number; h: number }> = {
  post: { w: 1080, h: 1350 },
  story: { w: 1080, h: 1920 },
}

let fontsReady: Promise<void> | null = null

function loadFonts(): Promise<void> {
  if (fontsReady) return fontsReady
  const faces: [string, FontFaceDescriptors][] = [
    ['/fonts/archivo-latin-900-italic.woff2', { weight: '900', style: 'italic' }],
    ['/fonts/archivo-latin-700-normal.woff2', { weight: '700', style: 'normal' }],
    ['/fonts/archivo-latin-500-normal.woff2', { weight: '500', style: 'normal' }],
  ]
  fontsReady = Promise.all(
    faces.map(async ([url, desc]) => {
      const face = new FontFace(FONT, `url(${url})`, desc)
      await face.load()
      document.fonts.add(face)
    }),
  ).then(() => undefined).catch(() => undefined) // fall back to system fonts
  return fontsReady
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise(resolve => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
}

/** Same-origin URL through the Next image optimizer, so the canvas stays exportable. */
function sameOriginImage(url: string): string {
  if (url.startsWith('/') && !url.startsWith('//')) return url
  return `/_next/image?url=${encodeURIComponent(url)}&w=1080&q=75`
}

/** fr-FR price with normal spaces ("18 500 F CFA"). */
export function priceLabel(value: number): string {
  const n = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Math.round(value))
  return `${n.replace(/\s/g, ' ')} F CFA`
}

function font(weight: number, size: number, italic = false): string {
  return `${italic ? 'italic ' : ''}${weight} ${size}px ${FONT}, system-ui, sans-serif`
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

/** Wraps text to at most maxLines, ending with an ellipsis when cut. */
function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const fit = (str: string) => {
    let t = str
    while (t.length > 1 && ctx.measureText(`${t}…`).width > maxWidth) t = t.slice(0, -1).trimEnd()
    return `${t}…`
  }
  const lines: string[] = []
  let line = ''
  for (const word of text.trim().split(/\s+/)) {
    const test = line ? `${line} ${word}` : word
    if (!line || ctx.measureText(test).width <= maxWidth) line = test
    else { lines.push(line); line = word }
  }
  if (line) lines.push(line)
  const out = lines.slice(0, maxLines).map(l => (ctx.measureText(l).width > maxWidth ? fit(l) : l))
  if (lines.length > maxLines && !out[maxLines - 1].endsWith('…')) out[maxLines - 1] = fit(out[maxLines - 1])
  return out
}

function drawContained(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const ratio = Math.min(w / img.naturalWidth, h / img.naturalHeight)
  const dw = img.naturalWidth * ratio
  const dh = img.naturalHeight * ratio
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh)
}

export async function renderProductVisual(product: VisualProduct, format: VisualFormat): Promise<Blob> {
  await loadFonts()
  const { w, h } = SIZES[format]
  const story = format === 'story'
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas non disponible')

  const [photo, logo] = await Promise.all([
    product.imageUrl ? loadImage(sameOriginImage(product.imageUrl)) : Promise.resolve(null),
    loadImage('/logo.svg'),
  ])

  // Background + rings
  ctx.fillStyle = BG
  ctx.fillRect(0, 0, w, h)
  ctx.lineWidth = 2
  for (const [r, a] of [[0.45, 0.18], [0.3, 0.1]] as const) {
    ctx.strokeStyle = `rgba(34,197,94,${a})`
    ctx.beginPath()
    ctx.arc(w * 0.95, w * 0.2, w * r, 0, Math.PI * 2)
    ctx.stroke()
  }

  const pad = 96
  const top = story ? 200 : 96
  const bottomSafe = story ? 220 : 96

  // Header: logo + wordmark
  const logoSize = 72
  if (logo) ctx.drawImage(logo, pad, top, logoSize, logoSize)
  ctx.font = font(900, 45, true)
  ctx.textBaseline = 'middle'
  ctx.fillStyle = WHITE
  ctx.fillText('KAPITAL', pad + logoSize + 24, top + logoSize / 2 + 2)
  const kw = ctx.measureText('KAPITAL').width
  ctx.fillStyle = GREEN
  ctx.fillText('STORES', pad + logoSize + 24 + kw, top + logoSize / 2 + 2)

  // Footer
  const footerY = h - bottomSafe - 20
  ctx.textBaseline = 'alphabetic'
  ctx.font = font(700, 34)
  ctx.fillStyle = WHITE
  ctx.fillText('kapitalstores.com', pad, footerY)
  ctx.font = font(500, 30)
  ctx.fillStyle = MUTED
  const city = 'Dakar · Sénégal'
  ctx.fillText(city, w - pad - ctx.measureText(city).width, footerY)

  // Text block (bottom-up): price, then name
  const hasPromo = !!(product.oldPrice && product.oldPrice > product.price)
  const textW = w - pad * 2
  const priceY = footerY - (story ? 110 : 90)
  let priceSize = 96
  ctx.font = font(900, priceSize, true)
  // With a promo, shrink a little so the struck-through old price fits beside the price
  const oldW = hasPromo ? (ctx.font = font(700, 44), ctx.measureText(priceLabel(product.oldPrice as number)).width + 32) : 0
  ctx.font = font(900, priceSize, true)
  while (priceSize > 80 && hasPromo && ctx.measureText(priceLabel(product.price)).width + oldW > textW) {
    priceSize -= 4
    ctx.font = font(900, priceSize, true)
  }
  while (priceSize > 56 && ctx.measureText(priceLabel(product.price)).width > textW) {
    priceSize -= 4
    ctx.font = font(900, priceSize, true)
  }
  ctx.fillStyle = GREEN
  ctx.fillText(priceLabel(product.price), pad, priceY)
  let oldAbove = false
  if (hasPromo) {
    const pw = ctx.measureText(priceLabel(product.price)).width
    ctx.font = font(700, 44)
    const old = priceLabel(product.oldPrice as number)
    const ow = ctx.measureText(old).width
    let ox = pad + pw + 32
    let oy = priceY - 10
    if (ox + ow > w - pad) {
      // Not enough room beside the price: own line above it
      oldAbove = true
      ox = pad
      oy = priceY - priceSize - 20
    }
    ctx.fillStyle = MUTED
    ctx.fillText(old, ox, oy)
    ctx.fillRect(ox, oy - 15, ow, 4)
  }

  const nameSize = story ? 72 : 64
  ctx.font = font(900, nameSize, true)
  ctx.fillStyle = WHITE
  const lines = wrapLines(ctx, product.name, textW, story ? 3 : 2)
  const lineH = nameSize * 1.05
  const nameBottom = priceY - priceSize - (oldAbove ? 44 + 20 + 40 : 40)
  lines.forEach((l, i) => ctx.fillText(l, pad, nameBottom - (lines.length - 1 - i) * lineH))
  const nameTop = nameBottom - (lines.length - 1) * lineH - nameSize

  // Category chip above the name
  let chipBottom = nameTop - 28
  if (product.categoryName) {
    ctx.font = font(700, 30)
    const label = product.categoryName
    const cw = ctx.measureText(label).width + 52
    const ch = 56
    const cy = chipBottom - ch
    ctx.fillStyle = 'rgba(34,197,94,0.12)'
    roundRect(ctx, pad, cy, cw, ch, ch / 2)
    ctx.fill()
    ctx.fillStyle = '#4ade80'
    ctx.textBaseline = 'middle'
    ctx.fillText(label, pad + 26, cy + ch / 2 + 1)
    ctx.textBaseline = 'alphabetic'
    chipBottom = cy - 28
  }

  // Photo card fills the space between the header and the text block
  const cardTop = top + logoSize + (story ? 64 : 48)
  const cardBottom = chipBottom - 8
  const cardH = Math.max(200, cardBottom - cardTop)
  ctx.fillStyle = CARD
  roundRect(ctx, pad, cardTop, textW, cardH, 40)
  ctx.fill()
  ctx.save()
  roundRect(ctx, pad, cardTop, textW, cardH, 40)
  ctx.clip()
  // Light backdrop so product shots on white blend in
  ctx.fillStyle = '#f3f4f6'
  ctx.fillRect(pad, cardTop, textW, cardH)
  const inset = 40
  if (photo) drawContained(ctx, photo, pad + inset, cardTop + inset, textW - inset * 2, cardH - inset * 2)
  else if (logo) {
    ctx.fillStyle = CARD
    ctx.fillRect(pad, cardTop, textW, cardH)
    const s = Math.min(cardH, textW) * 0.4
    ctx.drawImage(logo, pad + (textW - s) / 2, cardTop + (cardH - s) / 2, s, s)
  }
  ctx.restore()

  // Promo badge on the photo
  if (hasPromo && product.promoPercentage) {
    const label = `-${product.promoPercentage}%`
    ctx.font = font(900, 48, true)
    const bw = ctx.measureText(label).width + 56
    const bh = 84
    ctx.fillStyle = GREEN
    roundRect(ctx, pad + 28, cardTop + 28, bw, bh, bh / 2)
    ctx.fill()
    ctx.fillStyle = '#0b1220'
    ctx.textBaseline = 'middle'
    ctx.fillText(label, pad + 28 + 28, cardTop + 28 + bh / 2 + 2)
    ctx.textBaseline = 'alphabetic'
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error('Export impossible'))), 'image/png')
  })
}
