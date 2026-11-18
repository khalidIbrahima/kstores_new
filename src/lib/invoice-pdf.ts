// Browser-only: turns the invoice HTML (see generateInvoiceHtml) into a PDF file.
// The heavy libraries are loaded on demand, so they stay out of the page bundle.

const PX_PER_MM = 96 / 25.4
const PAGE_WIDTH_MM = 210
const PAGE_HEIGHT_MM = 297
const MARGIN_MM = 12
const CONTENT_WIDTH_PX = Math.round((PAGE_WIDTH_MM - 2 * MARGIN_MM) * PX_PER_MM)
const CONTENT_HEIGHT_PX = Math.floor((PAGE_HEIGHT_MM - 2 * MARGIN_MM) * PX_PER_MM)
/** Never end a page with less than this much content on it. */
const MIN_PAGE_FILL_PX = 200

// The PDF supplies its own page margins, so the on-screen chrome is removed.
const PDF_OVERRIDES = `
  .toolbar { display: none !important; }
  html, body { background: #ffffff !important; }
  .sheet { margin: 0 !important; max-width: none !important; padding: 20px 0 0 !important; border-radius: 0 !important; box-shadow: none !important; }
  .foot { margin-top: 32px !important; }
`

function loadInvoiceFrame(html: string): Promise<HTMLIFrameElement> {
  return new Promise((resolve, reject) => {
    const iframe = document.createElement('iframe')
    iframe.setAttribute('aria-hidden', 'true')
    iframe.tabIndex = -1
    iframe.style.cssText = `position:fixed;left:-10000px;top:0;width:${CONTENT_WIDTH_PX}px;height:${CONTENT_HEIGHT_PX}px;border:0;opacity:0;pointer-events:none;`
    iframe.onload = () => resolve(iframe)
    iframe.onerror = () => reject(new Error('Invoice frame failed to load'))
    iframe.srcdoc = html
    document.body.appendChild(iframe)
  })
}

/** Page boundaries (in CSS px) that never cut through an item row, the totals or the footer. */
function computePageBreaks(doc: Document, totalHeight: number): number[] {
  const candidates = Array.from(doc.querySelectorAll('.items tbody tr, .summary, .foot'))
    .map((el) => Math.floor(el.getBoundingClientRect().top))
    .sort((a, b) => a - b)

  const breaks: number[] = []
  let start = 0
  while (totalHeight - start > CONTENT_HEIGHT_PX) {
    const limit = start + CONTENT_HEIGHT_PX
    const safe = candidates.filter((y) => y > start + MIN_PAGE_FILL_PX && y <= limit)
    const next = safe.length > 0 ? safe[safe.length - 1] : limit
    breaks.push(next)
    start = next
  }
  breaks.push(totalHeight)
  return breaks
}

export async function generateInvoicePdf(html: string, fileName: string): Promise<File> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import('html2canvas-pro'),
    import('jspdf'),
  ])

  const iframe = await loadInvoiceFrame(html)
  try {
    const doc = iframe.contentDocument
    if (!doc) throw new Error('Invoice frame is not accessible')

    const style = doc.createElement('style')
    style.textContent = PDF_OVERRIDES
    doc.head.appendChild(style)
    if (doc.fonts?.ready) await doc.fonts.ready

    const totalHeight = Math.ceil(doc.documentElement.scrollHeight)
    // The pages are images, so links are re-added as clickable areas on top of them.
    const links = Array.from(doc.querySelectorAll<HTMLAnchorElement>('a[href^="http"]')).map((a) => ({
      url: a.href,
      rect: a.getBoundingClientRect(),
    }))
    const breaks = computePageBreaks(doc, totalHeight)

    const canvas = await html2canvas(doc.body, {
      scale: 2,
      backgroundColor: '#ffffff',
      width: CONTENT_WIDTH_PX,
      height: totalHeight,
      windowWidth: CONTENT_WIDTH_PX,
      windowHeight: totalHeight,
      logging: false,
    })
    const ratio = canvas.width / CONTENT_WIDTH_PX

    const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
    let start = 0
    breaks.forEach((end, index) => {
      const sliceHeight = Math.max(1, Math.round((end - start) * ratio))
      const page = document.createElement('canvas')
      page.width = canvas.width
      page.height = sliceHeight
      const ctx = page.getContext('2d')
      if (!ctx) throw new Error('Canvas is not available')
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, page.width, page.height)
      ctx.drawImage(canvas, 0, Math.round(start * ratio), canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight)

      if (index > 0) pdf.addPage()
      pdf.addImage(
        page.toDataURL('image/jpeg', 0.92),
        'JPEG',
        MARGIN_MM,
        MARGIN_MM,
        PAGE_WIDTH_MM - 2 * MARGIN_MM,
        (end - start) / PX_PER_MM
      )
      for (const { url, rect } of links) {
        if (rect.top >= start && rect.top < end) {
          pdf.link(
            MARGIN_MM + rect.left / PX_PER_MM,
            MARGIN_MM + (rect.top - start) / PX_PER_MM,
            rect.width / PX_PER_MM,
            rect.height / PX_PER_MM,
            { url }
          )
        }
      }
      start = end
    })

    return new File([pdf.output('blob')], fileName, { type: 'application/pdf' })
  } finally {
    iframe.remove()
  }
}

export function downloadFile(file: File): void {
  const url = URL.createObjectURL(file)
  const link = document.createElement('a')
  link.href = url
  link.download = file.name
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
