const TWILIO_SID = process.env.NEXT_PUBLIC_TWILIO_ACCOUNT_SID || ''
const TWILIO_TOKEN = process.env.NEXT_PUBLIC_TWILIO_AUTH_TOKEN || ''
const TWILIO_WHATSAPP_FROM = process.env.NEXT_PUBLIC_TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886'
const ADMIN_WHATSAPP = process.env.NEXT_PUBLIC_ADMIN_WHATSAPP_NUMBER || '+221761800649'

const formatXOF = (amount: number): string =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)

export async function sendWhatsAppMessage(to: string, message: string): Promise<{ success: boolean; error?: string }> {
  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`

    const toNumber = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`

    const body = new URLSearchParams({
      From: TWILIO_WHATSAPP_FROM,
      To: toNumber,
      Body: message,
    })

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + btoa(`${TWILIO_SID}:${TWILIO_TOKEN}`),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Twilio WhatsApp error:', errorData)
      return { success: false, error: errorData.message || 'Failed to send WhatsApp message' }
    }

    return { success: true }
  } catch (error) {
    console.error('WhatsApp send error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export async function sendOrderWhatsAppToAdmin(order: {
  id: string
  total: number
  firstName: string
  email: string
  itemCount: number
}): Promise<{ success: boolean; error?: string }> {
  const shortId = order.id.slice(0, 8).toUpperCase()

  const message = [
    `🛍️ *Nouvelle commande !*`,
    ``,
    `📦 Commande: #${shortId}`,
    `👤 Client: ${order.firstName}`,
    `📧 Email: ${order.email}`,
    `🛒 Articles: ${order.itemCount} produit${order.itemCount > 1 ? 's' : ''}`,
    `💰 Total: ${formatXOF(order.total)}`,
    ``,
    `👉 https://kapitalstores.com/admin/orders`,
  ].join('\n')

  return sendWhatsAppMessage(ADMIN_WHATSAPP, message)
}

export async function sendOrderWhatsAppToCustomer(
  phone: string,
  order: { id: string; total: number; firstName: string }
): Promise<{ success: boolean; error?: string }> {
  const shortId = order.id.slice(0, 8).toUpperCase()

  const message = [
    `✅ *Commande confirmée !*`,
    ``,
    `Bonjour ${order.firstName} 👋`,
    ``,
    `Votre commande *#${shortId}* a bien été reçue.`,
    `💰 Total: ${formatXOF(order.total)}`,
    ``,
    `Nous vous tiendrons informé(e) de l'avancement de votre commande.`,
    ``,
    `📦 Suivre ma commande:`,
    `👉 https://kapitalstores.com/orders`,
    ``,
    `Merci pour votre confiance ! 🙏`,
    `— Kapital Stores`,
  ].join('\n')

  return sendWhatsAppMessage(phone, message)
}

export async function sendStatusWhatsAppToCustomer(
  phone: string,
  orderId: string,
  status: string,
  firstName: string
): Promise<{ success: boolean; error?: string }> {
  const shortId = orderId.slice(0, 8).toUpperCase()

  const statusMessages: Record<string, { emoji: string; label: string; detail: string }> = {
    processing: {
      emoji: '✅',
      label: 'Confirmée',
      detail: 'Votre commande est en cours de préparation par notre équipe.',
    },
    shipped: {
      emoji: '🚚',
      label: 'Expédiée',
      detail: 'Votre commande est en route ! Vous la recevrez très bientôt.',
    },
    delivered: {
      emoji: '🎉',
      label: 'Livrée',
      detail: 'Votre commande a été livrée avec succès. Nous espérons que vous êtes satisfait(e) !',
    },
    cancelled: {
      emoji: '❌',
      label: 'Annulée',
      detail: "Votre commande a été annulée. Si vous avez des questions, n'hésitez pas à nous contacter.",
    },
  }

  const config = statusMessages[status] || {
    emoji: 'ℹ️',
    label: status,
    detail: `Le statut de votre commande a été mis à jour: ${status}`,
  }

  const message = [
    `${config.emoji} *Commande ${config.label}*`,
    ``,
    `Bonjour ${firstName} 👋`,
    ``,
    `📦 Commande: *#${shortId}*`,
    ``,
    config.detail,
    ``,
    `👉 https://kapitalstores.com/orders`,
    ``,
    `— Kapital Stores`,
  ].join('\n')

  return sendWhatsAppMessage(phone, message)
}
