// Notifications Telegram vers le groupe admin — côté serveur uniquement.
// Les notifs de paiement et de stock bas sont gérées par des triggers Postgres
// (voir db/telegram-notifications.sql), pas par ce module.

const SITE_URL = process.env.NEXT_PUBLIC_PRODUCTION_URL || 'https://kapitalstores.com'

export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

const fmtXOF = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(Number(n) || 0)

interface TelegramButton {
  text: string
  url: string
}

/** Envoie un message dans le canal Telegram "info". No-op si non configuré. Ne throw jamais. */
export async function sendTelegramInfo(message: string, buttons?: TelegramButton[]): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID_INFO
  if (!token || !chatId) return
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message.slice(0, 4096), // limite Telegram
        parse_mode: 'HTML',
        ...(buttons?.length ? { reply_markup: { inline_keyboard: [buttons] } } : {}),
      }),
    })
  } catch (err) {
    console.error('[Telegram] sendTelegramInfo error:', err)
  }
}

/**
 * Normalise un numéro pour wa.me : chiffres uniquement, `00` de tête retiré,
 * préfixe 221 si numéro local sénégalais (9 chiffres commençant par 7).
 * Retourne null si le numéro est inexploitable.
 */
export function normalizeWaPhone(phone?: string | null): string | null {
  if (!phone) return null
  let digits = phone.replace(/\D/g, '')
  if (digits.startsWith('00')) digits = digits.slice(2)
  if (digits.length === 9 && digits.startsWith('7')) digits = `221${digits}`
  return digits.length >= 9 ? digits : null
}

const orderRef = (orderId: string) => orderId.slice(0, 8).toUpperCase()

/** 🛒 Nouvelle commande — boutons : WhatsApp client (si numéro exploitable) + page admin. */
export function notifyTelegramNewOrder(o: {
  orderId: string
  total: number
  itemCount: number
  customerName?: string
  phone?: string | null
}): Promise<void> {
  const ref = orderRef(o.orderId)
  const buttons: TelegramButton[] = []
  const wa = normalizeWaPhone(o.phone)
  if (wa) {
    const waText =
      `Bonjour${o.customerName ? ` ${o.customerName}` : ''},\n\n` +
      `Nous vous remercions pour votre commande #${ref} sur Kapital Stores. ` +
      `Elle a bien été enregistrée et nous vous contactons très prochainement pour la confirmer.\n\n` +
      `Merci de votre confiance,\nL'équipe Kapital Stores`
    buttons.push({ text: '💬 WhatsApp client', url: `https://wa.me/${wa}?text=${encodeURIComponent(waText)}` })
  }
  buttons.push({ text: '🧾 Voir la commande', url: `${SITE_URL}/admin/orders/${o.orderId}` })
  return sendTelegramInfo(
    `🛒 Nouvelle commande #${ref} : ${fmtXOF(o.total)} — ${o.itemCount} article${o.itemCount > 1 ? 's' : ''}`,
    buttons
  )
}

/** 🔴 Erreur critique dans un flux commande/paiement. Message tronqué et échappé, sans payload brut. */
export function notifyTelegramCriticalError(context: string, err: unknown): Promise<void> {
  const msg = err instanceof Error ? err.message : String(err)
  return sendTelegramInfo(`🔴 Erreur critique (${escapeHtml(context)}) : ${escapeHtml(msg.slice(0, 200))}`)
}
