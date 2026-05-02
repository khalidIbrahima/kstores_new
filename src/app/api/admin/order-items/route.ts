import { NextResponse } from 'next/server'
import { withAdmin, bad } from '@/lib/api/admin-route'

interface OrderItemInput {
  order_id?: unknown
  product_id?: unknown
  quantity?: unknown
  price?: unknown
}

export const POST = withAdmin(async (req, { supabase }) => {
  const body = (await req.json()) as { items?: OrderItemInput[] }
  const items = body.items
  if (!Array.isArray(items) || items.length === 0) {
    return bad('items must be a non-empty array')
  }
  const sanitized = items.map((item) => {
    if (typeof item.order_id !== 'string') throw new Error('order_id must be a string')
    if (typeof item.product_id !== 'string') throw new Error('product_id must be a string')
    if (typeof item.quantity !== 'number') throw new Error('quantity must be a number')
    if (typeof item.price !== 'number') throw new Error('price must be a number')
    return {
      order_id: item.order_id,
      product_id: item.product_id,
      quantity: item.quantity,
      price: item.price,
    }
  })
  const { data, error } = await supabase.from('order_items').insert(sanitized).select()
  if (error) return bad(error.message, 500)
  return NextResponse.json({ success: true, items: data })
})
