'use client'

import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { formatPrice } from '@/lib/utils'
import {
  Search, Package, Clock, CheckCircle2, Truck, XCircle, Loader2, Mail, Phone, Hash, ChevronRight,
} from 'lucide-react'

interface Order {
  id: string
  created_at: string
  status: string
  total: number
  shipping_address: {
    name?: string
    firstName?: string
    lastName?: string
    email?: string
    phone?: string
    address?: string
    city?: string
  }
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending: { label: 'En attente', color: 'text-yellow-400 bg-yellow-400/10', icon: Clock },
  processing: { label: 'Confirmee', color: 'text-blue-400 bg-blue-400/10', icon: CheckCircle2 },
  shipped: { label: 'Expediee', color: 'text-purple-400 bg-purple-400/10', icon: Truck },
  delivered: { label: 'Livree', color: 'text-green-400 bg-green-400/10', icon: CheckCircle2 },
  cancelled: { label: 'Annulee', color: 'text-red-400 bg-red-400/10', icon: XCircle },
}

type Method = 'order' | 'phone' | 'email'

export default function TrackOrderPage() {
  const [method, setMethod] = useState<Method>('order')
  const [query, setQuery] = useState('')
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return
    setLoading(true)
    setSearched(true)

    let data: Order[] = []

    if (method === 'order') {
      // Search by order ID — try exact match first, then partial via text cast
      const q = query.trim().replace('#', '').toLowerCase()
      // Try exact UUID match
      const { data: exact } = await supabase.from('orders').select('*').eq('id', q).limit(1)
      if (exact && exact.length > 0) {
        data = exact as Order[]
      } else {
        // Partial match: fetch recent orders and filter client-side
        const { data: recent } = await supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(200)
        data = ((recent || []) as Order[]).filter(o => o.id.toLowerCase().startsWith(q))
      }
    } else if (method === 'phone') {
      const { data: res } = await supabase.from('orders').select('*')
        .filter('shipping_address->>phone', 'eq', query.trim())
        .order('created_at', { ascending: false })
      data = (res || []) as Order[]
    } else {
      const { data: res } = await supabase.from('orders').select('*')
        .filter('shipping_address->>email', 'eq', query.trim())
        .order('created_at', { ascending: false })
      data = (res || []) as Order[]
    }

    setOrders(data)
    setLoading(false)
  }

  const methods: { key: Method; label: string; icon: React.ElementType; placeholder: string }[] = [
    { key: 'order', label: 'N° commande', icon: Hash, placeholder: 'Ex: 72E417E2' },
    { key: 'phone', label: 'Telephone', icon: Phone, placeholder: '+221 XX XXX XX XX' },
    { key: 'email', label: 'Email', icon: Mail, placeholder: 'votre@email.com' },
  ]

  const activeMethod = methods.find(m => m.key === method)!

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <Package className="w-8 h-8 text-green-400" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-black italic text-white">
          Suivre <span className="text-green-400">ma commande</span>
        </h1>
        <p className="text-gray-500 mt-2 text-sm">
          Entrez votre numero de commande, email ou telephone
        </p>
      </div>

      {/* Search */}
      <div className="bg-[#111827] border border-gray-800 rounded-xl p-4 sm:p-6 mb-6">
        <div className="flex items-center gap-1.5 mb-4 overflow-x-auto">
          {methods.map(m => (
            <button
              key={m.key}
              onClick={() => { setMethod(m.key); setQuery(''); setSearched(false) }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                method === m.key ? 'bg-green-500 text-black' : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              <m.icon className="w-3.5 h-3.5" /> {m.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSearch} className="flex gap-2 sm:gap-3">
          <div className="relative flex-1">
            <activeMethod.icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
            <input
              type={method === 'email' ? 'email' : 'text'}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={activeMethod.placeholder}
              required
              className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-3 text-white outline-none focus:border-green-500 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="bg-green-500 hover:bg-green-600 text-black font-bold px-4 sm:px-6 py-3 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            <span className="hidden sm:inline">Rechercher</span>
          </button>
        </form>
      </div>

      {/* Results */}
      {searched && !loading && (
        <>
          {orders.length === 0 ? (
            <div className="bg-[#111827] border border-gray-800 rounded-xl p-8 text-center">
              <Package className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-white font-bold mb-1">Aucune commande trouvee</p>
              <p className="text-gray-500 text-sm">Verifiez votre {method === 'order' ? 'numero de commande' : method === 'email' ? 'adresse email' : 'numero de telephone'}</p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-gray-400 text-sm">{orders.length} commande{orders.length > 1 ? 's' : ''} trouvee{orders.length > 1 ? 's' : ''}</p>
              {orders.map(order => {
                const config = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending
                const StatusIcon = config.icon
                const customerName = order.shipping_address?.name
                  || [order.shipping_address?.firstName, order.shipping_address?.lastName].filter(Boolean).join(' ')
                  || ''
                return (
                  <Link
                    key={order.id}
                    href={`/orders/track/${order.id}`}
                    className="block bg-[#111827] border border-gray-800 rounded-xl p-4 sm:p-5 hover:border-green-500/30 transition-all group"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-white font-bold text-sm flex items-center gap-2">
                          <span className="text-green-400 font-mono">#{order.id.slice(0, 8).toUpperCase()}</span>
                        </p>
                        <p className="text-gray-500 text-xs mt-0.5">
                          {new Date(order.created_at).toLocaleDateString('fr-FR', {
                            day: 'numeric', month: 'long', year: 'numeric',
                          })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${config.color}`}>
                          <StatusIcon className="w-3 h-3" />
                          {config.label}
                        </span>
                        <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-green-400 transition-colors" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-gray-800">
                      <span className="text-gray-400 text-sm">{customerName}</span>
                      <span className="text-green-400 font-bold">{formatPrice(order.total)}</span>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* Links */}
      <div className="mt-8 text-center space-y-2">
        <Link href="/login" className="text-green-400 hover:text-green-300 text-sm">
          Se connecter pour un suivi complet
        </Link>
        <p className="text-gray-600 text-xs">ou</p>
        <Link href="/products" className="text-gray-400 hover:text-white text-sm">
          Continuer les achats
        </Link>
      </div>
    </div>
  )
}
