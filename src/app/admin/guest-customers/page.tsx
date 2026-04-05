'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { formatPrice } from '@/lib/utils'
import {
  Users, Search, Loader2, Phone, Mail, ShoppingCart, CheckCircle2, Clock, XCircle,
} from 'lucide-react'

interface GuestOrder {
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

interface GuestCustomer {
  key: string
  name: string
  email: string | null
  phone: string | null
  orders: GuestOrder[]
  totalSpent: number
  lastOrder: string
  status: 'completed' | 'pending' | 'abandoned' | 'mixed'
}

export default function AdminGuestCustomers() {
  const [guests, setGuests] = useState<GuestCustomer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      const { data } = await supabase
        .from('orders')
        .select('*')
        .is('user_id', null)
        .order('created_at', { ascending: false })

      const orders = (data || []) as GuestOrder[]

      // Group by phone (primary) or email (fallback)
      const map = new Map<string, GuestCustomer>()
      for (const order of orders) {
        const addr = order.shipping_address || {}
        const key = addr.phone || addr.email || order.id
        const existing = map.get(key)
        if (existing) {
          existing.orders.push(order)
          existing.totalSpent += Number(order.total) || 0
          if (order.created_at > existing.lastOrder) existing.lastOrder = order.created_at
        } else {
          map.set(key, {
            key,
            name: [addr.firstName, addr.lastName].filter(Boolean).join(' ') || 'Invite',
            email: addr.email || null,
            phone: addr.phone || null,
            orders: [order],
            totalSpent: Number(order.total) || 0,
            lastOrder: order.created_at,
            status: 'pending',
          })
        }
      }

      // Compute status
      for (const guest of map.values()) {
        const hasCompleted = guest.orders.some(o => ['delivered', 'shipped', 'confirmed'].includes(o.status))
        const hasPending = guest.orders.some(o => o.status === 'pending')
        const hasCancelled = guest.orders.some(o => o.status === 'cancelled')
        if (hasCompleted && (hasPending || hasCancelled)) guest.status = 'mixed'
        else if (hasCompleted) guest.status = 'completed'
        else if (hasCancelled && !hasPending) guest.status = 'abandoned'
        else guest.status = 'pending'
      }

      setGuests(Array.from(map.values()))
      setLoading(false)
    }
    fetchData()
  }, [])

  const totalGuests = guests.length
  const totalOrders = guests.reduce((sum, g) => sum + g.orders.length, 0)
  const totalRevenue = guests.reduce((sum, g) => sum + g.totalSpent, 0)
  const withPhone = guests.filter(g => g.phone).length
  const withEmail = guests.filter(g => g.email).length
  const completedGuests = guests.filter(g => g.status === 'completed' || g.status === 'mixed').length
  const conversionRate = totalGuests > 0 ? Math.round((completedGuests / totalGuests) * 100) : 0

  const filtered = guests.filter(g =>
    g.name.toLowerCase().includes(search.toLowerCase()) ||
    g.phone?.includes(search) ||
    g.email?.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-lg sm:text-2xl font-black text-white">Clients invites</h1>
        <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-green-400 animate-spin" /></div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-lg sm:text-2xl font-black text-white">Clients invites</h1>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-400/10 text-blue-400">{totalGuests} invites</span>
            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-400/10 text-green-400">{formatPrice(totalRevenue)}</span>
            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-purple-400/10 text-purple-400">{totalOrders} commandes</span>
            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-400/10 text-yellow-400">{conversionRate}% conversion</span>
          </div>
        </div>
        <p className="text-gray-500 text-xs mt-1">Commandes sans compte utilisateur</p>
      </div>

      {/* Contact stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-[#111827] border border-gray-800 rounded-xl p-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-green-400/10 flex items-center justify-center">
            <Phone className="w-4 h-4 text-green-400" />
          </div>
          <div>
            <p className="text-white font-bold">{withPhone}</p>
            <p className="text-gray-500 text-xs">Avec telephone</p>
          </div>
        </div>
        <div className="bg-[#111827] border border-gray-800 rounded-xl p-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-400/10 flex items-center justify-center">
            <Mail className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <p className="text-white font-bold">{withEmail}</p>
            <p className="text-gray-500 text-xs">Avec email</p>
          </div>
        </div>
        <div className="bg-[#111827] border border-gray-800 rounded-xl p-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-green-400/10 flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4 text-green-400" />
          </div>
          <div>
            <p className="text-white font-bold">{completedGuests}</p>
            <p className="text-gray-500 text-xs">Achats completes</p>
          </div>
        </div>
        <div className="bg-[#111827] border border-gray-800 rounded-xl p-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-yellow-400/10 flex items-center justify-center">
            <ShoppingCart className="w-4 h-4 text-yellow-400" />
          </div>
          <div>
            <p className="text-white font-bold">{conversionRate}%</p>
            <p className="text-gray-500 text-xs">Taux conversion</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher par nom, telephone ou email..."
          className="w-full bg-[#111827] border border-gray-800 rounded-lg pl-10 pr-4 py-2.5 text-white text-sm outline-none focus:border-green-500" />
      </div>

      {/* Table */}
      <div className="bg-[#111827] border border-gray-800 rounded-xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-8 text-center">
            <Users className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500">Aucun client invite</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b border-gray-800 text-left">
                  <th className="px-4 py-3 text-xs text-gray-500 font-medium">Client</th>
                  <th className="px-4 py-3 text-xs text-gray-500 font-medium">Contact</th>
                  <th className="px-4 py-3 text-xs text-gray-500 font-medium text-center">Commandes</th>
                  <th className="px-4 py-3 text-xs text-gray-500 font-medium text-right">Total depense</th>
                  <th className="px-4 py-3 text-xs text-gray-500 font-medium">Statut</th>
                  <th className="px-4 py-3 text-xs text-gray-500 font-medium">Derniere commande</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(guest => {
                  const statusConf = {
                    completed: { label: 'Complete', color: 'text-green-400 bg-green-400/10', icon: CheckCircle2 },
                    pending: { label: 'En attente', color: 'text-yellow-400 bg-yellow-400/10', icon: Clock },
                    abandoned: { label: 'Abandonne', color: 'text-red-400 bg-red-400/10', icon: XCircle },
                    mixed: { label: 'Mixte', color: 'text-blue-400 bg-blue-400/10', icon: ShoppingCart },
                  }[guest.status]
                  const StatusIcon = statusConf.icon
                  return (
                    <tr key={guest.key} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-gray-400 text-xs font-bold flex-shrink-0">
                            {guest.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-white text-sm font-medium">{guest.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {guest.phone && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-green-400/10 text-green-400 flex items-center gap-1">
                              <Phone className="w-2.5 h-2.5" />{guest.phone}
                            </span>
                          )}
                          {guest.email && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-400/10 text-blue-400 flex items-center gap-1 truncate max-w-[180px]">
                              <Mail className="w-2.5 h-2.5" />{guest.email}
                            </span>
                          )}
                          {!guest.phone && !guest.email && (
                            <span className="text-xs text-gray-600">Aucun contact</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-white text-sm text-center font-bold">{guest.orders.length}</td>
                      <td className="px-4 py-3 text-green-400 font-bold text-sm text-right">{formatPrice(guest.totalSpent)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusConf.color}`}>
                          <StatusIcon className="w-3 h-3" />{statusConf.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-sm">
                        {new Date(guest.lastOrder).toLocaleDateString('fr-FR')}
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
  )
}
