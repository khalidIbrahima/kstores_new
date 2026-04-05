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
  items: InvoiceOrderItem[]
  subtotal: number
  discount?: number
  shipping: number
  total: number
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
}

export function generateInvoiceHtml(order: InvoiceOrder): string {
  const shortId = order.id.slice(0, 8).toUpperCase()
  const formattedDate = new Intl.DateTimeFormat('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(order.date))

  const itemsRows = order.items
    .map(
      (item) => `
      <tr>
        <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; font-size: 14px; color: #111827;">
          ${escapeHtml(item.name)}
        </td>
        <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; font-size: 14px; color: #111827; text-align: center;">
          ${item.quantity}
        </td>
        <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; font-size: 14px; color: #111827; text-align: right;">
          ${formatXOF(item.price)}
        </td>
        <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; font-size: 14px; color: #111827; text-align: right; font-weight: 600;">
          ${formatXOF(item.price * item.quantity)}
        </td>
      </tr>`
    )
    .join('')

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Facture #${shortId} — Kapital Stores</title>
  <style>
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-print { display: none !important; }
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: #ffffff;
      color: #111827;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <div style="max-width: 800px; margin: 0 auto; padding: 40px 32px;">

    <!-- Header -->
    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 48px; border-bottom: 2px solid #111827; padding-bottom: 24px;">
      <div>
        <h1 style="font-size: 28px; font-weight: 900; font-style: italic; color: #111827; margin: 0;">
          KAPITAL<span style="color: #22c55e;">.</span>STORES
        </h1>
        <p style="font-size: 12px; color: #6b7280; margin-top: 4px;">  Dakar, Senegal</p>
        <p style="font-size: 12px; color: #6b7280;">kapitalstores.com</p>
      </div>
      <div style="text-align: right;">
        <h2 style="font-size: 24px; font-weight: 800; color: #111827; margin: 0;">FACTURE</h2>
        <p style="font-size: 14px; color: #6b7280; margin-top: 4px;">#${shortId}</p>
        <p style="font-size: 14px; color: #6b7280;">${formattedDate}</p>
      </div>
    </div>

    <!-- Customer info -->
    <div style="margin-bottom: 40px; background: #f9fafb; border-radius: 8px; padding: 24px;">
      <h3 style="font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #6b7280; margin-bottom: 12px;">Informations client</h3>
      <p style="font-size: 16px; font-weight: 700; color: #111827;">${escapeHtml(order.firstName)} ${escapeHtml(order.lastName)}</p>
      <p style="font-size: 14px; color: #374151; margin-top: 4px;">${escapeHtml(order.email)}</p>
      ${order.phone ? `<p style="font-size: 14px; color: #374151; margin-top: 2px;">${escapeHtml(order.phone)}</p>` : ''}
      ${order.address ? `<p style="font-size: 14px; color: #374151; margin-top: 2px;">${escapeHtml(order.address)}</p>` : ''}
      ${order.city ? `<p style="font-size: 14px; color: #374151; margin-top: 2px;">${escapeHtml(order.city)}</p>` : ''}
    </div>

    <!-- Items table -->
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 32px;">
      <thead>
        <tr style="background: #111827;">
          <th style="padding: 12px 16px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #ffffff; font-weight: 600;">Produit</th>
          <th style="padding: 12px 16px; text-align: center; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #ffffff; font-weight: 600;">Qte</th>
          <th style="padding: 12px 16px; text-align: right; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #ffffff; font-weight: 600;">Prix unitaire</th>
          <th style="padding: 12px 16px; text-align: right; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #ffffff; font-weight: 600;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemsRows}
      </tbody>
    </table>

    <!-- Totals -->
    <div style="display: flex; justify-content: flex-end;">
      <div style="width: 300px;">
        <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
          <span style="font-size: 14px; color: #6b7280;">Sous-total</span>
          <span style="font-size: 14px; color: #111827; font-weight: 500;">${formatXOF(order.subtotal)}</span>
        </div>
        ${order.discount && order.discount > 0 ? `
        <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
          <span style="font-size: 14px; color: #6b7280;">Remise</span>
          <span style="font-size: 14px; color: #dc2626; font-weight: 500;">- ${formatXOF(order.discount)}</span>
        </div>` : ''}
        ${order.shipping > 0 ? `
        <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
          <span style="font-size: 14px; color: #6b7280;">Livraison</span>
          <span style="font-size: 14px; color: #111827; font-weight: 500;">${formatXOF(order.shipping)}</span>
        </div>` : ''}
        <div style="display: flex; justify-content: space-between; padding: 16px 0; margin-top: 8px; border-top: 2px solid #111827;">
          <span style="font-size: 18px; font-weight: 800; color: #111827;">Total</span>
          <span style="font-size: 18px; font-weight: 800; color: #22c55e;">${formatXOF(order.total)}</span>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div style="margin-top: 64px; padding-top: 24px; border-top: 1px solid #e5e7eb; text-align: center;">
      <p style="font-size: 13px; color: #6b7280;">Merci pour votre achat chez Kapital Stores !</p>
      <p style="font-size: 12px; color: #9ca3af; margin-top: 4px;">Pour toute question, contactez-nous a khalidou.sowba@gmail.com</p>
    </div>

  </div>
</body>
</html>`
}
