'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { formatPrice } from '@/lib/utils'
import {
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  CreditCard,
} from 'lucide-react'

interface Payment {
  id: string
  orderId: string
  status: string
  provider: string
  amount: number
  currency: string
  created_at: string
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending: { label: 'En attente', color: 'text-yellow-400 bg-yellow-400/10', icon: Clock },
  completed: { label: 'Complete', color: 'text-green-400 bg-green-400/10', icon: CheckCircle2 },
  failed: { label: 'Echoue', color: 'text-red-400 bg-red-400/10', icon: XCircle },
}

export default function AdminPayments() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [tableExists, setTableExists] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    supabase
      .from('payments')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error && error.message.includes('relation')) {
          setTableExists(false)
        } else {
          setPayments((data || []) as Payment[])
        }
        setLoading(false)
      })
  }, [])

  const filtered = payments.filter(p =>
    statusFilter === 'all' || p.status === statusFilter
  )

  const totalRevenue = payments
    .filter(p => p.status === 'completed')
    .reduce((sum, p) => sum + (p.amount || 0), 0)

  const pendingCount = payments.filter(p => p.status === 'pending').length

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-black text-white">Paiements</h1>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-green-400 animate-spin" />
        </div>
      </div>
    )
  }

  if (!tableExists) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-black text-white sm:text-3xl">Paiements</h1>
          <p className="text-gray-500 text-sm mt-1">Suivi des transactions</p>
        </div>
        <div className="bg-[#111827] border border-gray-800 rounded-xl p-12 text-center">
          <CreditCard className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h2 className="text-white font-bold text-lg mb-2">Table non configuree</h2>
          <p className="text-gray-500 text-sm max-w-md mx-auto">
            La table <code className="text-green-400 bg-green-400/10 px-1.5 py-0.5 rounded">payments</code> n&apos;existe pas encore dans votre base de donnees Supabase. Creez-la pour suivre vos paiements.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header with inline badges */}
      <div>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-black text-white sm:text-3xl">Paiements</h1>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-400/10 text-green-400">
              {formatPrice(totalRevenue)} revenus
            </span>
            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-400/10 text-blue-400">
              {payments.length} transaction{payments.length > 1 ? 's' : ''}
            </span>
            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-400/10 text-yellow-400">
              {pendingCount} en attente
            </span>
          </div>
        </div>
        <p className="text-gray-500 text-sm mt-1">Suivi des transactions</p>
      </div>

      {/* Filter */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="w-full rounded-lg border border-gray-800 bg-[#111827] px-4 py-3 text-sm text-white outline-none focus:border-green-500 sm:w-auto"
        >
          <option value="all">Tous les statuts</option>
          {Object.entries(STATUS_CONFIG).map(([key, config]) => (
            <option key={key} value={key}>{config.label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-[#111827] border border-gray-800 rounded-xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-8 text-center">
            <CreditCard className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500">Aucun paiement trouve</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b border-gray-800 text-left">
                <th className="px-4 py-3 text-xs text-gray-500 font-medium">Date</th>
                <th className="px-4 py-3 text-xs text-gray-500 font-medium">Commande</th>
                <th className="px-4 py-3 text-xs text-gray-500 font-medium">Montant</th>
                <th className="px-4 py-3 text-xs text-gray-500 font-medium">Fournisseur</th>
                <th className="px-4 py-3 text-xs text-gray-500 font-medium">Statut</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(payment => {
                const config = STATUS_CONFIG[payment.status] || STATUS_CONFIG.pending
                const StatusIcon = config.icon
                return (
                  <tr key={payment.id} className="border-b border-gray-800/50 hover:bg-gray-800/50">
                    <td className="px-4 py-3 text-gray-400 text-sm">
                      {new Date(payment.created_at).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/orders/${payment.orderId}`}
                        className="text-green-400 hover:text-green-300 text-sm font-mono"
                      >
                        {payment.orderId?.slice(0, 8)}...
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-white font-bold text-sm">
                        {formatPrice(payment.amount, payment.currency || 'XOF')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2.5 py-1 rounded-full bg-purple-400/10 text-purple-400 font-medium">
                        {payment.provider || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {config.label}
                      </span>
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
