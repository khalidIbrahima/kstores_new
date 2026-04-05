import { NextResponse } from 'next/server'

// PostHog removed — analytics now handled by direct Supabase queries
// This route is kept as a stub for backwards compatibility

export async function GET() {
  return NextResponse.json({
    message: 'Analytics are now served directly from Supabase. See /admin/analytics.',
    viewsByDay: [],
    topPages: [],
    totals: { views_today: 0, visitors_today: 0, views_week: 0, visitors_week: 0, views_month: 0, visitors_month: 0, views_total: 0 },
    recentViews: [],
  })
}
