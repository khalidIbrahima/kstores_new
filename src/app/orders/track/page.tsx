'use client'

import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { formatPrice } from '@/lib/utils'
import {
  Search, Package, Clock, CheckCircle2, Truck, XCircle, Loader2, Mail, Phone,
} from 'lucide-react'

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
    address?: string
    city?: string
  }
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending: { label: 'En attente', color: 'text-yellow-400 bg-yellow-400/10', icon: Clock },
  confirmed: { label: 'Confirmee', color: 'text-blue-400 bg-blue-400/10', icon: CheckCircle2 },
  shipped: { label: 'Expediee', color: 'text-purple-400 bg-purple-400/10', icon: Truck },
  delivered: { label: 'Livree', color: 'text-green-400 bg-green-400/10', icon: CheckCircle2 },
  cancelled: { label: 'Annulee', color: 'text-red-400 bg-red-400/10', icon: XCircle },
}

export default function TrackOrderPage() {
  const [method, setMethod] = useState<'email' | 'phone'>('phone')
  const [query, setQuery] = useState('')
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return
    setLoading(true)
    setSearched(true)

    // Search in shipping_address JSON field
    const { data } = await supabase
      .from('orders')
      .select('*')
      .filter(
        `shipping_address->${method === 'email' ? 'email' : 'phone'}`,
        'eq',
        query.trim()
      )
      .order('created_at', { ascending: false })

    setOrders((data || []) as Order[])
    setLoading(false)
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <Search className="w-8 h-8 text-green-400" />
        </div>
        <h1 className="text-3xl font-black italic text-white">
          Suivre <span className="text-green-400">ma commande</span>
        </h1>
        <p className="text-gray-500 mt-2 text-sm">
          Retrouvez vos commandes avec votre email ou telephone
        </p>
      </div>

      {/* Search form */}
      <div className="bg-[#111827] border border-gray-800 rounded-xl p-6 mb-6">
        {/* Method toggle */}
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => { setMethod('phone'); setQuery(''); setSearched(false) }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              method === 'phone' ? 'bg-green-500 text-black' : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            <Phone className="w-4 h-4" /> Telephone
          </button>
          <button
            onClick={() => { setMethod('email'); setQuery(''); setSearched(false) }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              method === 'email' ? 'bg-green-500 text-black' : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            <Mail className="w-4 h-4" /> Email
          </button>
        </div>

        <form onSubmit={handleSearch} className="flex gap-3">
          <input
            type={method === 'email' ? 'email' : 'tel'}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={method === 'email' ? 'votre@email.com' : '+221 XX XXX XX XX'}
            required
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white outline-none focus:border-green-500"
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-green-500 hover:bg-green-600 text-black font-bold px-6 py-3 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Rechercher
          </button>
        </form>
      </div>

      {/* Results */}
      {searched && !loading && (
        <>
          {orders.length === 0 ? (
            <div className="bg-[#111827] border border-gray-800 rounded-xl p-8 text-center">
              <Package className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500">Aucune commande trouvee</p>
              <p className="text-gray-600 text-xs mt-1">Verifiez votre {method === 'email' ? 'adresse email' : 'numero de telephone'}</p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-gray-400 text-sm">{orders.length} commande{orders.length > 1 ? 's' : ''} trouvee{orders.length > 1 ? 's' : ''}</p>
              {orders.map(order => {
                const config = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending
                const StatusIcon = config.icon
                return (
                  <div key={order.id} className="bg-[#111827] border border-gray-800 rounded-xl p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-white font-bold text-sm">
                          Commande #{order.id.slice(0, 8)}
                        </p>
                        <p className="text-gray-500 text-xs">
                          {new Date(order.created_at).toLocaleDateString('fr-FR', {
                            day: 'numeric', month: 'long', year: 'numeric',
                          })}
                        </p>
                      </div>
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${config.color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {config.label}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-gray-800">
                      <div className="text-sm text-gray-400">
                        {order.shipping_address?.firstName} {order.shipping_address?.lastName}
                        {order.shipping_address?.city && <span className="text-gray-600"> — {order.shipping_address.city}</span>}
                      </div>
                      <span className="text-green-400 font-bold">{formatPrice(order.total)}</span>
                    </div>
                  </div>
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
