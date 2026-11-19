export interface InvoiceOrderItem {
  name: string
  quantity: number
  price: number
}

export interface InvoiceOrder {
  id: string
  date: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  address?: string
  city?: string
  country?: string
  items: InvoiceOrderItem[]
  subtotal: number
  discount?: number
  shipping: number
  total: number
  /** orders.payment_status — 'paid' | 'pending' | 'failed' | 'expired' */
  paymentStatus?: string | null
  /** orders.payment_method — 'wave' | 'orange_money' | ... */
  paymentMethod?: string | null
  /** ISO date of the payment, when known */
  paidAt?: string | null
  /** orders.status — only 'cancelled' changes the document */
  orderStatus?: string | null
  /** Payment link for this order (e.g. a Wave checkout URL); overrides the store-wide link */
  paymentLink?: string | null
  /** ISO date after which the order's payment link no longer works (Wave sessions last 30 minutes) */
  paymentLinkExpiresAt?: string | null
}

/** Seller details printed on the invoice. Every field falls back to a default. */
export interface InvoiceStore {
  name?: string | null
  url?: string | null
  email?: string | null
  phone?: string | null
  address?: string | null
  ninea?: string | null
  rccm?: string | null
  /** Keys of the accepted payment methods ('wave', 'orange_money', ...), shown on unpaid invoices */
  paymentMethods?: string[] | null
  /** Free text shown on unpaid invoices (e.g. the Wave number to pay to) */
  paymentInstructions?: string | null
  /** Store-wide payment link shown on unpaid invoices */
  paymentLink?: string | null
}

const DEFAULT_STORE = {
  name: 'Kapital Stores',
  url: 'kapitalstores.com',
  email: 'khalidou.sowba@gmail.com',
  address: 'Dakar, Sénégal',
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  wave: 'Wave',
  orange_money: 'Orange Money',
  paypal: 'PayPal',
  credit_card: 'Carte bancaire',
  bank_transfer: 'Virement bancaire',
  cash: 'Espèces',
  cash_on_delivery: 'Paiement à la livraison',
}

const formatXOF = (amount: number): string =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

const clean = (value?: string | null): string => (value ?? '').trim()

/** Only http(s) links are ever written into the document. */
const safeHttpUrl = (value?: string | null): string => {
  const url = clean(value)
  return /^https?:\/\/\S+$/i.test(url) ? url : ''
}

const displayUrl = (url: string): string =>
  url.replace(/^https?:\/\//i, '').replace(/\/+$/, '')

type InvoiceState = 'paid' | 'due' | 'cancelled'

/**
 * An order is only invoiced as paid when payment_status says so.
 * Anything else (pending, failed, expired, or no status at all) is still to be paid:
 * the delivery status is deliberately not used as a proxy for payment.
 */
function invoiceState(order: InvoiceOrder): InvoiceState {
  if (clean(order.orderStatus).toLowerCase() === 'cancelled') return 'cancelled'
  return clean(order.paymentStatus).toLowerCase() === 'paid' ? 'paid' : 'due'
}

const methodLabel = (key?: string | null): string => {
  const value = clean(key)
  return value ? PAYMENT_METHOD_LABELS[value.toLowerCase()] || value : ''
}

// Logo "C" (dark K on a green badge) — same artwork as public/logo.svg, see scripts/pwa-icons/generate.py
const LOGO_MARK = `<svg class="mark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" aria-hidden="true">
  <rect width="512" height="512" rx="112" fill="#22c55e"/>
  <g transform="translate(256 256) scale(1.0779) translate(-279 -256)">
    <g fill="#0b1220">
      <path d="M124 104h92v304h-92z"/>
      <path d="M208 232 320 104h104L208 352z"/>
      <path d="M230 313 294 241 428 408H322z"/>
    </g>
    <path fill="#ffffff" stroke="#22c55e" stroke-width="16" stroke-linejoin="round" paint-order="stroke" d="M412 168 338 272h42l-30 86 84-116h-44l32-74z"/>
  </g>
</svg>`

const STYLES = `
  :root {
    --ink: #111827;
    --text: #374151;
    --muted: #6b7280;
    --line: #e5e7eb;
    --soft: #f9fafb;
    --green: #22c55e;
    --green-ink: #15803d;
    --amber-ink: #b45309;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html { -webkit-text-size-adjust: 100%; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    background: #eef0f3;
    color: var(--text);
    font-size: 14px;
    line-height: 1.5;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .num { font-variant-numeric: tabular-nums; white-space: nowrap; }

  /* ---------- Action bar (screen only) ---------- */
  .toolbar {
    position: sticky; top: 0; z-index: 10;
    display: flex; align-items: center; justify-content: space-between; gap: 12px;
    padding: 10px 16px;
    background: var(--ink); color: #fff;
  }
  .toolbar-title { font-size: 13px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .toolbar button {
    flex-shrink: 0;
    font: inherit; font-size: 13px; font-weight: 700;
    padding: 10px 16px; border: 0; border-radius: 8px;
    background: var(--green); color: #052e16; cursor: pointer;
  }

  /* ---------- Sheet (mobile first) ---------- */
  .sheet { background: #fff; border-top: 4px solid var(--green); padding: 24px 20px 28px; }

  .head { display: flex; flex-direction: column; gap: 20px; padding-bottom: 20px; border-bottom: 1px solid var(--line); }
  .brand { display: flex; align-items: center; gap: 12px; }
  .mark { width: 44px; height: 44px; flex-shrink: 0; }
  .wordmark { font-size: 20px; font-weight: 900; font-style: italic; letter-spacing: -0.5px; color: var(--ink); line-height: 1.1; text-transform: uppercase; }
  .wordmark span { color: var(--green-ink); }
  .brand-sub { font-size: 12px; color: var(--muted); margin-top: 2px; }

  .doc-title { font-size: 11px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: var(--green-ink); }
  .doc-num { font-size: 24px; font-weight: 800; color: var(--ink); letter-spacing: -0.5px; line-height: 1.2; }
  .doc-date { font-size: 13px; color: var(--muted); }
  .badge { display: inline-block; margin-top: 8px; padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; letter-spacing: 0.3px; }
  .badge-paid { background: #dcfce7; color: var(--green-ink); }
  .badge-due { background: #fef3c7; color: var(--amber-ink); }
  .badge-cancelled { background: #fee2e2; color: #b91c1c; }

  .parties { display: grid; grid-template-columns: 1fr; gap: 12px; margin: 20px 0 24px; }
  .party { background: var(--soft); border: 1px solid var(--line); border-radius: 10px; padding: 14px 16px; min-width: 0; }
  .label { font-size: 10px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: var(--muted); margin-bottom: 6px; }
  .party-name { font-size: 15px; font-weight: 700; color: var(--ink); }
  .party p { font-size: 13px; overflow-wrap: anywhere; }

  /* Items: stacked rows on small screens */
  .items { width: 100%; border-collapse: collapse; }
  .items thead { display: none; }
  .items tbody, .items tr, .items td { display: block; }
  .items tr { display: grid; grid-template-columns: 1fr auto; column-gap: 12px; align-items: end; padding: 12px 0; border-bottom: 1px solid var(--line); break-inside: avoid; }
  .items tr:first-child { border-top: 2px solid var(--ink); }
  .c-idx, .c-qty, .c-unit { display: none !important; }
  .c-name { color: var(--ink); font-weight: 600; overflow-wrap: anywhere; }
  .m-detail { display: block; font-size: 12px; font-weight: 400; color: var(--muted); margin-top: 2px; }
  .c-total { color: var(--ink); font-weight: 700; text-align: right; }

  .summary { display: flex; flex-direction: column-reverse; gap: 20px; margin-top: 20px; break-inside: avoid; }
  .totals-row { display: flex; justify-content: space-between; gap: 16px; padding: 7px 0; font-size: 14px; }
  .totals-row span:first-child { color: var(--muted); }
  .totals-row span:last-child { color: var(--ink); font-weight: 600; }
  .totals-row .minus { color: #b91c1c; }
  .grand { display: flex; justify-content: space-between; align-items: center; gap: 16px; margin-top: 10px; padding: 14px 16px; border-radius: 10px; background: var(--ink); color: #fff; }
  .grand-label { font-size: 12px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; }
  .grand-value { font-size: 20px; font-weight: 800; color: var(--green); }
  .pay-method { margin-top: 10px; font-size: 12px; color: var(--muted); text-align: right; }
  .pay-method strong { color: var(--ink); }

  .howto { background: #fffbeb; border: 1px solid #fde68a; border-radius: 10px; padding: 12px 14px; margin-bottom: 14px; }
  .howto .label { color: var(--amber-ink); }
  .howto p { font-size: 13px; color: var(--text); }
  .howto a { color: var(--green-ink); font-weight: 700; overflow-wrap: anywhere; }
  .howto strong { display: inline; color: var(--ink); font-size: 13px; margin: 0; }
  .note { font-size: 13px; }
  .note strong { display: block; color: var(--ink); font-size: 14px; margin-bottom: 2px; }

  .foot { margin-top: 28px; padding-top: 16px; border-top: 1px solid var(--line); font-size: 11px; color: var(--muted); text-align: center; line-height: 1.7; }
  .foot .sep { margin: 0 6px; color: #d1d5db; }

  /* ---------- Tablet / desktop / paper ---------- */
  @media print, screen and (min-width: 640px) {
    .head { flex-direction: row; justify-content: space-between; align-items: flex-start; padding-bottom: 28px; }
    .mark { width: 52px; height: 52px; }
    .wordmark { font-size: 24px; }
    .doc { text-align: right; }
    .doc-num { font-size: 28px; }
    .parties { grid-template-columns: 1fr 1fr; gap: 16px; margin: 28px 0 32px; }
    .party { padding: 18px 20px; }

    .items thead { display: table-header-group; }
    .items tbody { display: table-row-group; }
    .items tr { display: table-row; padding: 0; border: 0; }
    .items tr:first-child { border-top: 0; }
    .items th, .items td { display: table-cell; padding: 12px 14px; vertical-align: top; }
    .items th { background: var(--ink); color: #fff; font-size: 10px; font-weight: 700; letter-spacing: 1.2px; text-transform: uppercase; text-align: right; white-space: nowrap; }
    .items th:first-child { border-radius: 8px 0 0 8px; }
    .items th:last-child { border-radius: 0 8px 8px 0; }
    .items td { border-bottom: 1px solid var(--line); text-align: right; }
    .items th.c-idx, .items th.c-name, .items td.c-idx, .items td.c-name { text-align: left; }
    .c-idx, .c-qty, .c-unit { display: table-cell !important; }
    .items td.c-idx { width: 44px; color: var(--muted); }
    .items td.c-qty { width: 70px; }
    .m-detail { display: none; }

    .summary { flex-direction: row; justify-content: space-between; align-items: flex-start; gap: 40px; margin-top: 24px; }
    .note { max-width: 320px; padding-top: 6px; flex: 1; }
    .totals { width: 320px; flex-shrink: 0; }
    .foot { margin-top: 48px; }
  }

  @media screen and (min-width: 640px) {
    .toolbar { padding: 12px 24px; }
    .sheet { max-width: 820px; margin: 24px auto 40px; padding: 48px; border-radius: 12px; box-shadow: 0 10px 30px rgba(17, 24, 39, 0.08); }
  }

  @page { size: A4; margin: 14mm; }
  @media print {
    body { background: #fff; font-size: 12.5px; }
    .no-print { display: none !important; }
    .sheet { padding: 20px 0 0; }
    .items thead { display: table-header-group; }
    .items tr { break-inside: avoid; }
  }
`

export function generateInvoiceHtml(order: InvoiceOrder, store: InvoiceStore = {}): string {
  const shortId = order.id.slice(0, 8).toUpperCase()
  const formattedDate = new Intl.DateTimeFormat('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(order.date))

  // Seller
  const storeName = clean(store.name) || DEFAULT_STORE.name
  const storeUrl = displayUrl(clean(store.url) || DEFAULT_STORE.url)
  const storeEmail = clean(store.email) || DEFAULT_STORE.email
  const storePhone = clean(store.phone)
  const storeAddress = clean(store.address) || DEFAULT_STORE.address
  const ninea = clean(store.ninea)
  const rccm = clean(store.rccm)

  // "Kapital Stores" → KAPITAL + green STORES
  const nameParts = storeName.split(/\s+/)
  const lastWord = nameParts.length > 1 ? nameParts.pop()! : ''
  const wordmark = `${escapeHtml(nameParts.join(' '))}${lastWord ? `<span> ${escapeHtml(lastWord)}</span>` : ''}`

  // Customer
  const customerName = [clean(order.firstName), clean(order.lastName)].filter(Boolean).join(' ') || 'Client'
  const cityLine = [clean(order.city), clean(order.country)].filter(Boolean).join(', ')
  const customerLines = [clean(order.address), cityLine, clean(order.phone), clean(order.email)]
    .filter(Boolean)
    .map((line) => `<p>${escapeHtml(line)}</p>`)
    .join('')

  // Payment
  const state = invoiceState(order)
  const isPaid = state === 'paid'
  const paidMethod = methodLabel(order.paymentMethod)
  const paidDate = isPaid && clean(order.paidAt) && !Number.isNaN(new Date(order.paidAt!).getTime())
    ? new Intl.DateTimeFormat('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(order.paidAt!))
    : ''
  const docTitle = isPaid ? 'Facture' : state === 'cancelled' ? 'Facture annulée' : 'Facture proforma'
  const badgeLabel = isPaid ? (paidDate ? `Payée le ${paidDate}` : 'Payée') : state === 'cancelled' ? 'Annulée' : 'À payer'
  const totalLabel = isPaid ? 'Total payé' : state === 'cancelled' ? 'Total' : 'Total à payer'
  const acceptedMethods = (store.paymentMethods || []).map(methodLabel).filter(Boolean)
  const paymentInstructions = clean(store.paymentInstructions)
  const linkExpiry = clean(order.paymentLinkExpiresAt) ? new Date(order.paymentLinkExpiresAt!) : null
  const orderLinkExpired = !!linkExpiry && !Number.isNaN(linkExpiry.getTime()) && linkExpiry.getTime() <= Date.now()
  const orderPaymentLink = orderLinkExpired ? '' : safeHttpUrl(order.paymentLink)
  const paymentLink = orderPaymentLink || safeHttpUrl(store.paymentLink)
  const linkValidity = orderPaymentLink && linkExpiry && !Number.isNaN(linkExpiry.getTime())
    ? ` (valable jusqu'au ${new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }).format(linkExpiry)})`
    : ''

  const howToPay = state === 'due' ? `
        <div class="howto">
          <div class="label">Comment payer</div>
          ${acceptedMethods.length ? `<p>Moyens acceptés : <strong>${escapeHtml(acceptedMethods.join(', '))}</strong></p>` : ''}
          ${paymentInstructions ? `<p>${escapeHtml(paymentInstructions)}</p>` : ''}
          ${paymentLink ? `<p>Payer en ligne : <a href="${escapeHtml(paymentLink)}" target="_blank" rel="noopener">${escapeHtml(displayUrl(paymentLink))}</a>${escapeHtml(linkValidity)}</p>` : ''}
          <p>Référence à indiquer : <strong>${shortId}</strong></p>
        </div>` : ''

  const itemsRows = order.items
    .map(
      (item, index) => `
        <tr>
          <td class="c-idx num">${String(index + 1).padStart(2, '0')}</td>
          <td class="c-name">${escapeHtml(item.name)}<span class="m-detail num">${item.quantity} × ${formatXOF(item.price)}</span></td>
          <td class="c-qty num">${item.quantity}</td>
          <td class="c-unit num">${formatXOF(item.price)}</td>
          <td class="c-total num">${formatXOF(item.price * item.quantity)}</td>
        </tr>`
    )
    .join('')

  const legalParts = [
    escapeHtml(storeName),
    ninea ? `NINEA ${escapeHtml(ninea)}` : '',
    rccm ? `RCCM ${escapeHtml(rccm)}` : '',
    escapeHtml(storeAddress),
  ].filter(Boolean)

  const contactParts = [escapeHtml(storeUrl), escapeHtml(storeEmail), storePhone ? escapeHtml(storePhone) : ''].filter(Boolean)
  const sep = '<span class="sep">•</span>'

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${docTitle} ${shortId} — ${escapeHtml(storeName)}</title>
  <style>${STYLES}</style>
</head>
<body>
  <div class="toolbar no-print">
    <span class="toolbar-title">${docTitle} N° ${shortId}</span>
    <button type="button" onclick="window.print()">Imprimer / PDF</button>
  </div>

  <main class="sheet">
    <header class="head">
      <div class="brand">
        ${LOGO_MARK}
        <div>
          <div class="wordmark">${wordmark}</div>
          <div class="brand-sub">${escapeHtml(storeUrl)}</div>
        </div>
      </div>
      <div class="doc">
        <div class="doc-title">${docTitle}</div>
        <div class="doc-num">N° ${shortId}</div>
        <div class="doc-date">Émise le ${formattedDate}</div>
        <span class="badge badge-${state}">${badgeLabel}</span>
      </div>
    </header>

    <section class="parties">
      <div class="party">
        <div class="label">Émetteur</div>
        <p class="party-name">${escapeHtml(storeName)}</p>
        <p>${escapeHtml(storeAddress)}</p>
        ${storePhone ? `<p>${escapeHtml(storePhone)}</p>` : ''}
        <p>${escapeHtml(storeEmail)}</p>
        ${ninea ? `<p>NINEA : ${escapeHtml(ninea)}</p>` : ''}
        ${rccm ? `<p>RCCM : ${escapeHtml(rccm)}</p>` : ''}
      </div>
      <div class="party">
        <div class="label">Facturé à</div>
        <p class="party-name">${escapeHtml(customerName)}</p>
        ${customerLines}
      </div>
    </section>

    <table class="items">
      <thead>
        <tr>
          <th class="c-idx">N°</th>
          <th class="c-name">Désignation</th>
          <th class="c-qty">Qté</th>
          <th class="c-unit">Prix unitaire</th>
          <th class="c-total">Montant</th>
        </tr>
      </thead>
      <tbody>${itemsRows}
      </tbody>
    </table>

    <section class="summary">
      <div class="note">${howToPay}
        <strong>${state === 'cancelled' ? 'Commande annulée' : isPaid ? 'Merci pour votre achat !' : 'Merci pour votre commande !'}</strong>
        Une question sur ce document ? Écrivez-nous à ${escapeHtml(storeEmail)}${storePhone ? ` ou appelez le ${escapeHtml(storePhone)}` : ''}.
      </div>
      <div class="totals">
        <div class="totals-row"><span>Sous-total</span><span class="num">${formatXOF(order.subtotal)}</span></div>
        ${order.discount && order.discount > 0 ? `<div class="totals-row"><span>Remise</span><span class="num minus">− ${formatXOF(order.discount)}</span></div>` : ''}
        ${order.shipping > 0 ? `<div class="totals-row"><span>Livraison</span><span class="num">${formatXOF(order.shipping)}</span></div>` : ''}
        <div class="grand">
          <span class="grand-label">${totalLabel}</span>
          <span class="grand-value num">${formatXOF(order.total)}</span>
        </div>
        ${isPaid && paidMethod ? `<p class="pay-method">Mode de paiement : <strong>${escapeHtml(paidMethod)}</strong></p>` : ''}
      </div>
    </section>

    <footer class="foot">
      <div>${legalParts.join(sep)}</div>
      <div>${contactParts.join(sep)}</div>
    </footer>
  </main>
</body>
</html>`
}
