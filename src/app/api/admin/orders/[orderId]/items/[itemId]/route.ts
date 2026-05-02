import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured')
  }

  return createClient(supabaseUrl, serviceRoleKey)
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ orderId: string; itemId: string }> }
) {
  try {
    const { orderId, itemId } = await context.params
    if (!orderId || !itemId) {
      return NextResponse.json({ error: 'Missing order or item id' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

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

    const { data: remainingItems, error: itemsError } = await supabase
      .from('order_items')
      .select('quantity, price')
      .eq('order_id', orderId)

    if (itemsError) {
      return NextResponse.json({ error: itemsError.message }, { status: 500 })
    }

    const subtotal = (remainingItems || []).reduce(
      (sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 0),
      0
    )

    const { data: orderRow, error: orderError } = await supabase
      .from('orders')
      .select('total, shipping_address')
      .eq('id', orderId)
      .single()

    if (orderError || !orderRow) {
      return NextResponse.json({ error: orderError?.message || 'Order not found' }, { status: 500 })
    }

    const shippingAddress = (orderRow.shipping_address || {}) as {
      _meta?: { admin_discount_amount?: number }
    }
    const discount = Math.max(0, Number(shippingAddress?._meta?.admin_discount_amount) || 0)
    const previousTotal = Number(orderRow.total) || 0
    const baseAdjustment = previousTotal - subtotal + discount
    const nextDiscount = Math.max(0, Math.min(discount, Math.max(0, subtotal + baseAdjustment)))
    const nextTotal = Math.max(0, subtotal + baseAdjustment - nextDiscount)

    const { error: updateError } = await supabase
      .from('orders')
      .update({ total: nextTotal })
      .eq('id', orderId)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      subtotal,
      total: nextTotal,
      discount: nextDiscount,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
