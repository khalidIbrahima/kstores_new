import { sendOrderWhatsAppToAdmin, sendOrderWhatsAppToCustomer, sendStatusWhatsAppToCustomer } from '@/lib/whatsapp'

export interface OrderNotification {
  id: string
  email: string
  firstName: string
  total: number
  phone?: string
  items: {
    name: string
    quantity: number
    price: number
  }[]
}

export interface OrderStatusNotification {
  id: string
  email: string
  firstName: string
  status: string
  phone?: string
}

export async function notifyOrderCreated(order: OrderNotification): Promise<void> {
  const results = await Promise.allSettled([
    // Send email confirmation via API route
    fetch('/api/order-confirmation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: order.email,
        firstName: order.firstName,
        orderId: order.id,
        total: order.total,
        items: order.items,
      }),
    }),

    // Send WhatsApp to admin
    sendOrderWhatsAppToAdmin({
      id: order.id,
      total: order.total,
      firstName: order.firstName,
      email: order.email,
      itemCount: order.items.length,
    }),

    // Send WhatsApp to customer if phone provided
    ...(order.phone
      ? [
          sendOrderWhatsAppToCustomer(order.phone, {
            id: order.id,
            total: order.total,
            firstName: order.firstName,
          }),
        ]
      : []),
  ])

  // Log any failures but don't throw — notifications should not block the order flow
  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      const labels = ['Email confirmation', 'Admin WhatsApp', 'Customer WhatsApp']
      console.error(`${labels[index] || 'Notification'} failed:`, result.reason)
    }
  })
}

export async function notifyStatusUpdate(order: OrderStatusNotification): Promise<void> {
  const results = await Promise.allSettled([
    // Send status email via API route
    fetch('/api/order-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: order.email,
        firstName: order.firstName,
        orderId: order.id,
        status: order.status,
      }),
    }),

    // Send WhatsApp to customer if phone provided
    ...(order.phone
      ? [
          sendStatusWhatsAppToCustomer(order.phone, order.id, order.status, order.firstName),
        ]
      : []),
  ])

  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      const labels = ['Status email', 'Customer WhatsApp']
      console.error(`${labels[index] || 'Notification'} failed:`, result.reason)
    }
  })
}
