'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import {
  Package,
  Loader2,
  CheckCircle2,
  Clock,
  Truck,
  XCircle,
  MapPin,
  ShoppingBag,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatPrice } from '@/lib/utils'

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
    address?: string
    city?: string
    country?: string
    phone?: string
    email?: string
  } | null
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending: { label: 'En attente', color: 'text-yellow-400 bg-yellow-400/10', icon: Clock },
  processing: { label: 'Confirmee', color: 'text-blue-400 bg-blue-400/10', icon: CheckCircle2 },
  shipped: { label: 'Expediee', color: 'text-purple-400 bg-purple-400/10', icon: Truck },
  delivered: { label: 'Livree', color: 'text-green-400 bg-green-400/10', icon: CheckCircle2 },
  cancelled: { label: 'Annulee', color: 'text-red-400 bg-red-400/10', icon: XCircle },
}

export default function OrderConfirmationPage() {
  const params = useParams()
  const orderId = params.orderId as string

  const [order, setOrder] = useState<Order | null>(null)
  const [items, setItems] = useState<OrderItem[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!orderId) return

    const fetchOrder = async () => {
      const { data: orderData } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single()

      if (!orderData) {
        setNotFound(true)
        setLoading(false)
        return
      }

      setOrder(orderData as Order)

      const { data: orderItems } = await supabase
        .from('order_items')
        .select('*, products(name, image_url)')
        .eq('order_id', orderId)

      setItems((orderItems || []) as OrderItem[])
      setLoading(false)
    }

    fetchOrder()
  }, [orderId])

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <Loader2 className="w-8 h-8 text-green-400 animate-spin mx-auto" />
      </div>
    )
  }

  if (notFound || !order) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <Package className="w-16 h-16 text-gray-600 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-white mb-2">Commande introuvable</h1>
        <p className="text-gray-500 mb-6">
          Nous n&apos;avons pas pu trouver cette commande. Verifiez le lien ou consultez vos commandes.
        </p>
        <Link
          href="/orders"
          className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 text-black font-bold px-8 py-3 rounded-lg"
        >
          Voir mes commandes
        </Link>
      </div>
    )
  }

  const config = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending
  const StatusIcon = config.icon
  const address = order.shipping_address

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-black italic text-white flex items-center gap-3">
          <Package className="w-8 h-8 text-green-400" />
          Confirmation de <span className="text-green-400">commande</span>
        </h1>
        <p className="text-gray-500 text-sm mt-1 font-mono">#{order.id.slice(0, 8)}</p>
      </div>

      {/* Status */}
      <div className="bg-[#111827] border border-gray-800 rounded-xl p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-sm">Statut de la commande</p>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium mt-2 ${config.color}`}>
              <StatusIcon className="w-4 h-4" />
              {config.label}
            </span>
          </div>
          <div className="text-right">
            <p className="text-gray-400 text-sm">Date</p>
            <p className="text-white mt-2">
              {new Date(order.created_at).toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </p>
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="bg-[#111827] border border-gray-800 rounded-xl p-6 mb-6">
        <h2 className="text-white font-bold text-lg mb-4">
          Articles ({items.length})
        </h2>
        <div className="space-y-4">
          {items.map(item => (
            <div key={item.id} className="flex items-center gap-4">
              <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-gray-900 flex-shrink-0">
                {item.products?.image_url && (
                  <Image
                    src={item.products.image_url}
                    alt={item.products?.name || ''}
                    fill
                    className="object-cover"
                    sizes="64px"
                  />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium truncate">
                  {item.products?.name || 'Produit'}
                </p>
                <p className="text-gray-500 text-sm">Quantite : {item.quantity}</p>
              </div>
              <span className="text-green-400 font-bold">
                {formatPrice(item.price * item.quantity)}
              </span>
            </div>
          ))}
        </div>

        <div className="border-t border-gray-700 mt-4 pt-4">
          <div className="flex justify-between">
            <span className="text-white font-bold text-lg">Total</span>
            <span className="text-green-400 font-bold text-xl">{formatPrice(order.total)}</span>
          </div>
        </div>
      </div>

      {/* Shipping Address */}
      {address && (
        <div className="bg-[#111827] border border-gray-800 rounded-xl p-6 mb-6">
          <h2 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-green-400" />
            Adresse de livraison
          </h2>
          <div className="text-gray-400 text-sm space-y-1">
            {(address.firstName || address.lastName) && (
              <p className="text-white font-medium">
                {address.firstName} {address.lastName}
              </p>
            )}
            {address.address && <p>{address.address}</p>}
            {(address.city || address.country) && (
              <p>{[address.city, address.country].filter(Boolean).join(', ')}</p>
            )}
            {address.phone && <p>{address.phone}</p>}
            {address.email && <p>{address.email}</p>}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Link
          href="/orders"
          className="inline-flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-black font-bold px-8 py-3 rounded-lg transition-colors"
        >
          <Package className="w-4 h-4" />
          Toutes mes commandes
        </Link>
        <Link
          href="/products"
          className="inline-flex items-center justify-center gap-2 border border-gray-700 hover:border-gray-500 text-gray-300 px-8 py-3 rounded-lg transition-colors"
        >
          <ShoppingBag className="w-4 h-4" />
          Continuer les achats
        </Link>
      </div>
    </div>
  )
}
