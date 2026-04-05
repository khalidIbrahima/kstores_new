'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { BarChart3, Eye, Users, TrendingUp, Loader2, Package, ShoppingCart, Calendar } from 'lucide-react'
import { getVisitTotals, getDailyVisitStats, getTopPages, getMostViewedProducts } from '@/lib/analytics'
import { formatPrice } from '@/lib/utils'

type Period = '7d' | '30d' | '90d'

interface Totals {
  views_today: number; visitors_today: number
  views_week: number; visitors_week: number
  views_month: number; visitors_month: number
  views_all: number
}

interface DailyStat { date: string; visits: number }
interface TopPage { page_path: string; views: number }
interface TopProduct { product_id: string; views: number; name: string; image_url: string; price: number }

export default function AdminAnalytics() {
  const [totals, setTotals] = useState<Totals | null>(null)
  const [dailyStats, setDailyStats] = useState<DailyStat[]>([])
  const [topPages, setTopPages] = useState<TopPage[]>([])
  const [topProducts, setTopProducts] = useState<TopProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<Period>('30d')
  const [tablesExist, setTablesExist] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const days = period === '7d' ? 7 : period === '30d' ? 30 : 90
        const [t, d, p, pr] = await Promise.all([
          getVisitTotals(),
          getDailyVisitStats(days),
          getTopPages(15),
          getMostViewedProducts(8),
        ])
        setTotals(t)
        setDailyStats(d)
        setTopPages(p)
        setTopProducts(pr)
      } catch {
        setTablesExist(false)
      }
      setLoading(false)
    }
    load()
  }, [period])

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-black text-white">Statistiques</h1>
        <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-green-400 animate-spin" /></div>
      </div>
    )
  }

  if (!tablesExist) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-black text-white">Statistiques</h1>
        <div className="bg-[#111827] border border-gray-800 rounded-xl p-12 text-center">
          <BarChart3 className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h2 className="text-white font-bold text-lg mb-2">Tables non configurees</h2>
          <p className="text-gray-500 text-sm max-w-md mx-auto">
            Creez les tables <code className="text-green-400 bg-green-400/10 px-1.5 py-0.5 rounded">page_visits</code> et
            <code className="text-green-400 bg-green-400/10 px-1.5 py-0.5 rounded ml-1">product_views</code> dans Supabase pour activer le suivi.
          </p>
        </div>
      </div>
    )
  }

  const maxDaily = Math.max(...dailyStats.map(d => d.visits), 1)

  return (
    <div className="space-y-4">
      {/* Header + period filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-white">Statistiques</h1>
          <p className="text-gray-500 text-xs mt-0.5">Suivi du trafic et des vues</p>
        </div>
        <div className="flex items-center gap-1 bg-[#0d1117] border border-gray-800 rounded-lg p-1">
          <Calendar className="w-3.5 h-3.5 text-gray-500 ml-2 mr-1" />
          {(['7d', '30d', '90d'] as Period[]).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${period === p ? 'bg-[#111827] text-green-400' : 'text-gray-500 hover:text-gray-300'}`}>
              {p === '7d' ? '7 jours' : p === '30d' ? '30 jours' : '90 jours'}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      {totals && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Aujourd'hui", views: totals.views_today, visitors: totals.visitors_today, icon: Eye, accent: '#22c55e', bg: 'bg-green-400/10' },
            { label: 'Cette semaine', views: totals.views_week, visitors: totals.visitors_week, icon: TrendingUp, accent: '#60a5fa', bg: 'bg-blue-400/10' },
            { label: 'Ce mois', views: totals.views_month, visitors: totals.visitors_month, icon: BarChart3, accent: '#a78bfa', bg: 'bg-purple-400/10' },
            { label: 'Total', views: totals.views_all, visitors: 0, icon: Users, accent: '#facc15', bg: 'bg-yellow-400/10' },
          ].map(card => (
            <div key={card.label} className="bg-[#111827] border border-[#1f2937] rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-7 h-7 rounded-md ${card.bg} flex items-center justify-center`}>
                  <card.icon className="w-3.5 h-3.5" style={{ color: card.accent }} />
                </div>
                <span className="text-gray-400 text-xs">{card.label}</span>
              </div>
              <p className="text-lg font-black text-white">{card.views} <span className="text-gray-500 text-xs font-normal">vues</span></p>
              {card.visitors > 0 && (
                <p className="text-xs mt-0.5" style={{ color: card.accent }}>{card.visitors} visiteur{card.visitors > 1 ? 's' : ''} unique{card.visitors > 1 ? 's' : ''}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Traffic Chart + Top Pages */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Daily visits chart */}
        <div className="lg:col-span-2 bg-[#111827] border border-[#1f2937] rounded-xl p-5">
          <h2 className="text-white font-bold text-sm mb-4">Visites par jour</h2>
          <div className="relative" style={{ height: 200 }}>
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="absolute left-0 right-0 border-t border-[#1a2332]" style={{ top: `${i * 33.33}%` }} />
            ))}
            <div className="absolute inset-0 flex items-end gap-[2px] px-1">
              {dailyStats.map((day, i) => {
                const pct = maxDaily > 0 ? (day.visits / maxDaily) * 100 : 0
                return (
                  <div key={i} className="flex-1 flex flex-col items-center">
                    <div className="w-full flex justify-center" style={{ height: 175 }}>
                      <div
                        className="w-full max-w-[28px] rounded-t-md transition-all hover:brightness-125 cursor-default self-end"
                        style={{ height: `${Math.max(pct, 2)}%`, background: 'linear-gradient(to top, #16a34a, #22c55e)' }}
                        title={`${day.visits} visites`}
                      />
                    </div>
                    {dailyStats.length <= 14 && (
                      <span className="text-gray-600 text-[8px] mt-1">
                        {new Date(day.date + 'T00:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }).replace('.', '')}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Top Pages */}
        <div className="bg-[#111827] border border-[#1f2937] rounded-xl p-5">
          <h2 className="text-white font-bold text-sm mb-3">Pages populaires</h2>
          {topPages.length === 0 ? (
            <p className="text-gray-500 text-sm py-6 text-center">Aucune donnee</p>
          ) : (
            <div className="space-y-2.5">
              {topPages.slice(0, 10).map((page, i) => {
                const maxV = topPages[0]?.views || 1
                const w = Math.max((page.views / maxV) * 100, 5)
                return (
                  <div key={page.page_path}>
                    <div className="flex items-center justify-between mb-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-gray-600 text-[10px] w-4 text-right font-mono">{i + 1}</span>
                        <span className="text-gray-300 text-xs truncate max-w-[150px]">{page.page_path}</span>
                      </div>
                      <span className="text-white font-bold text-xs">{page.views}</span>
                    </div>
                    <div className="ml-5 h-1.5 bg-[#1a2332] rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${w}%`, background: 'linear-gradient(to right, #16a34a, #22c55e)' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Most Viewed Products */}
      <div className="bg-[#111827] border border-[#1f2937] rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-bold text-sm flex items-center gap-2">
            <Package className="w-4 h-4 text-blue-400" /> Produits les plus vus
          </h2>
          <Link href="/admin/products" className="text-green-400 hover:text-green-300 text-xs">Voir les produits</Link>
        </div>
        {topProducts.length === 0 ? (
          <p className="text-gray-500 text-sm py-6 text-center">Aucune vue de produit enregistree</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {topProducts.map((p, i) => (
              <Link key={p.product_id} href={`/admin/products/${p.product_id}`}
                className="flex items-center gap-3 p-3 rounded-lg bg-gray-800/30 hover:bg-gray-800/50 transition-colors group">
                <div className="relative">
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-900 flex-shrink-0">
                    {p.image_url && <img src={p.image_url} alt="" className="w-full h-full object-cover" />}
                  </div>
                  <span className="absolute -top-1 -left-1 w-5 h-5 rounded-full bg-green-500 text-black text-[10px] font-black flex items-center justify-center">
                    {i + 1}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-xs font-medium truncate group-hover:text-green-400 transition-colors">{p.name}</p>
                  <p className="text-gray-500 text-[10px]">{formatPrice(p.price)}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Eye className="w-3 h-3 text-green-400" />
                    <span className="text-green-400 text-xs font-bold">{p.views}</span>
                    <span className="text-gray-600 text-[10px]">vues</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
