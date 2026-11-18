import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin, adminGuardResponse } from '@/lib/admin-auth'

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured')
  }

  return createClient(supabaseUrl, serviceRoleKey)
}

type SupabaseAdmin = ReturnType<typeof getSupabaseAdmin>

interface ShippingAddressMeta {
  _meta?: { admin_discount_amount?: number; [key: string]: unknown }
  [key: string]: unknown
}

interface OrderTotals {
  /** Everything in the total that is not items or discount (shipping fee, manual adjustments). */
  baseAdjustment: number
  discount: number
  shippingAddress: ShippingAddressMeta
}

async function readItemsSubtotal(supabase: SupabaseAdmin, orderId: string): Promise<number> {
  const { data, error } = await supabase
    .from('order_items')
    .select('quantity, price')
    .eq('order_id', orderId)

  if (error) throw new Error(error.message)

  return (data || []).reduce(
    (sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 0),
    0
  )
}

/**
 * Snapshot of the order's totals. Must be taken BEFORE the items change:
 * the base adjustment is derived from the current total and the current items,
 * so reading it afterwards would absorb the change and leave the total untouched.
 */
async function readOrderTotals(supabase: SupabaseAdmin, orderId: string): Promise<OrderTotals | null> {
  const { data: orderRow, error } = await supabase
    .from('orders')
    .select('total, shipping_address')
    .eq('id', orderId)
    .single()

  if (error || !orderRow) return null

  const shippingAddress = (orderRow.shipping_address || {}) as ShippingAddressMeta
  const discount = Math.max(0, Number(shippingAddress._meta?.admin_discount_amount) || 0)
  const subtotal = await readItemsSubtotal(supabase, orderId)
  const baseAdjustment = (Number(orderRow.total) || 0) - subtotal + discount

  return { baseAdjustment, discount, shippingAddress }
}

/** Recomputes and saves the order total from the items as they are now. */
async function writeOrderTotals(supabase: SupabaseAdmin, orderId: string, before: OrderTotals) {
  const subtotal = await readItemsSubtotal(supabase, orderId)
  const discount = Math.max(0, Math.min(before.discount, Math.max(0, subtotal + before.baseAdjustment)))
  const total = Math.max(0, subtotal + before.baseAdjustment - discount)

  const update: { total: number; shipping_address?: ShippingAddressMeta } = { total }
  if (discount !== before.discount) {
    update.shipping_address = {
      ...before.shippingAddress,
      _meta: { ...before.shippingAddress._meta, admin_discount_amount: discount },
    }
  }

  const { error } = await supabase.from('orders').update(update).eq('id', orderId)
  if (error) throw new Error(error.message)

  return { subtotal, total, discount }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ orderId: string; itemId: string }> }
) {
  const auth = await requireAdmin(req)
  if (!auth.ok) return adminGuardResponse(auth)

  try {
    const { orderId, itemId } = await context.params
    if (!orderId || !itemId) {
      return NextResponse.json({ error: 'Missing order or item id' }, { status: 400 })
    }

    const body = (await req.json().catch(() => null)) as { quantity?: unknown; price?: unknown } | null
    const changes: { quantity?: number; price?: number } = {}

    if (body?.quantity !== undefined) {
      const quantity = body.quantity
      if (typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity < 1 || quantity > 9999) {
        return NextResponse.json({ error: 'La quantite doit etre un entier entre 1 et 9999.' }, { status: 400 })
      }
      changes.quantity = quantity
    }
    if (body?.price !== undefined) {
      const price = body.price
      if (typeof price !== 'number' || !Number.isFinite(price) || price < 0) {
        return NextResponse.json({ error: 'Le prix doit etre un montant positif.' }, { status: 400 })
      }
      changes.price = price
    }
    if (changes.quantity === undefined && changes.price === undefined) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    const before = await readOrderTotals(supabase, orderId)
    if (!before) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const { data: updatedItems, error: updateError } = await supabase
      .from('order_items')
      .update(changes)
      .eq('id', itemId)
      .eq('order_id', orderId)
      .select('id, quantity, price')

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }
    if (!updatedItems || updatedItems.length === 0) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    const totals = await writeOrderTotals(supabase, orderId, before)

    return NextResponse.json({ success: true, item: updatedItems[0], ...totals })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ orderId: string; itemId: string }> }
) {
  const auth = await requireAdmin(req)
  if (!auth.ok) return adminGuardResponse(auth)

  try {
    const { orderId, itemId } = await context.params
    if (!orderId || !itemId) {
      return NextResponse.json({ error: 'Missing order or item id' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    const before = await readOrderTotals(supabase, orderId)
    if (!before) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const { data: deletedItem, error: deleteError } = await supabase
      .from('order_items')
      .delete()
      .eq('id', itemId)
      .eq('order_id', orderId)
      .select('id')

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    if (!deletedItem || deletedItem.length === 0) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    const totals = await writeOrderTotals(supabase, orderId, before)

    return NextResponse.json({ success: true, ...totals })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
