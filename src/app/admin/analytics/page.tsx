'use client'

import { useEffect, useState } from 'react'
import { BarChart3, Eye, Users, Globe, TrendingUp, Loader2 } from 'lucide-react'
import Pagination from '@/components/Pagination'

type DateRange = '7d' | '30d' | '90d'

interface AnalyticsData {
  viewsByDay: { date: string; views: number; unique_visitors: number }[]
  topPages: { page_path: string; views: number; unique_visitors: number }[]
  totals: {
    views_today: number
    visitors_today: number
    views_week: number
    visitors_week: number
    views_month: number
    visitors_month: number
    views_total: number
    visitors_total: number
  }
  recentViews: { page_path: string; url: string; referrer: string; timestamp: string }[]
}

const PAGES_PER_PAGE = 10

export default function AdminAnalytics() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [range, setRange] = useState<DateRange>('30d')
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    setLoading(true)
    setError('')
    fetch(`/api/analytics?range=${range}`)
      .then(res => {
        if (!res.ok) throw new Error('Erreur lors du chargement')
        return res.json()
      })
      .then(d => {
        setData(d)
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [range])

  const totalPagesCount = Math.ceil((data?.topPages?.length || 0) / PAGES_PER_PAGE)
  const paginatedPages = data?.topPages?.slice(
    (currentPage - 1) * PAGES_PER_PAGE,
    currentPage * PAGES_PER_PAGE
  ) || []

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-black text-white">Statistiques</h1>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-green-400 animate-spin" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-black text-white">Statistiques</h1>
        <div className="bg-[#111827] border border-gray-800 rounded-xl p-8 text-center">
          <BarChart3 className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 mb-2">Impossible de charger les statistiques</p>
          <p className="text-gray-600 text-sm">{error}</p>
          <p className="text-gray-600 text-xs mt-4">
            Assurez-vous que les variables d&apos;environnement PostHog sont configurées :<br />
            <code className="text-green-400">POSTHOG_PERSONAL_API_KEY</code> et{' '}
            <code className="text-green-400">POSTHOG_PROJECT_ID</code>
          </p>
        </div>
      </div>
    )
  }

  if (!data) return null

  const avgViewsPerDay = data.viewsByDay.length > 0
    ? Math.round(data.totals.views_total / data.viewsByDay.length)
    : 0

  const maxDayViews = Math.max(...data.viewsByDay.map(d => d.views), 1)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white">Statistiques</h1>
          <p className="text-gray-500 text-sm mt-1">Suivi des visites de votre boutique</p>
        </div>
        <div className="flex gap-1 bg-[#111827] border border-gray-800 rounded-lg p-1">
          {(['7d', '30d', '90d'] as DateRange[]).map(r => (
            <button
              key={r}
              onClick={() => { setRange(r); setCurrentPage(1) }}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                range === r
                  ? 'bg-green-500/10 text-green-400'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {r === '7d' ? '7 jours' : r === '30d' ? '30 jours' : '90 jours'}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Aujourd'hui", views: data.totals.views_today, visitors: data.totals.visitors_today, icon: Eye, color: 'text-green-400', bg: 'bg-green-400/10' },
          { label: 'Cette semaine', views: data.totals.views_week, visitors: data.totals.visitors_week, icon: TrendingUp, color: 'text-blue-400', bg: 'bg-blue-400/10' },
          { label: 'Ce mois', views: data.totals.views_month, visitors: data.totals.visitors_month, icon: Globe, color: 'text-purple-400', bg: 'bg-purple-400/10' },
          { label: 'Moy./jour', views: avgViewsPerDay, visitors: data.totals.visitors_total, icon: BarChart3, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
        ].map(card => (
          <div key={card.label} className="bg-[#111827] border border-gray-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-gray-400 text-sm">{card.label}</span>
              <div className={`w-10 h-10 rounded-lg ${card.bg} flex items-center justify-center`}>
                <card.icon className={`w-5 h-5 ${card.color}`} />
              </div>
            </div>
            <p className="text-2xl font-black text-white">{card.views.toLocaleString('fr-FR')}</p>
            <div className="flex items-center gap-2 mt-1">
              <Users className="w-3 h-3 text-gray-500" />
              <span className="text-gray-500 text-xs">
                {card.label === 'Moy./jour' ? `${card.visitors} visiteurs au total` : `${card.visitors} visiteur${card.visitors > 1 ? 's' : ''} unique${card.visitors > 1 ? 's' : ''}`}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Bar Chart */}
      <div className="bg-[#111827] border border-gray-800 rounded-xl p-6">
        <h2 className="text-white font-bold text-lg mb-6">Vues par jour</h2>
        {data.viewsByDay.length === 0 ? (
          <p className="text-gray-500 text-center py-8">Aucune donnée disponible</p>
        ) : (
          <div className="flex items-end gap-1 h-48">
            {data.viewsByDay.map(day => {
              const heightPercent = (day.views / maxDayViews) * 100
              const dateLabel = new Date(day.date + 'T00:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
              return (
                <div key={day.date} className="flex-1 flex flex-col items-center gap-1 group relative">
                  <div className="opacity-0 group-hover:opacity-100 absolute -top-10 bg-gray-900 border border-gray-700 rounded-lg px-2 py-1 text-xs text-white whitespace-nowrap z-10 pointer-events-none transition-opacity">
                    {day.views} vue{day.views > 1 ? 's' : ''} &bull; {day.unique_visitors} visiteur{day.unique_visitors > 1 ? 's' : ''}
                  </div>
                  <div
                    className="w-full bg-green-500/70 rounded-t hover:bg-green-400 transition-colors cursor-pointer"
                    style={{ height: `${Math.max(heightPercent, 2)}%` }}
                  />
                  {data.viewsByDay.length <= 31 && (
                    <span className="text-gray-600 text-[8px] -rotate-45 origin-center whitespace-nowrap mt-1">
                      {dateLabel}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Top Pages */}
        <div className="bg-[#111827] border border-gray-800 rounded-xl p-6">
          <h2 className="text-white font-bold text-lg mb-4">Pages les plus visitées</h2>
          {paginatedPages.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Aucune donnée</p>
          ) : (
            <div className="space-y-3">
              {paginatedPages.map((page, i) => {
                const rank = (currentPage - 1) * PAGES_PER_PAGE + i + 1
                const maxCount = data.topPages[0]?.views || 1
                const widthPercent = (page.views / maxCount) * 100
                return (
                  <div key={page.page_path} className="group">
                    <div className="flex items-center gap-3">
                      <span className="text-gray-600 text-xs w-6 text-right">{rank}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-gray-300 text-sm truncate pr-4">{page.page_path}</span>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            <span className="text-white font-bold text-sm">{page.views}</span>
                            <span className="text-gray-500 text-xs flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {page.unique_visitors}
                            </span>
                          </div>
                        </div>
                        <div className="h-1 bg-gray-800 rounded-full">
                          <div
                            className="h-1 bg-green-500/50 rounded-full transition-all"
                            style={{ width: `${widthPercent}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          <div className="mt-4">
            <Pagination currentPage={currentPage} totalPages={totalPagesCount} onPageChange={setCurrentPage} />
          </div>
        </div>

        {/* Recent Visits */}
        <div className="bg-[#111827] border border-gray-800 rounded-xl p-6">
          <h2 className="text-white font-bold text-lg mb-4">Visites récentes</h2>
          {data.recentViews.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Aucune visite récente</p>
          ) : (
            <div className="space-y-2">
              {data.recentViews.map((view, i) => (
                <div key={`${view.timestamp}-${i}`} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-gray-800/30 transition-colors">
                  <div className="min-w-0 flex-1">
                    <p className="text-white text-sm truncate">{view.page_path}</p>
                    {view.referrer && (
                      <p className="text-gray-600 text-xs truncate">via {view.referrer}</p>
                    )}
                  </div>
                  <span className="text-gray-500 text-xs whitespace-nowrap ml-4">
                    {new Date(view.timestamp).toLocaleString('fr-FR', {
                      hour: '2-digit',
                      minute: '2-digit',
                      day: '2-digit',
                      month: '2-digit',
                    })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
