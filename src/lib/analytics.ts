import { supabase } from '@/lib/supabase'

// Session ID — persists per browser session
function getSessionId(): string {
  if (typeof window === 'undefined') return ''
  let sid = sessionStorage.getItem('ks-session-id')
  if (!sid) {
    sid = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
    sessionStorage.setItem('ks-session-id', sid)
  }
  return sid
}

// ─── Track page visit ───
export async function trackPageVisit(pagePath: string) {
  if (typeof window === 'undefined') return
  // Skip admin pages
  if (pagePath.startsWith('/admin')) return

  try {
    await supabase.from('page_visits').insert({
      page_path: pagePath,
      session_id: getSessionId(),
      user_agent: navigator.userAgent,
      referrer: document.referrer || null,
    })
  } catch {
    // Silently fail — table may not exist yet
  }
}

// ─── Track product view ───
export async function trackProductView(productId: string) {
  if (typeof window === 'undefined') return

  try {
    await supabase.from('product_views').insert({
      product_id: productId,
      session_id: getSessionId(),
      user_agent: navigator.userAgent,
    })
  } catch {
    // Silently fail
  }
}

// ─── Query functions ───

export async function getProductViewCount(productId: string): Promise<number> {
  const { count } = await supabase
    .from('product_views')
    .select('id', { count: 'exact', head: true })
    .eq('product_id', productId)
  return count || 0
}

export async function getMostViewedProducts(limit = 10) {
  // Get product_id counts — requires a raw query or manual grouping
  const { data } = await supabase
    .from('product_views')
    .select('product_id')

  if (!data || data.length === 0) return []

  // Group by product_id
  const counts: Record<string, number> = {}
  data.forEach(row => {
    counts[row.product_id] = (counts[row.product_id] || 0) + 1
  })

  // Sort by count desc and take top N
  const sorted = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([product_id, views]) => ({ product_id, views }))

  // Fetch product names
  if (sorted.length === 0) return []
  const ids = sorted.map(s => s.product_id)
  const { data: products } = await supabase
    .from('products')
    .select('id, name, image_url, price')
    .in('id', ids)

  const productMap: Record<string, { name: string; image_url: string; price: number }> = {}
  ;(products || []).forEach(p => { productMap[p.id] = p })

  return sorted.map(s => ({
    ...s,
    name: productMap[s.product_id]?.name || 'Produit supprime',
    image_url: productMap[s.product_id]?.image_url || '',
    price: productMap[s.product_id]?.price || 0,
  }))
}

export async function getDailyVisitStats(days = 7) {
  const since = new Date()
  since.setDate(since.getDate() - days)
  since.setHours(0, 0, 0, 0)

  const { data } = await supabase
    .from('page_visits')
    .select('created_at')
    .gte('created_at', since.toISOString())

  if (!data) return []

  // Group by date
  const map: Record<string, number> = {}
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i)
    map[d.toISOString().slice(0, 10)] = 0
  }
  data.forEach(row => {
    const key = row.created_at.slice(0, 10)
    if (key in map) map[key]++
  })

  return Object.entries(map).map(([date, visits]) => ({ date, visits }))
}

export async function getTopPages(limit = 10) {
  const { data } = await supabase
    .from('page_visits')
    .select('page_path')

  if (!data || data.length === 0) return []

  const counts: Record<string, number> = {}
  data.forEach(row => { counts[row.page_path] = (counts[row.page_path] || 0) + 1 })

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([page_path, views]) => ({ page_path, views }))
}

export async function getVisitTotals() {
  const now = new Date()
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0)
  const weekStart = new Date(now); weekStart.setDate(weekStart.getDate() - 7)
  const monthStart = new Date(now); monthStart.setDate(monthStart.getDate() - 30)

  const [todayRes, weekRes, monthRes, allRes] = await Promise.all([
    supabase.from('page_visits').select('session_id', { count: 'exact' }).gte('created_at', todayStart.toISOString()),
    supabase.from('page_visits').select('session_id', { count: 'exact' }).gte('created_at', weekStart.toISOString()),
    supabase.from('page_visits').select('session_id', { count: 'exact' }).gte('created_at', monthStart.toISOString()),
    supabase.from('page_visits').select('id', { count: 'exact', head: true }),
  ])

  // Count unique sessions for visitors
  const uniqueSessions = (data: { session_id: string }[] | null) => {
    if (!data) return 0
    return new Set(data.map(d => d.session_id)).size
  }

  return {
    views_today: todayRes.count || 0,
    visitors_today: uniqueSessions(todayRes.data as { session_id: string }[] | null),
    views_week: weekRes.count || 0,
    visitors_week: uniqueSessions(weekRes.data as { session_id: string }[] | null),
    views_month: monthRes.count || 0,
    visitors_month: uniqueSessions(monthRes.data as { session_id: string }[] | null),
    views_all: allRes.count || 0,
  }
}
