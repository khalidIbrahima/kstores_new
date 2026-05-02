import { NextResponse } from 'next/server'
import { withAdmin, pickFields, bad } from '@/lib/api/admin-route'

const ORDER_FIELDS = ['status', 'total', 'user_id', 'shipping_address'] as const

export const POST = withAdmin(async (req, { supabase }) => {
  const body = (await req.json()) as Record<string, unknown>
  const payload = pickFields(body, ORDER_FIELDS)
  if (typeof payload.total !== 'number') return bad('Missing total')
  const { data, error } = await supabase.from('orders').insert(payload).select().single()
  if (error) return bad(error.message, 500)
  return NextResponse.json({ success: true, order: data })
})
