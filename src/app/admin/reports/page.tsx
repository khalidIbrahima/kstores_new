'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { formatPrice } from '@/lib/utils'
import {
  BarChart3,
  DollarSign,
  ShoppingCart,
  Users,
  Package,
  TrendingUp,
  AlertTriangle,
  XCircle,
  Loader2,
} from 'lucide-react'

interface ReportData {
  // Sales
  totalRevenue: number
  ordersCount: number
  avgOrderValue: number
  revenueByMonth: { month: string; revenue: number }[]
  // Customers
  totalCustomers: number
  newThisMonth: number
  returningCustomers: number
  // Inventory
  totalProducts: number
  activeProducts: number
  outOfStock: number
  lowStock: number
}

type Tab = 'sales' | 'customers' | 'inventory'

const tabs: { key: Tab; label: string; icon: typeof DollarSign }[] = [
  { key: 'sales', label: 'Ventes', icon: DollarSign },
  { key: 'customers', label: 'Clients', icon: Users },
  { key: 'inventory', label: 'Inventaire', icon: Package },
]

export default function AdminReports() {
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('sales')

  useEffect(() => {
    const fetchReports = async () => {
      const [ordersRes, customersRes, productsRes] = await Promise.all([
        supabase.from('orders').select('*'),
        supabase.from('profiles').select('id, created_at'),
        supabase.from('products').select('id, stock, inventory, isActive'),
      ])

      const orders = ordersRes.data || []
      const customers = customersRes.data || []
      const products = productsRes.data || []

      // Sales
      const validOrders = orders.filter(o => o.status !== 'cancelled')
      const totalRevenue = validOrders.reduce((sum, o) => sum + (o.total || 0), 0)
      const ordersCount = validOrders.length
      const avgOrderValue = ordersCount > 0 ? Math.round(totalRevenue / ordersCount) : 0

      // Revenue by month
      const monthMap: Record<string, number> = {}
      validOrders.forEach(o => {
        const date = new Date(o.created_at)
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        monthMap[key] = (monthMap[key] || 0) + (o.total || 0)
      })
      const revenueByMonth = Object.entries(monthMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-6)
        .map(([month, revenue]) => ({ month, revenue }))

      // Customers
      const now = new Date()
      const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const newThisMonth = customers.filter(c =>
        new Date(c.created_at) >= firstOfMonth
      ).length

      // Count customers who have more than one order
      const customerOrderCounts: Record<string, number> = {}
      orders.forEach(o => {
        if (o.user_id) {
          customerOrderCounts[o.user_id] = (customerOrderCounts[o.user_id] || 0) + 1
        }
      })
      const returningCustomers = Object.values(customerOrderCounts).filter(c => c > 1).length

      // Inventory
      const getStock = (p: { stock: number | null; inventory: number }) => p.stock ?? p.inventory ?? 0
      const totalProducts = products.length
      const activeProducts = products.filter(p => p.isActive !== false).length
      const outOfStock = products.filter(p => getStock(p) === 0).length
      const lowStock = products.filter(p => { const s = getStock(p); return s > 0 && s < 10 }).length

      setData({
        totalRevenue,
        ordersCount,
        avgOrderValue,
        revenueByMonth,
        totalCustomers: customers.length,
        newThisMonth,
        returningCustomers,
        totalProducts,
        activeProducts,
        outOfStock,
        lowStock,
      })
      setLoading(false)
    }

    fetchReports()
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-black text-white">Rapports</h1>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-green-400 animate-spin" />
        </div>
      </div>
    )
  }

  if (!data) return null

  const maxRevenue = Math.max(...data.revenueByMonth.map(m => m.revenue), 1)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-white">Rapports</h1>
        <p className="text-gray-500 text-sm mt-1">Vue d&apos;ensemble de votre activite</p>
      </div>

      {/* Tab Bar */}
      <div className="bg-[#0d1117] border border-gray-800 rounded-xl flex overflow-hidden">
        {tabs.map(tab => {
          const Icon = tab.icon
          const isActive = activeTab === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold transition-colors relative ${
                isActive
                  ? 'text-green-400 border-b-2 border-green-400'
                  : 'text-gray-500 hover:text-gray-300 border-b-2 border-transparent'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Tab Content */}

      {/* --- Ventes --- */}
      {activeTab === 'sales' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Stat Cards */}
          <div className="flex flex-col gap-4">
            <div className="bg-[#111827] border border-gray-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-gray-400 text-sm">Revenus totaux</span>
                <div className="w-10 h-10 rounded-lg bg-green-400/10 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-green-400" />
                </div>
              </div>
              <p className="text-2xl font-black text-white">{formatPrice(data.totalRevenue)}</p>
            </div>
            <div className="bg-[#111827] border border-gray-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-gray-400 text-sm">Commandes</span>
                <div className="w-10 h-10 rounded-lg bg-blue-400/10 flex items-center justify-center">
                  <ShoppingCart className="w-5 h-5 text-blue-400" />
                </div>
              </div>
              <p className="text-2xl font-black text-white">{data.ordersCount}</p>
            </div>
            <div className="bg-[#111827] border border-gray-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-gray-400 text-sm">Panier moyen</span>
                <div className="w-10 h-10 rounded-lg bg-yellow-400/10 flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-yellow-400" />
                </div>
              </div>
              <p className="text-2xl font-black text-white">{formatPrice(data.avgOrderValue)}</p>
            </div>
          </div>

          {/* Right: Revenue Bar Chart */}
          <div className="lg:col-span-2 bg-[#111827] border border-gray-800 rounded-xl p-6">
            <h3 className="text-white font-bold mb-6">Revenus par mois</h3>
            {data.revenueByMonth.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Aucune donnee disponible</p>
            ) : (
              <div className="flex items-end gap-3 h-48">
                {data.revenueByMonth.map(item => {
                  const heightPercent = (item.revenue / maxRevenue) * 100
                  const [year, month] = item.month.split('-')
                  const label = new Date(Number(year), Number(month) - 1).toLocaleDateString('fr-FR', { month: 'short' })
                  return (
                    <div key={item.month} className="flex-1 flex flex-col items-center gap-2 group relative">
                      <div className="opacity-0 group-hover:opacity-100 absolute -top-10 bg-gray-900 border border-gray-700 rounded-lg px-2 py-1 text-xs text-white whitespace-nowrap z-10 pointer-events-none transition-opacity">
                        {formatPrice(item.revenue)}
                      </div>
                      <div
                        className="w-full bg-green-500/70 rounded-t hover:bg-green-400 transition-colors cursor-pointer min-h-[4px]"
                        style={{ height: `${Math.max(heightPercent, 2)}%` }}
                      />
                      <span className="text-gray-500 text-xs capitalize">{label}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- Clients --- */}
      {activeTab === 'customers' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Stat Cards */}
          <div className="flex flex-col gap-4">
            <div className="bg-[#111827] border border-gray-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-gray-400 text-sm">Total clients</span>
                <div className="w-10 h-10 rounded-lg bg-purple-400/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-purple-400" />
                </div>
              </div>
              <p className="text-2xl font-black text-white">{data.totalCustomers}</p>
            </div>
            <div className="bg-[#111827] border border-gray-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-gray-400 text-sm">Nouveaux ce mois</span>
                <div className="w-10 h-10 rounded-lg bg-blue-400/10 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-blue-400" />
                </div>
              </div>
              <p className="text-2xl font-black text-white">{data.newThisMonth}</p>
            </div>
            <div className="bg-[#111827] border border-gray-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-gray-400 text-sm">Clients recurrents</span>
                <div className="w-10 h-10 rounded-lg bg-green-400/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-green-400" />
                </div>
              </div>
              <p className="text-2xl font-black text-white">{data.returningCustomers}</p>
            </div>
          </div>

          {/* Right: Customer Breakdown */}
          <div className="lg:col-span-2 bg-[#111827] border border-gray-800 rounded-xl p-6">
            <h3 className="text-white font-bold mb-6">Repartition des clients</h3>
            <div className="space-y-6">
              {/* Returning vs New ratio bar */}
              <div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-gray-400">Clients recurrents</span>
                  <span className="text-white font-semibold">{data.returningCustomers}</span>
                </div>
                <div className="w-full h-3 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full transition-all"
                    style={{
                      width: `${data.totalCustomers > 0 ? (data.returningCustomers / data.totalCustomers) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-gray-400">Nouveaux ce mois</span>
                  <span className="text-white font-semibold">{data.newThisMonth}</span>
                </div>
                <div className="w-full h-3 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all"
                    style={{
                      width: `${data.totalCustomers > 0 ? (data.newThisMonth / data.totalCustomers) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
              <div className="pt-4 border-t border-gray-800">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-sm">Taux de retention</span>
                  <span className="text-2xl font-black text-green-400">
                    {data.totalCustomers > 0
                      ? Math.round((data.returningCustomers / data.totalCustomers) * 100)
                      : 0}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- Inventaire --- */}
      {activeTab === 'inventory' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Stat Cards */}
          <div className="flex flex-col gap-4">
            <div className="bg-[#111827] border border-gray-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-gray-400 text-sm">Total produits</span>
                <div className="w-10 h-10 rounded-lg bg-blue-400/10 flex items-center justify-center">
                  <Package className="w-5 h-5 text-blue-400" />
                </div>
              </div>
              <p className="text-2xl font-black text-white">{data.totalProducts}</p>
            </div>
            <div className="bg-[#111827] border border-gray-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-gray-400 text-sm">Produits actifs</span>
                <div className="w-10 h-10 rounded-lg bg-green-400/10 flex items-center justify-center">
                  <Package className="w-5 h-5 text-green-400" />
                </div>
              </div>
              <p className="text-2xl font-black text-white">{data.activeProducts}</p>
            </div>
          </div>

          {/* Right: Stock Alerts */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <div className="bg-[#111827] border border-gray-800 rounded-xl p-6">
              <h3 className="text-white font-bold mb-6">Alertes de stock</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center gap-4 bg-red-500/5 border border-red-500/20 rounded-xl p-4">
                  <div className="w-12 h-12 rounded-lg bg-red-400/10 flex items-center justify-center shrink-0">
                    <XCircle className="w-6 h-6 text-red-400" />
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Rupture de stock</p>
                    <p className="text-2xl font-black text-white">{data.outOfStock}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-4">
                  <div className="w-12 h-12 rounded-lg bg-yellow-400/10 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-6 h-6 text-yellow-400" />
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Stock faible</p>
                    <p className="text-2xl font-black text-white">{data.lowStock}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Inventory Breakdown Bar */}
            <div className="bg-[#111827] border border-gray-800 rounded-xl p-6">
              <h3 className="text-white font-bold mb-4">Repartition</h3>
              <div className="w-full h-4 bg-gray-800 rounded-full overflow-hidden flex">
                {data.totalProducts > 0 && (
                  <>
                    <div
                      className="h-full bg-green-500 transition-all"
                      title={`Actifs: ${data.activeProducts - data.lowStock - data.outOfStock}`}
                      style={{
                        width: `${((data.activeProducts - data.lowStock - data.outOfStock) / data.totalProducts) * 100}%`,
                      }}
                    />
                    <div
                      className="h-full bg-yellow-500 transition-all"
                      title={`Stock faible: ${data.lowStock}`}
                      style={{
                        width: `${(data.lowStock / data.totalProducts) * 100}%`,
                      }}
                    />
                    <div
                      className="h-full bg-red-500 transition-all"
                      title={`Rupture: ${data.outOfStock}`}
                      style={{
                        width: `${(data.outOfStock / data.totalProducts) * 100}%`,
                      }}
                    />
                  </>
                )}
              </div>
              <div className="flex items-center gap-6 mt-3 text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                  <span className="text-gray-400">En stock</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                  <span className="text-gray-400">Stock faible</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                  <span className="text-gray-400">Rupture</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
