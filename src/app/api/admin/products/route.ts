import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin, adminGuardResponse } from '@/lib/admin-auth'

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  if (!url || !key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured')
  return createClient(url, key)
}

interface NewProduct {
  name: string
  description?: string
  price: number
  stock?: number
  inventory?: number
  image_url?: string
  isActive?: boolean
  promotion_active?: boolean
  promotion_percentage?: number | null
  colors?: string[] | null
  slug: string
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (!auth.ok) return adminGuardResponse(auth)

  try {
    const product = (await req.json()) as NewProduct

    if (!product.name || typeof product.name !== 'string') {
      return NextResponse.json({ error: 'Missing product.name' }, { status: 400 })
    }
    if (!product.slug || typeof product.slug !== 'string') {
      return NextResponse.json({ error: 'Missing product.slug' }, { status: 400 })
    }
    if (typeof product.price !== 'number' || product.price < 0) {
      return NextResponse.json({ error: 'Invalid product.price' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('products')
      .insert({
        name: product.name,
        description: product.description ?? '',
        price: product.price,
        stock: product.stock ?? 50,
        inventory: product.inventory ?? product.stock ?? 50,
        image_url: product.image_url ?? '',
        isActive: product.isActive ?? false,
        promotion_active: product.promotion_active ?? false,
        promotion_percentage: product.promotion_percentage ?? null,
        colors: product.colors && product.colors.length > 0 ? product.colors : null,
        slug: product.slug,
      })
      .select('id')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ success: true, id: data?.id })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
