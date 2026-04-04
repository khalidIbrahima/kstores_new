'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle2, Package, ShoppingBag, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatPrice } from '@/lib/utils'

interface OrderSummary {
  id: string
  total: number
  status: string
  created_at: string
}

function SuccessContent() {
  const searchParams = useSearchParams()
  const orderId = searchParams.get('orderId')
  const [order, setOrder] = useState<OrderSummary | null>(null)
  const [loading, setLoading] = useState(!!orderId)

  useEffect(() => {
    if (!orderId) return

    const fetchOrder = async () => {
      const { data } = await supabase
        .from('orders')
        .select('id, total, status, created_at')
        .eq('id', orderId)
        .single()

      if (data) setOrder(data as OrderSummary)
      setLoading(false)
    }

    fetchOrder()
  }, [orderId])

  return (
    <div className="max-w-2xl mx-auto px-4 py-20 text-center">
      <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-8">
        <CheckCircle2 className="w-14 h-14 text-green-400" />
      </div>

      <h1 className="text-3xl sm:text-4xl font-black text-white mb-3">
        Paiement <span className="text-green-400">reussi !</span>
      </h1>

      <p className="text-gray-400 max-w-md mx-auto mb-8">
        Merci pour votre achat ! Votre commande a bien ete enregistree et sera traitee dans les plus brefs delais.
      </p>

      {loading && (
        <div className="mb-8">
          <Loader2 className="w-6 h-6 text-green-400 animate-spin mx-auto" />
        </div>
      )}

      {order && (
        <div className="bg-[#111827] border border-gray-800 rounded-xl p-6 mb-8 text-left">
          <h2 className="text-white font-bold text-lg mb-4">Resume de la commande</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Commande</span>
              <span className="text-white font-mono">#{order.id.slice(0, 8)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Date</span>
              <span className="text-white">
                {new Date(order.created_at).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Statut</span>
              <span className="text-yellow-400">En attente</span>
            </div>
            <div className="border-t border-gray-700 pt-3 flex justify-between">
              <span className="text-white font-bold">Total</span>
              <span className="text-green-400 font-bold text-lg">{formatPrice(order.total)}</span>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
        <Link
          href="/orders"
          className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 text-black font-bold px-8 py-3 rounded-lg transition-colors"
        >
          <Package className="w-4 h-4" />
          Voir mes commandes
        </Link>
        <Link
          href="/products"
          className="inline-flex items-center gap-2 border border-gray-700 hover:border-gray-500 text-gray-300 px-8 py-3 rounded-lg transition-colors"
        >
          <ShoppingBag className="w-4 h-4" />
          Continuer les achats
        </Link>
      </div>
    </div>
  )
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-green-400 animate-spin" />
      </div>
    }>
      <SuccessContent />
    </Suspense>
  )
}
