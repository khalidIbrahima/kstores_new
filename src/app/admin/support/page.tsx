'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { formatPrice } from '@/lib/utils'
import {
  HeadphonesIcon,
  ShoppingCart,
  Clock,
  MessageSquare,
  ExternalLink,
  Mail,
  Loader2,
  Phone,
} from 'lucide-react'

interface PendingOrder {
  id: string
  created_at: string
  status: string
  total: number
  shipping_address: {
    firstName?: string
    lastName?: string
    email?: string
    phone?: string
  }
}

interface ContactMessage {
  id: string
  name: string
  email: string
  message: string
  created_at: string
}

export default function AdminSupport() {
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([])
  const [messages, setMessages] = useState<ContactMessage[]>([])
  const [ordersToday, setOrdersToday] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      // Fetch pending orders
      const { data: pendingData } = await supabase
        .from('orders')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(10)

      setPendingOrders((pendingData || []) as PendingOrder[])

      // Count today's orders
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)
      const { count } = await supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', todayStart.toISOString())

      setOrdersToday(count || 0)

      // Try fetching contact messages
      const { data: msgData, error: msgError } = await supabase
        .from('contact_messages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5)

      if (!msgError && msgData) {
        setMessages(msgData as ContactMessage[])
      }

      setLoading(false)
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-black text-white">Support</h1>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-green-400 animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header row: title + stat badges + quick link buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-black text-white">Support</h1>
            <p className="text-gray-500 text-xs mt-0.5">Gestion du support client</p>
          </div>
          {/* Inline stat badges */}
          <div className="hidden sm:flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-yellow-400/10 text-yellow-400 text-xs font-medium">
              <Clock className="w-3 h-3" />
              {pendingOrders.length} en attente
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-400/10 text-green-400 text-xs font-medium">
              <ShoppingCart className="w-3 h-3" />
              {ordersToday} aujourd&apos;hui
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-400/10 text-blue-400 text-xs font-medium">
              <MessageSquare className="w-3 h-3" />
              {messages.length} message{messages.length > 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Quick link icon buttons */}
        <div className="flex items-center gap-2">
          <a
            href="https://wa.me/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-400/10 border border-green-500/20 hover:bg-green-400/20 transition-colors text-green-400 text-xs font-medium"
            title="WhatsApp Admin"
          >
            <Phone className="w-3.5 h-3.5" />
            <span className="hidden md:inline">WhatsApp</span>
            <ExternalLink className="w-3 h-3 opacity-50" />
          </a>
          <a
            href="mailto:admin@kapitalstores.com"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-400/10 border border-blue-500/20 hover:bg-blue-400/20 transition-colors text-blue-400 text-xs font-medium"
            title="Email Admin"
          >
            <Mail className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Email</span>
            <ExternalLink className="w-3 h-3 opacity-50" />
          </a>
        </div>
      </div>

      {/* Mobile-only stat badges (visible below sm) */}
      <div className="flex sm:hidden items-center gap-2 flex-wrap">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-yellow-400/10 text-yellow-400 text-xs font-medium">
          <Clock className="w-3 h-3" />
          {pendingOrders.length} en attente
        </span>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-400/10 text-green-400 text-xs font-medium">
          <ShoppingCart className="w-3 h-3" />
          {ordersToday} aujourd&apos;hui
        </span>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-400/10 text-blue-400 text-xs font-medium">
          <MessageSquare className="w-3 h-3" />
          {messages.length} message{messages.length > 1 ? 's' : ''}
        </span>
      </div>

      {/* Main 2-column grid: Pending Orders + Messages */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Pending Orders */}
        <div className="bg-[#111827] border border-gray-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-yellow-400" />
              <h2 className="text-white font-bold text-sm">Commandes en attente</h2>
            </div>
            <Link href="/admin/orders" className="text-green-400 hover:text-green-300 text-xs">
              Voir tout
            </Link>
          </div>

          {pendingOrders.length === 0 ? (
            <div className="text-center py-8">
              <ShoppingCart className="w-10 h-10 text-gray-700 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">Aucune commande en attente</p>
            </div>
          ) : (
            <div className="space-y-1">
              {pendingOrders.map(order => (
                <Link
                  key={order.id}
                  href={`/admin/orders/${order.id}`}
                  className="flex items-center justify-between p-2.5 rounded-lg hover:bg-gray-800/50 transition-colors"
                >
                  <div>
                    <p className="text-white text-sm font-medium">
                      {order.shipping_address?.firstName} {order.shipping_address?.lastName}
                    </p>
                    <p className="text-gray-500 text-xs">
                      {new Date(order.created_at).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-green-400 font-bold text-sm">{formatPrice(order.total)}</p>
                    <span className="text-yellow-400 text-xs">En attente</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Contact Messages */}
        <div className="bg-[#111827] border border-gray-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare className="w-4 h-4 text-blue-400" />
            <h2 className="text-white font-bold text-sm">Messages recents</h2>
          </div>

          {messages.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="w-10 h-10 text-gray-700 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">Aucun message</p>
              <p className="text-gray-600 text-xs mt-1">
                Les messages du formulaire de contact apparaitront ici
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {messages.map(msg => (
                <div key={msg.id} className="p-2.5 bg-gray-800/30 rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-white text-sm font-medium">{msg.name}</p>
                    <span className="text-gray-500 text-xs">
                      {new Date(msg.created_at).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                  <p className="text-gray-500 text-xs mb-1">{msg.email}</p>
                  <p className="text-gray-400 text-sm line-clamp-2">{msg.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
