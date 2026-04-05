'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import {
  Package,
  Search,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  ArrowUpDown,
  Loader2,
} from 'lucide-react'

interface InventoryProduct {
  id: string
  name: string
  image_url: string
  stock: number | null
  inventory: number
  isActive: boolean | null
  categories?: { name: string } | null
}

type SortDir = 'asc' | 'desc'
type StatusFilter = 'all' | 'in_stock' | 'low_stock' | 'out_of_stock'

export default function AdminInventory() {
  const [products, setProducts] = useState<InventoryProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  useEffect(() => {
    supabase
      .from('products')
      .select('id, name, image_url, stock, inventory, isActive, categories(name)')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setProducts((data || []) as unknown as InventoryProduct[])
        setLoading(false)
      })
  }, [])

  const getStock = (p: InventoryProduct) => p.stock ?? p.inventory ?? 0

  const getStatus = (stock: number) => {
    if (stock === 0) return { label: 'Rupture', color: 'text-red-400 bg-red-400/10', icon: XCircle }
    if (stock < 10) return { label: 'Stock faible', color: 'text-yellow-400 bg-yellow-400/10', icon: AlertTriangle }
    return { label: 'En stock', color: 'text-green-400 bg-green-400/10', icon: CheckCircle2 }
  }

  const filtered = products
    .filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
    .filter(p => {
      const stock = getStock(p)
      if (statusFilter === 'in_stock') return stock >= 10
      if (statusFilter === 'low_stock') return stock > 0 && stock < 10
      if (statusFilter === 'out_of_stock') return stock === 0
      return true
    })
    .sort((a, b) => {
      const diff = getStock(a) - getStock(b)
      return sortDir === 'asc' ? diff : -diff
    })

  const totalProducts = products.length
  const outOfStock = products.filter(p => getStock(p) === 0).length
  const lowStock = products.filter(p => { const s = getStock(p); return s > 0 && s < 10 }).length

  const filterTabs: { key: StatusFilter; label: string }[] = [
    { key: 'all', label: 'Tous' },
    { key: 'in_stock', label: 'En stock' },
    { key: 'low_stock', label: 'Stock faible' },
    { key: 'out_of_stock', label: 'Rupture' },
  ]

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-black text-white sm:text-3xl">Inventaire</h1>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-green-400 animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header with inline badges */}
      <div>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-black text-white sm:text-3xl">Inventaire</h1>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-400/10 text-blue-400">
              {totalProducts} total
            </span>
            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-red-400/10 text-red-400">
              {outOfStock} rupture
            </span>
            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-400/10 text-yellow-400">
              {lowStock} stock faible
            </span>
          </div>
        </div>
        <p className="text-gray-500 text-sm mt-1">Gestion des niveaux de stock</p>
      </div>

      {/* Search & Sort */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un produit..."
            className="w-full bg-[#111827] border border-gray-800 rounded-lg pl-10 pr-4 py-3 text-white text-sm outline-none focus:border-green-500"
          />
        </div>
        <button
          onClick={() => setSortDir(prev => prev === 'asc' ? 'desc' : 'asc')}
          className="flex items-center gap-2 bg-[#111827] border border-gray-800 rounded-lg px-4 py-3 text-gray-400 hover:text-white text-sm transition-colors"
        >
          <ArrowUpDown className="w-4 h-4" />
          Stock {sortDir === 'asc' ? 'croissant' : 'decroissant'}
        </button>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {filterTabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              statusFilter === tab.key
                ? 'bg-green-400/20 text-green-400'
                : 'bg-[#111827] text-gray-400 hover:text-white border border-gray-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-[#111827] border border-gray-800 rounded-xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-8 text-center">
            <Package className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500">Aucun produit trouve</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px]">
            <thead>
              <tr className="border-b border-gray-800 text-left">
                <th className="px-4 py-3 text-xs text-gray-500 font-medium">Produit</th>
                <th className="px-4 py-3 text-xs text-gray-500 font-medium">Categorie</th>
                <th className="px-4 py-3 text-xs text-gray-500 font-medium">Stock</th>
                <th className="px-4 py-3 text-xs text-gray-500 font-medium">Statut</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(product => {
                const stock = getStock(product)
                const status = getStatus(stock)
                const StatusIcon = status.icon
                return (
                  <tr key={product.id} className="border-b border-gray-800/50 hover:bg-gray-800/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-gray-900 flex-shrink-0">
                          <Image src={product.image_url} alt="" fill className="object-cover" sizes="40px" />
                        </div>
                        <span className="text-white text-sm font-medium truncate max-w-[250px]">{product.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-sm">
                      {product.categories?.name || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-sm font-bold ${stock === 0 ? 'text-red-400' : stock < 10 ? 'text-yellow-400' : 'text-green-400'}`}>
                        {stock}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status.color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {status.label}
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
