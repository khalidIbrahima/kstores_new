import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin, adminGuardResponse } from '@/lib/admin-auth'

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  if (!url || !key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured')
  return createClient(url, key)
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(req)
  if (!auth.ok) return adminGuardResponse(auth)

  try {
    const { id } = await context.params
    if (!id) return NextResponse.json({ error: 'Missing product id' }, { status: 400 })

    const supabase = getSupabaseAdmin()
    const { data: src, error: fetchError } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !src) {
      return NextResponse.json({ error: fetchError?.message || 'Product not found' }, { status: 404 })
    }

    const stock = (src.stock ?? src.inventory ?? 0) as number
    const { data, error } = await supabase
      .from('products')
      .insert({
        name: `${src.name} (Clone)`,
        description: src.description,
        price: src.price,
        image_url: src.image_url,
        image_url1: src.image_url1,
        image_url2: src.image_url2,
        image_url3: src.image_url3,
        image_url4: src.image_url4,
        category_id: src.category_id,
        stock,
        inventory: stock,
        isActive: false,
        promotion_active: false,
        colors: src.colors,
        slug: `${src.slug || src.id}-clone-${Date.now()}`,
      })
      .select('*, categories(name, slug)')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, product: data })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
