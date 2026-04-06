'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { formatPrice } from '@/lib/utils'
import {
  Package, ShoppingCart, Users, TrendingUp, ArrowUpRight, ArrowDownRight,
  Clock, CheckCircle2, Truck, XCircle, Eye, BarChart3,
  AlertTriangle, Boxes, Calendar,
} from 'lucide-react'

type Period = '7d' | '30d' | '90d' | 'all'

interface Order {
  id: string
  created_at: string
  status: string
  total: number
  user_id: string | null
  shipping_address: { firstName?: string; lastName?: string; name?: string; email?: string; phone?: string }
}

interface Product {
  id: string
  name: string
  image_url: string
  stock: number | null
  inventory: number
  price: number
  isActive: boolean | null
}

const STATUS_CFG: Record<string, { label: string; color: string; chartColor: string; icon: React.ElementType }> = {
  pending: { label: 'En attente', color: 'text-yellow-400 bg-yellow-400/10', chartColor: '#facc15', icon: Clock },
  processing: { label: 'Confirmee', color: 'text-blue-400 bg-blue-400/10', chartColor: '#60a5fa', icon: CheckCircle2 },
  shipped: { label: 'Expediee', color: 'text-purple-400 bg-purple-400/10', chartColor: '#a78bfa', icon: Truck },
  delivered: { label: 'Livree', color: 'text-green-400 bg-green-400/10', chartColor: '#22c55e', icon: CheckCircle2 },
  cancelled: { label: 'Annulee', color: 'text-red-400 bg-red-400/10', chartColor: '#ef4444', icon: XCircle },
}

function daysAgo(n: number) {
  const d = new Date(); d.setDate(d.getDate() - n); d.setHours(0, 0, 0, 0); return d
}

export default function AdminDashboard() {
  const [allOrders, setAllOrders] = useState<Order[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [customerCount, setCustomerCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<Period>('30d')

  useEffect(() => {
    const load = async () => {
      const [ordersRes, productsRes, customersRes] = await Promise.all([
        supabase.from('orders').select('*').order('created_at', { ascending: false }),
        supabase.from('products').select('id, name, image_url, stock, inventory, price, isActive'),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
      ])
      setAllOrders((ordersRes.data || []) as Order[])
      setProducts((productsRes.data || []) as Product[])
      setCustomerCount(customersRes.count || 0)
      setLoading(false)
    }
    load()
  }, [])

  // ─── Filtered orders by period ───
  const filteredOrders = useMemo(() => {
    if (period === 'all') return allOrders
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90
    const cutoff = daysAgo(days)
    return allOrders.filter(o => new Date(o.created_at) >= cutoff)
  }, [allOrders, period])

  // Previous period for comparison
  const prevOrders = useMemo(() => {
    if (period === 'all') return []
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90
    const start = daysAgo(days * 2)
    const end = daysAgo(days)
    return allOrders.filter(o => { const d = new Date(o.created_at); return d >= start && d < end })
  }, [allOrders, period])

  // ─── KPIs ───
  const revenue = filteredOrders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + (o.total || 0), 0)
  const prevRevenue = prevOrders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + (o.total || 0), 0)
  const orderCount = filteredOrders.length
  const prevOrderCount = prevOrders.length
  const guestOrders = filteredOrders.filter(o => !o.user_id).length
  const avgOrderValue = orderCount > 0 ? revenue / orderCount : 0

  function growthPct(current: number, prev: number) {
    if (prev === 0) return current > 0 ? 100 : 0
    return Math.round(((current - prev) / prev) * 100)
  }

  const revenueGrowth = growthPct(revenue, prevRevenue)
  const orderGrowth = growthPct(orderCount, prevOrderCount)

  // ─── Orders by status ───
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    filteredOrders.forEach(o => { counts[o.status] = (counts[o.status] || 0) + 1 })
    return counts
  }, [filteredOrders])

  const statusTotal = Object.values(statusCounts).reduce((s, c) => s + c, 0)

  // ─── Revenue by day ───
  const revenueChart = useMemo(() => {
    const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 14 : 30
    const map: Record<string, number> = {}
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i)
      const key = period === '90d'
        ? `S${Math.ceil((days - i) / 7)}`
        : d.toISOString().slice(0, 10)
      if (!map[key]) map[key] = 0
    }
    filteredOrders.forEach(o => {
      if (o.status === 'cancelled') return
      const d = new Date(o.created_at)
      let key: string
      if (period === '90d') {
        const diff = Math.ceil((Date.now() - d.getTime()) / (7 * 86400000))
        key = `S${Math.max(1, 14 - diff + 1)}`
      } else {
        key = d.toISOString().slice(0, 10)
      }
      if (key in map) map[key] += o.total || 0
    })
    return Object.entries(map).map(([label, amount]) => ({ label, amount }))
  }, [filteredOrders, period])

  const maxRev = useMemo(() => Math.max(...revenueChart.map(d => d.amount), 1), [revenueChart])

  // ─── Donut gradient ───
  const donut = useMemo(() => {
    if (statusTotal === 0) return { gradient: 'conic-gradient(#1f2937 0deg 360deg)', segments: [] }
    let deg = 0
    const parts: string[] = []
    const segments: { label: string; color: string; count: number; pct: number }[] = []
    Object.entries(STATUS_CFG).forEach(([key, cfg]) => {
      const count = statusCounts[key] || 0
      const pct = count / statusTotal
      if (count > 0) {
        const d = pct * 360
        parts.push(`${cfg.chartColor} ${deg}deg ${deg + d}deg`)
        deg += d
      }
      segments.push({ label: cfg.label, color: cfg.chartColor, count, pct: Math.round(pct * 100) })
    })
    return { gradient: `conic-gradient(${parts.join(',')})`, segments }
  }, [statusCounts, statusTotal])

  // ─── Stock alerts ───
  const stockData = useMemo(() => {
    const getStock = (p: Product) => p.stock ?? p.inventory ?? 0
    const outOfStock = products.filter(p => getStock(p) === 0 && p.isActive !== false)
    const lowStock = products.filter(p => { const s = getStock(p); return s > 0 && s < 10 && p.isActive !== false })
    const totalActive = products.filter(p => p.isActive !== false).length
    return { outOfStock, lowStock, totalActive, totalProducts: products.length }
  }, [products])

  // ─── Period labels ───
  const periodOptions: { key: Period; label: string }[] = [
    { key: '7d', label: '7 jours' },
    { key: '30d', label: '30 jours' },
    { key: '90d', label: '90 jours' },
    { key: 'all', label: 'Tout' },
  ]

  function GrowthBadge({ value }: { value: number }) {
    if (value === 0) return <span className="text-gray-500 text-[10px]">—</span>
    const up = value > 0
    return (
      <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold ${up ? 'text-green-400' : 'text-red-400'}`}>
        {up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
        {up ? '+' : ''}{value}%
      </span>
    )
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-lg sm:text-2xl font-black text-white">Dashboard</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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

  return (
    <div className="space-y-4">
      {/* Header + Period Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-2xl font-black text-white">Dashboard</h1>
          <p className="text-gray-500 text-xs mt-0.5">Vue d&apos;ensemble de votre boutique</p>
        </div>
        <div className="flex items-center gap-1 bg-[#0d1117] border border-gray-800 rounded-lg p-1">
          <Calendar className="w-3.5 h-3.5 text-gray-500 ml-2 mr-1" />
          {periodOptions.map(opt => (
            <button
              key={opt.key}
              onClick={() => setPeriod(opt.key)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                period === opt.key ? 'bg-[#111827] text-green-400' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* ═══ KPI CARDS ═══ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Revenus', value: formatPrice(revenue), icon: TrendingUp, accent: '#22c55e', bg: 'bg-green-400/10', growth: revenueGrowth, href: '/admin/orders' },
          { label: 'Commandes', value: orderCount, icon: ShoppingCart, accent: '#60a5fa', bg: 'bg-blue-400/10', growth: orderGrowth, href: '/admin/orders' },
          { label: 'Panier moyen', value: formatPrice(avgOrderValue), icon: Package, accent: '#a78bfa', bg: 'bg-purple-400/10', growth: 0, href: '/admin/orders' },
          { label: 'Clients', value: customerCount, icon: Users, accent: '#facc15', bg: 'bg-yellow-400/10', growth: 0, href: '/admin/customers' },
        ].map(card => (
          <Link key={card.label} href={card.href}
            className="bg-[#111827] border border-[#1f2937] rounded-xl p-4 hover:border-gray-600 transition-all group">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-md ${card.bg} flex items-center justify-center`}>
                  <card.icon className="w-3.5 h-3.5" style={{ color: card.accent }} />
                </div>
                <span className="text-gray-400 text-xs">{card.label}</span>
              </div>
              {period !== 'all' && <GrowthBadge value={card.growth} />}
            </div>
            <p className="text-lg font-black text-white">{card.value}</p>
          </Link>
        ))}
      </div>

      {/* ═══ REVENUE CHART + DONUT ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue Bar Chart */}
        <div className="lg:col-span-2 bg-[#111827] border border-[#1f2937] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-bold text-sm">Revenus</h2>
            <span className="text-green-400 font-bold text-sm">{formatPrice(revenue)}</span>
          </div>
          <div className="relative" style={{ height: 200 }}>
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="absolute left-0 right-0 border-t border-[#1a2332]" style={{ top: `${i * 33.33}%` }}>
                <span className="absolute -top-2 -left-1 text-[9px] text-gray-600 font-mono">
                  {formatPrice(maxRev * (1 - i / 3)).replace(/\s*F\s*CFA/, '')}
                </span>
              </div>
            ))}
            <div className="absolute inset-0 flex items-end gap-[2px] pl-10">
              {revenueChart.map((day, i) => {
                const pct = maxRev > 0 ? (day.amount / maxRev) * 100 : 0
                return (
                  <div key={i} className="flex-1 flex flex-col items-center">
                    <div className="w-full flex justify-center" style={{ height: 170 }}>
                      <div
                        className="w-full max-w-[32px] rounded-t-md transition-all hover:brightness-125 cursor-default self-end"
                        style={{ height: `${Math.max(pct, 2)}%`, background: 'linear-gradient(to top, #16a34a, #22c55e)' }}
                        title={formatPrice(day.amount)}
                      />
                    </div>
                    {(period === '7d' || revenueChart.length <= 14) && (
                      <span className="text-gray-600 text-[8px] mt-1 truncate w-full text-center">
                        {period === '90d' ? day.label : new Date(day.label + 'T00:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }).replace('.', '')}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Donut */}
        <div className="bg-[#111827] border border-[#1f2937] rounded-xl p-5 flex flex-col">
          <h2 className="text-white font-bold text-sm mb-3">Statuts commandes</h2>
          <div className="flex-1 flex items-center justify-center">
            <div className="relative w-36 h-36">
              <div className="w-full h-full rounded-full" style={{ background: donut.gradient }} />
              <div className="absolute inset-0 m-auto w-20 h-20 rounded-full flex items-center justify-center" style={{ background: 'rgba(17,24,39,0.85)', backdropFilter: 'blur(8px)' }}>
                <div className="text-center">
                  <p className="text-xl font-black text-white">{statusTotal}</p>
                  <p className="text-gray-500 text-[9px]">commandes</p>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1">
            {donut.segments.map(s => (
              <div key={s.label} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                <span className="text-gray-400 text-[10px] truncate">{s.label}</span>
                <span className="text-white text-[10px] font-bold ml-auto">{s.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ STOCK ALERTS + RECENT ORDERS ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Stock Alerts */}
        <div className="bg-[#111827] border border-[#1f2937] rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-white font-bold text-sm flex items-center gap-2">
              <Boxes className="w-4 h-4 text-blue-400" /> Stock
            </h2>
            <Link href="/admin/inventory" className="text-green-400 hover:text-green-300 text-xs">Inventaire</Link>
          </div>

          {/* Stock summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mb-4">
            <div className="text-center p-2 rounded-lg bg-blue-400/5 border border-blue-500/10">
              <p className="text-blue-400 font-black text-lg">{stockData.totalProducts}</p>
              <p className="text-gray-500 text-[9px]">Total</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-yellow-400/5 border border-yellow-500/10">
              <p className="text-yellow-400 font-black text-lg">{stockData.lowStock.length}</p>
              <p className="text-gray-500 text-[9px]">Faible</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-red-400/5 border border-red-500/10">
              <p className="text-red-400 font-black text-lg">{stockData.outOfStock.length}</p>
              <p className="text-gray-500 text-[9px]">Rupture</p>
            </div>
          </div>

          {/* Out of stock list */}
          {stockData.outOfStock.length > 0 && (
            <div>
              <p className="text-red-400 text-xs font-bold mb-2 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Rupture de stock
              </p>
              <div className="space-y-1.5 max-h-[140px] overflow-y-auto">
                {stockData.outOfStock.slice(0, 5).map(p => (
                  <Link key={p.id} href={`/admin/products/${p.id}`}
                    className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-800/50 transition-colors">
                    <div className="w-7 h-7 rounded bg-gray-900 flex-shrink-0 overflow-hidden">
                      <img src={p.image_url} alt="" className="w-full h-full object-cover" />
                    </div>
                    <span className="text-gray-300 text-xs truncate">{p.name}</span>
                    <span className="text-red-400 text-[10px] font-bold ml-auto">0</span>
                  </Link>
                ))}
                {stockData.outOfStock.length > 5 && (
                  <p className="text-gray-600 text-[10px] text-center">+{stockData.outOfStock.length - 5} autres</p>
                )}
              </div>
            </div>
          )}

          {stockData.outOfStock.length === 0 && stockData.lowStock.length === 0 && (
            <p className="text-gray-600 text-xs text-center py-2">Tous les stocks sont bons</p>
          )}

          {stockData.outOfStock.length === 0 && stockData.lowStock.length > 0 && (
            <div>
              <p className="text-yellow-400 text-xs font-bold mb-2 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Stock faible
              </p>
              <div className="space-y-1.5 max-h-[140px] overflow-y-auto">
                {stockData.lowStock.slice(0, 5).map(p => (
                  <Link key={p.id} href={`/admin/products/${p.id}`}
                    className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-800/50 transition-colors">
                    <div className="w-7 h-7 rounded bg-gray-900 flex-shrink-0 overflow-hidden">
                      <img src={p.image_url} alt="" className="w-full h-full object-cover" />
                    </div>
                    <span className="text-gray-300 text-xs truncate">{p.name}</span>
                    <span className="text-yellow-400 text-[10px] font-bold ml-auto">{p.stock ?? p.inventory}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Recent Orders */}
        <div className="lg:col-span-2 bg-[#111827] border border-[#1f2937] rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-white font-bold text-sm">Commandes recentes</h2>
            <div className="flex items-center gap-3">
              {guestOrders > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-purple-400/10 text-purple-400">{guestOrders} invites</span>
              )}
              <Link href="/admin/orders" className="text-green-400 hover:text-green-300 text-xs">Voir tout</Link>
            </div>
          </div>
          {filteredOrders.length === 0 ? (
            <p className="text-gray-500 text-sm py-8 text-center">Aucune commande sur cette periode</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-[#1f2937]">
                    <th className="text-gray-500 text-[10px] font-medium pb-2">Client</th>
                    <th className="text-gray-500 text-[10px] font-medium pb-2">Date</th>
                    <th className="text-gray-500 text-[10px] font-medium pb-2 text-right">Montant</th>
                    <th className="text-gray-500 text-[10px] font-medium pb-2 text-right">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.slice(0, 8).map(order => {
                    const cfg = STATUS_CFG[order.status] || STATUS_CFG.pending
                    const name = order.shipping_address?.firstName
                      ? `${order.shipping_address.firstName} ${order.shipping_address.lastName || ''}`
                      : order.shipping_address?.name || 'Invite'
                    return (
                      <tr key={order.id} className="border-b border-[#1f2937]/50 last:border-0 hover:bg-gray-800/30 transition-colors">
                        <td className="py-2 pr-2">
                          <Link href={`/admin/orders/${order.id}`} className="text-white text-xs font-medium hover:text-green-400 transition-colors">
                            {name.trim()}
                          </Link>
                          {!order.user_id && <span className="text-purple-400 text-[9px] ml-1">invite</span>}
                        </td>
                        <td className="py-2 pr-2 text-gray-500 text-xs">
                          {new Date(order.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                        </td>
                        <td className="py-2 pr-2 text-right text-green-400 font-bold text-xs">{formatPrice(order.total)}</td>
                        <td className="py-2 text-right">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${cfg.color}`}>
                            {cfg.label}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
