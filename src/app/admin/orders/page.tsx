'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { formatPrice } from '@/lib/utils'
import { Search, Clock, CheckCircle2, Truck, XCircle, ChevronRight, Package, DollarSign, Plus } from 'lucide-react'
import Pagination from '@/components/Pagination'

const ITEMS_PER_PAGE = 15

interface Order {
  id: string
  created_at: string
  status: string
  total: number
  shipping_address: {
    firstName?: string
    lastName?: string
    email?: string
    phone?: string
    city?: string
  }
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType; pill: string }> = {
  pending: { label: 'En attente', color: 'text-yellow-400 bg-yellow-400/10', icon: Clock, pill: 'bg-yellow-500 text-black' },
  processing: { label: 'Confirmée', color: 'text-blue-400 bg-blue-400/10', icon: CheckCircle2, pill: 'bg-blue-500 text-white' },
  shipped: { label: 'Expédiée', color: 'text-purple-400 bg-purple-400/10', icon: Truck, pill: 'bg-purple-500 text-white' },
  delivered: { label: 'Livrée', color: 'text-green-400 bg-green-400/10', icon: CheckCircle2, pill: 'bg-green-500 text-black' },
  cancelled: { label: 'Annulée', color: 'text-red-400 bg-red-400/10', icon: XCircle, pill: 'bg-red-500 text-white' },
}

const TAB_ALL = { key: 'all', label: 'Toutes', pill: 'bg-gray-500 text-white' }

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setOrders((data || []) as Order[])
        setLoading(false)
      })
  }, [])

  const totalRevenue = orders.filter(o => o.status !== 'cancelled').reduce((sum, o) => sum + o.total, 0)
  const pendingCount = orders.filter(o => o.status === 'pending').length

  const statusCounts: Record<string, number> = { all: orders.length }
  for (const o of orders) {
    statusCounts[o.status] = (statusCounts[o.status] || 0) + 1
  }

  const filtered = orders.filter(o => {
    const matchStatus = statusFilter === 'all' || o.status === statusFilter
    const matchSearch = search === '' ||
      o.shipping_address?.firstName?.toLowerCase().includes(search.toLowerCase()) ||
      o.shipping_address?.lastName?.toLowerCase().includes(search.toLowerCase()) ||
      o.shipping_address?.email?.toLowerCase().includes(search.toLowerCase()) ||
      o.id.toLowerCase().includes(search.toLowerCase())
    return matchStatus && matchSearch
  })
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE)
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)

  return (
    <div className="space-y-4">
      {/* Header with inline stats */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-white">Commandes</h1>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-gray-700 text-gray-200">
          <Package className="w-3 h-3" />
          {orders.length}
        </span>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-green-500/15 text-green-400">
          <DollarSign className="w-3 h-3" />
          {formatPrice(totalRevenue)}
        </span>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-yellow-400/15 text-yellow-400">
          <Clock className="w-3 h-3" />
          {pendingCount} en attente
        </span>
        </div>
        <Link href="/admin/orders/new"
          className="flex items-center gap-1.5 px-4 py-2 bg-green-500 hover:bg-green-600 text-black font-bold text-sm rounded-lg transition-colors">
          <Plus className="w-4 h-4" /> Creer
        </Link>
      </div>

      {/* Status tab bar */}
      <div className="flex flex-wrap gap-2">
        {[TAB_ALL, ...Object.entries(STATUS_CONFIG).map(([key, cfg]) => ({ key, label: cfg.label, pill: cfg.pill }))].map(tab => {
          const isActive = statusFilter === tab.key
          const count = statusCounts[tab.key] || 0
          return (
            <button
              key={tab.key}
              onClick={() => { setStatusFilter(tab.key); setCurrentPage(1) }}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-colors ${
                isActive ? tab.pill : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-300'
              }`}
            >
              {tab.label} ({count})
            </button>
          )
        })}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input
          type="text"
          value={search}
          onChange={e => { setSearch(e.target.value); setCurrentPage(1) }}
          placeholder="Rechercher par nom, email, ID..."
          className="w-full bg-[#111827] border border-gray-800 rounded-lg pl-10 pr-4 py-3 text-white text-sm outline-none focus:border-green-500"
        />
      </div>

      {/* Orders Table */}
      <div className="bg-[#111827] border border-gray-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Chargement...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Aucune commande trouvée</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
            <thead>
              <tr className="border-b border-gray-800 text-left">
                <th className="px-4 py-3 text-xs text-gray-500 font-medium">ID</th>
                <th className="px-4 py-3 text-xs text-gray-500 font-medium">Client</th>
                <th className="px-4 py-3 text-xs text-gray-500 font-medium">Date</th>
                <th className="px-4 py-3 text-xs text-gray-500 font-medium">Total</th>
                <th className="px-4 py-3 text-xs text-gray-500 font-medium">Statut</th>
                <th className="px-4 py-3 text-xs text-gray-500 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {paginated.map(order => {
                const config = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending
                const StatusIcon = config.icon
                return (
                  <tr key={order.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                    <td className="px-4 py-3">
                      <span className="text-gray-400 text-xs font-mono">
                        {order.id.slice(0, 8)}...
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-white text-sm">
                        {order.shipping_address?.firstName} {order.shipping_address?.lastName}
                      </p>
                      <p className="text-gray-500 text-xs">{order.shipping_address?.email}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-sm">
                      {new Date(order.created_at).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-green-400 font-bold text-sm">{formatPrice(order.total)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {config.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-gray-800 inline-flex transition-colors"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            </table>
          </div>
        )}
      </div>
      <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
    </div>
  )
}
