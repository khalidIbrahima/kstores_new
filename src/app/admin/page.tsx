'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { formatPrice } from '@/lib/utils'
import {
  Package,
  ShoppingCart,
  Users,
  TrendingUp,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  Truck,
  XCircle,
  Eye,
  BarChart3,
} from 'lucide-react'

interface DashboardStats {
  totalProducts: number
  totalOrders: number
  totalCustomers: number
  totalRevenue: number
  recentOrders: {
    id: string
    created_at: string
    status: string
    total: number
    shipping_address: { firstName?: string; lastName?: string; email?: string }
  }[]
  ordersByStatus: Record<string, number>
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending: { label: 'En attente', color: 'text-yellow-400 bg-yellow-400/10', icon: Clock },
  confirmed: { label: 'Confirmée', color: 'text-blue-400 bg-blue-400/10', icon: CheckCircle2 },
  shipped: { label: 'Expédiée', color: 'text-purple-400 bg-purple-400/10', icon: Truck },
  delivered: { label: 'Livrée', color: 'text-green-400 bg-green-400/10', icon: CheckCircle2 },
  cancelled: { label: 'Annulée', color: 'text-red-400 bg-red-400/10', icon: XCircle },
}

interface AnalyticsQuick {
  views_today: number
  visitors_today: number
  views_week: number
  visitors_week: number
  topPages: { page_path: string; views: number }[]
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [analytics, setAnalytics] = useState<AnalyticsQuick | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      const [products, orders, customers] = await Promise.all([
        supabase.from('products').select('id', { count: 'exact', head: true }),
        supabase.from('orders').select('*').order('created_at', { ascending: false }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
      ])

      const orderList = orders.data || []
      const totalRevenue = orderList
        .filter(o => o.status !== 'cancelled')
        .reduce((sum, o) => sum + (o.total || 0), 0)

      const ordersByStatus: Record<string, number> = {}
      orderList.forEach(o => {
        ordersByStatus[o.status] = (ordersByStatus[o.status] || 0) + 1
      })

      setStats({
        totalProducts: products.count || 0,
        totalOrders: orderList.length,
        totalCustomers: customers.count || 0,
        totalRevenue,
        recentOrders: orderList.slice(0, 5),
        ordersByStatus,
      })
      setLoading(false)
    }

    const fetchAnalytics = async () => {
      try {
        const res = await fetch('/api/analytics?range=30d')
        if (!res.ok) return
        const data = await res.json()
        setAnalytics({
          views_today: data.totals?.views_today || 0,
          visitors_today: data.totals?.visitors_today || 0,
          views_week: data.totals?.views_week || 0,
          visitors_week: data.totals?.visitors_week || 0,
          topPages: (data.topPages || []).slice(0, 5),
        })
      } catch { /* PostHog not configured yet, skip silently */ }
    }

    fetchStats()
    fetchAnalytics()
  }, [])

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-black text-white">Dashboard</h1>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-[#111827] border border-gray-800 rounded-xl p-4 animate-pulse">
              <div className="h-3 bg-gray-700 rounded w-16 mb-2" />
              <div className="h-6 bg-gray-700 rounded w-12" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!stats) return null

  const statCards = [
    { label: 'Produits', value: stats.totalProducts, icon: Package, color: 'text-blue-400', bg: 'bg-blue-400/10', href: '/admin/products' },
    { label: 'Commandes', value: stats.totalOrders, icon: ShoppingCart, color: 'text-green-400', bg: 'bg-green-400/10', href: '/admin/orders' },
    { label: 'Clients', value: stats.totalCustomers, icon: Users, color: 'text-purple-400', bg: 'bg-purple-400/10', href: '/admin/customers' },
    { label: 'Revenus', value: formatPrice(stats.totalRevenue), icon: TrendingUp, color: 'text-yellow-400', bg: 'bg-yellow-400/10', href: '/admin/orders' },
  ]

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white">Dashboard</h1>
        <p className="text-gray-500 text-xs mt-0.5">Vue d&apos;ensemble de votre boutique</p>
      </div>

      {/* Compact Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map(card => (
          <Link
            key={card.label}
            href={card.href}
            className="bg-[#111827] border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors group"
          >
            <div className="flex items-center gap-2 mb-1.5">
              <div className={`w-7 h-7 rounded-md ${card.bg} flex items-center justify-center`}>
                <card.icon className={`w-3.5 h-3.5 ${card.color}`} />
              </div>
              <span className="text-gray-400 text-xs">{card.label}</span>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-lg font-black text-white">{card.value}</p>
              <ArrowUpRight className="w-3 h-3 text-gray-600 group-hover:text-green-400 transition-colors" />
            </div>
          </Link>
        ))}
      </div>

      {/* Single 3-column grid: Orders (2 cols) + Sidebar (1 col) */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Recent Orders - spans 2 columns */}
        <div className="lg:col-span-2 bg-[#111827] border border-gray-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-white font-bold text-sm">Commandes recentes</h2>
            <Link href="/admin/orders" className="text-green-400 hover:text-green-300 text-xs">
              Voir tout
            </Link>
          </div>

          {stats.recentOrders.length === 0 ? (
            <p className="text-gray-500 text-sm py-6 text-center">Aucune commande</p>
          ) : (
            <div className="space-y-1">
              {stats.recentOrders.map(order => {
                const config = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending
                const StatusIcon = config.icon
                return (
                  <Link
                    key={order.id}
                    href={`/admin/orders/${order.id}`}
                    className="flex items-center justify-between p-2.5 rounded-lg hover:bg-gray-800/50 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`w-7 h-7 rounded-md ${config.color.split(' ')[1]} flex items-center justify-center`}>
                        <StatusIcon className={`w-3.5 h-3.5 ${config.color.split(' ')[0]}`} />
                      </div>
                      <div>
                        <p className="text-white text-sm font-medium">
                          {order.shipping_address?.firstName} {order.shipping_address?.lastName}
                        </p>
                        <p className="text-gray-500 text-xs">
                          {new Date(order.created_at).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-green-400 font-bold text-sm">{formatPrice(order.total)}</p>
                      <span className={`text-xs ${config.color.split(' ')[0]}`}>{config.label}</span>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}

          {/* Top Pages - compact list merged under orders */}
          {analytics && analytics.topPages.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-800">
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-1.5">
                  <BarChart3 className="w-3.5 h-3.5 text-green-400" />
                  <span className="text-gray-400 text-xs font-medium">Pages populaires</span>
                </div>
                <Link href="/admin/analytics" className="text-green-400 hover:text-green-300 text-xs">
                  Voir tout
                </Link>
              </div>
              <div className="space-y-1.5">
                {analytics.topPages.map((page, i) => {
                  const maxCount = analytics.topPages[0]?.views || 1
                  const widthPercent = (page.views / maxCount) * 100
                  return (
                    <div key={page.page_path} className="flex items-center gap-2">
                      <span className="text-gray-600 text-xs w-4 text-right">{i + 1}</span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-300 text-xs truncate max-w-[250px]">{page.page_path}</span>
                          <span className="text-white font-bold text-xs">{page.views}</span>
                        </div>
                        <div className="h-0.5 bg-gray-800 rounded-full mt-0.5">
                          <div className="h-0.5 bg-green-500/50 rounded-full" style={{ width: `${widthPercent}%` }} />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar: Status + Visits stacked */}
        <div className="space-y-4">
          {/* Order Status */}
          <div className="bg-[#111827] border border-gray-800 rounded-xl p-5">
            <h2 className="text-white font-bold text-sm mb-3">Par statut</h2>
            <div className="space-y-1.5">
              {Object.entries(STATUS_CONFIG).map(([key, config]) => {
                const count = stats.ordersByStatus[key] || 0
                const StatusIcon = config.icon
                return (
                  <div key={key} className="flex items-center justify-between p-2 rounded-md bg-gray-800/30">
                    <div className="flex items-center gap-2">
                      <StatusIcon className={`w-3.5 h-3.5 ${config.color.split(' ')[0]}`} />
                      <span className="text-gray-300 text-xs">{config.label}</span>
                    </div>
                    <span className="text-white font-bold text-sm">{count}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Visits */}
          {analytics && (
            <div className="bg-[#111827] border border-gray-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-white font-bold text-sm">Visites</h2>
                <Link href="/admin/analytics" className="text-green-400 hover:text-green-300 text-xs flex items-center gap-1">
                  <BarChart3 className="w-3 h-3" /> Details
                </Link>
              </div>
              <div className="space-y-2.5">
                <div className="p-3 rounded-lg bg-green-400/5 border border-green-500/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5 text-green-400" />
                      <span className="text-gray-400 text-xs">Aujourd&apos;hui</span>
                    </div>
                    <p className="text-lg font-black text-white">{analytics.views_today}</p>
                  </div>
                  <p className="text-green-400 text-xs mt-0.5 text-right">{analytics.visitors_today} visiteur{analytics.visitors_today > 1 ? 's' : ''}</p>
                </div>
                <div className="p-3 rounded-lg bg-gray-800/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5 text-blue-400" />
                      <span className="text-gray-400 text-xs">Cette semaine</span>
                    </div>
                    <p className="text-lg font-black text-white">{analytics.views_week}</p>
                  </div>
                  <p className="text-blue-400 text-xs mt-0.5 text-right">{analytics.visitors_week} visiteur{analytics.visitors_week > 1 ? 's' : ''}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
