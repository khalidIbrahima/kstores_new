'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { formatPrice } from '@/lib/utils'
import {
  ArrowLeft, Loader2, Package, Clock, CheckCircle2, Truck, XCircle,
  MapPin, Phone, Mail, Calendar, Hash, ShoppingCart, FileText,
} from 'lucide-react'
import { generateInvoiceHtml } from '@/lib/invoice'

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
    name?: string
    firstName?: string
    lastName?: string
    email?: string
    phone?: string
    address?: string
    city?: string
    country?: string
    _meta?: { shipping_fee?: number }
  }
}

const STATUSES = [
  { value: 'pending', label: 'Recue', icon: Clock, color: '#facc15' },
  { value: 'processing', label: 'Confirmee', icon: CheckCircle2, color: '#60a5fa' },
  { value: 'shipped', label: 'Expediee', icon: Truck, color: '#a78bfa' },
  { value: 'delivered', label: 'Livree', icon: CheckCircle2, color: '#22c55e' },
]

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending: { label: 'En attente', color: 'text-yellow-400 bg-yellow-400/10', icon: Clock },
  processing: { label: 'Confirmee', color: 'text-blue-400 bg-blue-400/10', icon: CheckCircle2 },
  shipped: { label: 'Expediee', color: 'text-purple-400 bg-purple-400/10', icon: Truck },
  delivered: { label: 'Livree', color: 'text-green-400 bg-green-400/10', icon: CheckCircle2 },
  cancelled: { label: 'Annulee', color: 'text-red-400 bg-red-400/10', icon: XCircle },
}

export default function TrackOrderDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [order, setOrder] = useState<Order | null>(null)
  const [items, setItems] = useState<OrderItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetch = async () => {
      const [orderRes, itemsRes] = await Promise.all([
        supabase.from('orders').select('*').eq('id', id).single(),
        supabase.from('order_items').select('*, products(name, image_url)').eq('order_id', id),
      ])
      if (orderRes.data) setOrder(orderRes.data as Order)
      if (itemsRes.data) setItems(itemsRes.data as OrderItem[])
      setLoading(false)
    }
    fetch()
  }, [id])

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <Loader2 className="w-8 h-8 text-green-400 animate-spin mx-auto" />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <Package className="w-16 h-16 text-gray-600 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-white mb-2">Commande introuvable</h1>
        <p className="text-gray-500 text-sm mb-6">Verifiez le numero de commande</p>
        <Link href="/orders/track" className="text-green-400 hover:text-green-300 text-sm">
          Retour au suivi
        </Link>
      </div>
    )
  }

  const addr = order.shipping_address || {}
  const customerName = addr.name || [addr.firstName, addr.lastName].filter(Boolean).join(' ') || 'Client'
  const config = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending
  const StatusIcon = config.icon
  const isCancelled = order.status === 'cancelled'
  const currentIdx = STATUSES.findIndex(s => s.value === order.status)

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back */}
      <Link href="/orders/track" className="inline-flex items-center gap-1.5 text-gray-400 hover:text-white text-sm mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Retour au suivi
      </Link>

      {/* Header */}
      <div className="bg-[#111827] border border-gray-800 rounded-xl p-5 sm:p-6 mb-4">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-green-400 font-mono font-bold text-lg flex items-center gap-2">
              <Hash className="w-4 h-4" />{order.id.slice(0, 8).toUpperCase()}
            </p>
            <p className="text-gray-500 text-xs mt-1 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {new Date(order.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${config.color}`}>
            <StatusIcon className="w-3.5 h-3.5" />
            {config.label}
          </span>
        </div>

        {/* Progress tracker */}
        {!isCancelled && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              {STATUSES.map((step, i) => {
                const done = i <= currentIdx
                const StepIcon = step.icon
                return (
                  <div key={step.value} className="flex flex-col items-center" style={{ width: `${100 / STATUSES.length}%` }}>
                    <div
                      className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center mb-1.5 transition-all"
                      style={{ backgroundColor: done ? step.color : '#1a2332' }}
                    >
                      <StepIcon className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: done ? '#000' : '#6b7280' }} />
                    </div>
                    <span className={`text-[10px] sm:text-xs font-medium text-center ${done ? 'text-white' : 'text-gray-600'}`}>
                      {step.label}
                    </span>
                  </div>
                )
              })}
            </div>
            {/* Progress bar */}
            <div className="mx-6 sm:mx-8 h-1.5 bg-[#1a2332] rounded-full overflow-hidden mt-1">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${currentIdx <= 0 ? 5 : Math.round((currentIdx / (STATUSES.length - 1)) * 100)}%`,
                  background: 'linear-gradient(90deg, #16a34a, #22c55e)',
                }}
              />
            </div>
          </div>
        )}

        {isCancelled && (
          <div className="mt-4 bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-center">
            <XCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
            <p className="text-red-400 font-bold text-sm">Commande annulee</p>
            <p className="text-gray-500 text-xs mt-1">Contactez-nous pour plus d&apos;informations</p>
          </div>
        )}
      </div>

      {/* Items */}
      <div className="bg-[#111827] border border-gray-800 rounded-xl p-5 sm:p-6 mb-4">
        <h2 className="text-white font-bold text-sm mb-4 flex items-center gap-2">
          <ShoppingCart className="w-4 h-4 text-green-400" /> Articles ({items.length})
        </h2>
        {items.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-4">Aucun article</p>
        ) : (
          <div className="space-y-3">
            {items.map(item => (
              <div key={item.id} className="flex items-center gap-3">
                <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-gray-900 flex-shrink-0 border border-gray-700">
                  {item.products?.image_url && (
                    <Image src={item.products.image_url} alt="" fill className="object-cover" sizes="56px" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{item.products?.name || 'Produit'}</p>
                  <p className="text-gray-500 text-xs">Qte: {item.quantity} x {formatPrice(item.price)}</p>
                </div>
                <span className="text-green-400 font-bold text-sm flex-shrink-0">{formatPrice(item.price * item.quantity)}</span>
              </div>
            ))}
          </div>
        )}

        {/* Total */}
        <div className="mt-4 pt-4 border-t border-gray-800 flex items-center justify-between">
          <span className="text-white font-bold">Total</span>
          <span className="text-green-400 font-bold text-xl">{formatPrice(order.total)}</span>
        </div>

        {/* Invoice download */}
        <button
          onClick={() => {
            const shippingFee = Number(order.shipping_address?._meta?.shipping_fee) || 0
            const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0)
            const html = generateInvoiceHtml({
              id: order.id,
              date: order.created_at,
              firstName: addr.firstName || addr.name || '',
              lastName: addr.lastName || '',
              email: addr.email || '',
              phone: addr.phone,
              address: addr.address,
              city: addr.city,
              items: items.map(i => ({ name: i.products?.name || 'Produit', quantity: i.quantity, price: i.price })),
              subtotal,
              shipping: shippingFee,
              total: order.total,
            })
            const win = window.open('', '_blank')
            if (win) { win.document.write(html); win.document.close() }
          }}
          className="mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm font-medium hover:bg-gray-700 hover:border-gray-600 transition-colors"
        >
          <FileText className="w-4 h-4 text-green-400" />
          Telecharger ma facture
        </button>
      </div>

      {/* Customer & Address */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div className="bg-[#111827] border border-gray-800 rounded-xl p-5">
          <h2 className="text-white font-bold text-sm mb-3">Coordonnees</h2>
          <div className="space-y-2">
            <p className="text-white text-sm font-medium">{customerName}</p>
            {addr.email && (
              <p className="text-gray-400 text-xs flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-gray-500" /> {addr.email}
              </p>
            )}
            {addr.phone && (
              <p className="text-gray-400 text-xs flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-gray-500" /> {addr.phone}
              </p>
            )}
          </div>
        </div>
        <div className="bg-[#111827] border border-gray-800 rounded-xl p-5">
          <h2 className="text-white font-bold text-sm mb-3">Livraison</h2>
          <div className="flex items-start gap-2 text-gray-400 text-sm">
            <MapPin className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
            <div>
              {addr.address && <p>{addr.address}</p>}
              {addr.city && <p>{addr.city}</p>}
              {addr.country && <p className="text-gray-600">{addr.country}</p>}
              {!addr.address && !addr.city && <p className="text-gray-600">Non renseignee</p>}
            </div>
          </div>
        </div>
      </div>

      {/* Help */}
      <div className="bg-[#111827] border border-gray-800 rounded-xl p-5 text-center">
        <p className="text-gray-400 text-sm mb-3">Un probleme avec votre commande ?</p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
          <Link href="/contact" className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-green-500 hover:bg-green-600 text-black font-bold text-sm transition-colors">
            <Mail className="w-4 h-4" /> Nous contacter
          </Link>
          <a href="https://wa.me/221761800649" target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg border border-gray-700 hover:border-gray-500 text-gray-300 text-sm transition-colors">
            <Phone className="w-4 h-4" /> WhatsApp
          </a>
        </div>
      </div>
    </div>
  )
}
