import { NextResponse } from 'next/server'

const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com'
const PERSONAL_API_KEY = process.env.POSTHOG_PERSONAL_API_KEY
const PROJECT_ID = process.env.POSTHOG_PROJECT_ID

async function queryPostHog(body: Record<string, unknown>) {
  const res = await fetch(`${POSTHOG_HOST}/api/projects/${PROJECT_ID}/query/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${PERSONAL_API_KEY}`,
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`PostHog API error: ${res.status} ${text}`)
  }
  return res.json()
}

export async function GET(request: Request) {
  if (!PERSONAL_API_KEY || !PROJECT_ID) {
    return NextResponse.json({ error: 'PostHog not configured' }, { status: 500 })
  }

  const { searchParams } = new URL(request.url)
  const range = searchParams.get('range') || '30d'

  const daysMap: Record<string, number> = { '7d': 7, '14d': 14, '30d': 30, '90d': 90 }
  const days = daysMap[range] || 30
  const dateFrom = `-${days}d`

  try {
    // Query 1: Pageviews per day
    const viewsByDay = await queryPostHog({
      query: {
        kind: 'HogQLQuery',
        query: `
          SELECT
            toDate(timestamp) AS day,
            count() AS views,
            count(DISTINCT properties.$session_id) AS unique_visitors
          FROM events
          WHERE event = '$pageview'
            AND timestamp >= now() - interval ${days} day
          GROUP BY day
          ORDER BY day ASC
        `,
      },
    })

    // Query 2: Top pages
    const topPages = await queryPostHog({
      query: {
        kind: 'HogQLQuery',
        query: `
          SELECT
            properties.$pathname AS page_path,
            count() AS views,
            count(DISTINCT properties.$session_id) AS unique_visitors
          FROM events
          WHERE event = '$pageview'
            AND timestamp >= now() - interval ${days} day
          GROUP BY page_path
          ORDER BY views DESC
          LIMIT 20
        `,
      },
    })

    // Query 3: Totals for today, this week, this month
    const totals = await queryPostHog({
      query: {
        kind: 'HogQLQuery',
        query: `
          SELECT
            countIf(timestamp >= today()) AS views_today,
            uniqIf(properties.$session_id, timestamp >= today()) AS visitors_today,
            countIf(timestamp >= toMonday(today())) AS views_week,
            uniqIf(properties.$session_id, timestamp >= toMonday(today())) AS visitors_week,
            countIf(timestamp >= toStartOfMonth(today())) AS views_month,
            uniqIf(properties.$session_id, timestamp >= toStartOfMonth(today())) AS visitors_month,
            count() AS views_total,
            uniq(properties.$session_id) AS visitors_total
          FROM events
          WHERE event = '$pageview'
            AND timestamp >= now() - interval ${days} day
        `,
      },
    })

    // Query 4: Recent pageviews
    const recentViews = await queryPostHog({
      query: {
        kind: 'HogQLQuery',
        query: `
          SELECT
            properties.$pathname AS page_path,
            properties.$current_url AS url,
            properties.$referrer AS referrer,
            timestamp
          FROM events
          WHERE event = '$pageview'
            AND timestamp >= now() - interval 1 day
          ORDER BY timestamp DESC
          LIMIT 15
        `,
      },
    })

    // Parse results
    const dayRows = viewsByDay.results || []
    const pageRows = topPages.results || []
    const totalRow = totals.results?.[0] || [0, 0, 0, 0, 0, 0, 0, 0]
    const recentRows = recentViews.results || []

    return NextResponse.json({
      viewsByDay: dayRows.map((r: string[]) => ({
        date: r[0],
        views: Number(r[1]),
        unique_visitors: Number(r[2]),
      })),
      topPages: pageRows.map((r: string[]) => ({
        page_path: r[0],
        views: Number(r[1]),
        unique_visitors: Number(r[2]),
      })),
      totals: {
        views_today: Number(totalRow[0]),
        visitors_today: Number(totalRow[1]),
        views_week: Number(totalRow[2]),
        visitors_week: Number(totalRow[3]),
        views_month: Number(totalRow[4]),
        visitors_month: Number(totalRow[5]),
        views_total: Number(totalRow[6]),
        visitors_total: Number(totalRow[7]),
      },
      recentViews: recentRows.map((r: string[]) => ({
        page_path: r[0],
        url: r[1],
        referrer: r[2],
        timestamp: r[3],
      })),
      range,
      dateFrom,
    })
  } catch (error) {
    console.error('Analytics API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch analytics' },
      { status: 500 }
    )
  }
}
