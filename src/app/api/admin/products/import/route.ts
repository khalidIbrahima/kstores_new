import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin, adminGuardResponse } from '@/lib/admin-auth'
import { scrapeAlibabaProduct, slugify } from '@/lib/scrape-alibaba'

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  if (!url || !key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured')
  return createClient(url, key)
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (!auth.ok) return adminGuardResponse(auth)

  try {
    const body = (await req.json()) as { url?: string }
    const url = body.url
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'Missing url' }, { status: 400 })
    }
    if (!/alibaba\.com/i.test(url)) {
      return NextResponse.json({ error: 'Only alibaba.com URLs are supported' }, { status: 400 })
    }

    const scraped = await scrapeAlibabaProduct(url)
    const slug = `${slugify(scraped.name)}-${Date.now().toString(36)}`

    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('products')
      .insert({
        name: scraped.name,
        description: scraped.description,
        price: scraped.price,
        stock: 50,
        inventory: 50,
        image_url: scraped.image_url,
        isActive: false,
        colors: scraped.colors.length > 0 ? scraped.colors : null,
        slug,
      })
      .select('id')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ success: true, id: data?.id, scraped })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
