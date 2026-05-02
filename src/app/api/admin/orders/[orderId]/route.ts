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

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ orderId: string }> }
) {
  const auth = await requireAdmin(req)
  if (!auth.ok) return adminGuardResponse(auth)

  try {
    const { orderId } = await context.params
    if (!orderId) {
      return NextResponse.json({ error: 'Missing order id' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    const { error: itemsError } = await supabase
      .from('order_items')
      .delete()
      .eq('order_id', orderId)

    if (itemsError) {
      return NextResponse.json({ error: itemsError.message }, { status: 500 })
    }

    const { data: deleted, error: orderError } = await supabase
      .from('orders')
      .delete()
      .eq('id', orderId)
      .select('id')

    if (orderError) {
      return NextResponse.json({ error: orderError.message }, { status: 500 })
    }

    if (!deleted || deleted.length === 0) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
