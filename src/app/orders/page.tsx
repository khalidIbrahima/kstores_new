'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { formatPrice } from '@/lib/utils'
import Pagination from '@/components/Pagination'
import {
  Package,
  Loader2,
  Clock,
  CheckCircle2,
  Truck,
  XCircle,
  ChevronRight,
} from 'lucide-react'

interface OrderItem {
  id: string
  quantity: number
  price: number
  products: { name: string; image_url: string } | null
}

interface Order {
  id: string
  created_at: string
  status: string
  total: number
  shipping_address: {
    firstName?: string
    lastName?: string
    city?: string
  }
  items?: OrderItem[]
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending: { label: 'En attente', color: 'text-yellow-400 bg-yellow-400/10', icon: Clock },
  confirmed: { label: 'Confirmée', color: 'text-blue-400 bg-blue-400/10', icon: CheckCircle2 },
  shipped: { label: 'Expédiée', color: 'text-purple-400 bg-purple-400/10', icon: Truck },
  delivered: { label: 'Livrée', color: 'text-green-400 bg-green-400/10', icon: CheckCircle2 },
  cancelled: { label: 'Annulée', color: 'text-red-400 bg-red-400/10', icon: XCircle },
}

export default function OrdersPage() {
  const { isAuthenticated, profile, loading: authLoading } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const ITEMS_PER_PAGE = 8

  useEffect(() => {
    if (authLoading) return
    if (!profile?.id) { setLoading(false); return }

    const fetchOrders = async () => {
      const { data } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })

      const orderList = (data || []) as Order[]

      // Fetch items for each order
      if (orderList.length > 0) {
        const orderIds = orderList.map(o => o.id)
        const { data: items } = await supabase
          .from('order_items')
          .select('*, products(name, image_url)')
          .in('order_id', orderIds)

        const itemsByOrder: Record<string, OrderItem[]> = {}
        ;(items || []).forEach((item: OrderItem & { order_id: string }) => {
          if (!itemsByOrder[item.order_id]) itemsByOrder[item.order_id] = []
          itemsByOrder[item.order_id].push(item)
        })

        orderList.forEach(o => { o.items = itemsByOrder[o.id] || [] })
      }

      setOrders(orderList)
      setLoading(false)
    }

    fetchOrders()
  }, [profile?.id, authLoading])

  if (authLoading || loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <Loader2 className="w-8 h-8 text-green-400 animate-spin mx-auto" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <Package className="w-16 h-16 text-gray-600 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-white mb-2">Mes commandes</h1>
        <p className="text-gray-500 mb-6">Connectez-vous pour voir vos commandes</p>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 text-black font-bold px-8 py-3 rounded-lg"
        >
          Se connecter
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-black italic text-white flex items-center gap-3">
          <Package className="w-8 h-8 text-green-400" />
          Mes <span className="text-green-400">Commandes</span>
        </h1>
        <p className="text-gray-500 text-sm mt-1">{orders.length} commande{orders.length > 1 ? 's' : ''}</p>
      </div>

      {orders.length === 0 ? (
        <div className="bg-[#111827] border border-gray-800 rounded-xl p-12 text-center">
          <Package className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 mb-4">Vous n&apos;avez pas encore de commandes</p>
          <Link
            href="/products"
            className="inline-flex bg-green-500 hover:bg-green-600 text-black font-bold px-6 py-3 rounded-lg"
          >
            Découvrir nos produits
          </Link>
        </div>
      ) : (
        <>
        <div className="space-y-4">
          {orders.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map(order => {
            const config = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending
            const StatusIcon = config.icon
            return (
              <div key={order.id} className="bg-[#111827] border border-gray-800 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-gray-500 text-xs font-mono">#{order.id.slice(0, 8)}</p>
                    <p className="text-gray-400 text-sm mt-0.5">
                      {new Date(order.created_at).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${config.color}`}>
                      <StatusIcon className="w-3 h-3" />
                      {config.label}
                    </span>
                    <span className="text-green-400 font-bold">{formatPrice(order.total)}</span>
                  </div>
                </div>

                {/* Order Items Preview */}
                {order.items && order.items.length > 0 && (
                  <div className="flex items-center gap-3 pt-4 border-t border-gray-800">
                    <div className="flex -space-x-2">
                      {order.items.slice(0, 4).map(item => (
                        <div key={item.id} className="relative w-10 h-10 rounded-lg overflow-hidden border-2 border-[#111827] bg-gray-900">
                          {item.products?.image_url && (
                            <Image src={item.products.image_url} alt="" fill className="object-cover" sizes="40px" />
                          )}
                        </div>
                      ))}
                      {order.items.length > 4 && (
                        <div className="w-10 h-10 rounded-lg bg-gray-800 border-2 border-[#111827] flex items-center justify-center text-gray-400 text-xs font-bold">
                          +{order.items.length - 4}
                        </div>
                      )}
                    </div>
                    <p className="text-gray-500 text-xs flex-1">
                      {order.items.length} article{order.items.length > 1 ? 's' : ''}
                    </p>
                    <ChevronRight className="w-4 h-4 text-gray-600" />
                  </div>
                )}
              </div>
            )
          })}
        </div>
        <Pagination
          currentPage={currentPage}
          totalPages={Math.ceil(orders.length / ITEMS_PER_PAGE)}
          onPageChange={p => { setCurrentPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
        />
        </>
      )}
    </div>
  )
}
