'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { adminFetch } from '@/lib/admin-fetch'
import { formatPrice } from '@/lib/utils'
import { Product, Category } from '@/lib/types'
import {
  Plus, Search, Trash2, Edit3, Eye, EyeOff, Tag, ChevronDown,
  ArrowUpDown, ArrowDown, ArrowUp, Package, Download, Filter, Loader2,
  CheckSquare, Square, AlertTriangle, MoreHorizontal, Copy, ExternalLink, Link2, X
} from 'lucide-react'
import Pagination from '@/components/Pagination'

const ITEMS_PER_PAGE = 15

type SortField = 'created_at' | 'name' | 'price' | 'stock'
type SortDir = 'asc' | 'desc'

export default function AdminProducts() {
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<'' | 'active' | 'inactive' | 'promo' | 'outofstock'>('')
  const [sortField, setSortField] = useState<SortField>('created_at')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [deleting, setDeleting] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [showImport, setShowImport] = useState(false)
  const [importUrl, setImportUrl] = useState('')
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!importUrl.trim()) return
    setImporting(true)
    setImportError(null)
    try {
      const res = await adminFetch('/api/admin/products/import', {
        method: 'POST',
        body: JSON.stringify({ url: importUrl.trim() }),
      })
      const json = await res.json() as { id?: string; error?: string }
      if (!res.ok) {
        setImportError(json.error || `Erreur ${res.status}`)
        return
      }
      setShowImport(false)
      setImportUrl('')
      if (json.id) router.push(`/admin/products/${json.id}`)
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Erreur reseau')
    } finally {
      setImporting(false)
    }
  }

  useEffect(() => {
    let active = true

    const load = async () => {
      const [prodRes, catRes] = await Promise.all([
        supabase.from('products').select('*, categories(name, slug)').order('created_at', { ascending: false }),
        supabase.from('categories').select('*').order('name'),
      ])

      if (!active) return

      setProducts((prodRes.data || []) as Product[])
      setCategories((catRes.data || []) as Category[])
      setLoading(false)
    }

    void load()

    return () => {
      active = false
    }
  }, [])

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce produit ?')) return
    setDeleting(id)
    const res = await adminFetch(`/api/admin/products/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setProducts(prev => prev.filter(p => p.id !== id))
      setSelected(prev => { const n = new Set(prev); n.delete(id); return n })
    } else {
      const err = await res.json().catch(() => ({})) as { error?: string }
      alert(err.error || `Erreur ${res.status}`)
    }
    setDeleting(null)
  }

  const handleBulkDelete = async () => {
    if (selected.size === 0) return
    if (!confirm(`Supprimer ${selected.size} produit(s) ?`)) return
    setBulkDeleting(true)
    const ids = Array.from(selected)
    const res = await adminFetch('/api/admin/products/bulk', {
      method: 'POST',
      body: JSON.stringify({ op: 'delete', ids }),
    })
    if (res.ok) {
      setProducts(prev => prev.filter(p => !selected.has(p.id)))
      setSelected(new Set())
    } else {
      const err = await res.json().catch(() => ({})) as { error?: string }
      alert(err.error || `Erreur ${res.status}`)
    }
    setBulkDeleting(false)
  }

  const handleBulkToggle = async (active: boolean) => {
    if (selected.size === 0) return
    const ids = Array.from(selected)
    const res = await adminFetch('/api/admin/products/bulk', {
      method: 'POST',
      body: JSON.stringify({ op: 'update', ids, patch: { isActive: active } }),
    })
    if (res.ok) {
      setProducts(prev => prev.map(p => selected.has(p.id) ? { ...p, isActive: active } : p))
      setSelected(new Set())
    } else {
      const err = await res.json().catch(() => ({})) as { error?: string }
      alert(err.error || `Erreur ${res.status}`)
    }
  }

  const toggleActive = async (product: Product) => {
    const newActive = !product.isActive
    const res = await adminFetch(`/api/admin/products/${product.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive: newActive }),
    })
    if (res.ok) {
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, isActive: newActive } : p))
    } else {
      const err = await res.json().catch(() => ({})) as { error?: string }
      alert(err.error || `Erreur ${res.status}`)
    }
  }

  const handleClone = async (product: Product) => {
    const res = await adminFetch(`/api/admin/products/${product.id}/clone`, { method: 'POST' })
    const json = await res.json().catch(() => ({})) as { product?: Product; error?: string }
    if (res.ok && json.product) {
      setProducts(prev => [json.product as Product, ...prev])
    } else {
      alert(json.error || `Erreur ${res.status}`)
    }
    setOpenMenu(null)
  }

  const exportCSV = () => {
    const rows = [['Nom', 'Categorie', 'Prix', 'Stock', 'Statut', 'Promo'].join(',')]
    filtered.forEach(p => {
      rows.push([
        `"${p.name}"`,
        p.categories?.name || '',
        String(p.price),
        String(p.stock ?? p.inventory ?? 0),
        p.isActive !== false ? 'Actif' : 'Inactif',
        p.promotion_active ? `-${p.promotion_percentage}%` : '',
      ].join(','))
    })
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `produits-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  // Filter & sort
  let filtered = products.filter(p => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false
    if (categoryFilter && p.category_id !== categoryFilter) return false
    if (statusFilter === 'active' && p.isActive === false) return false
    if (statusFilter === 'inactive' && p.isActive !== false) return false
    if (statusFilter === 'promo' && !p.promotion_active) return false
    if (statusFilter === 'outofstock' && (p.stock ?? p.inventory ?? 0) > 0) return false
    return true
  })

  filtered = [...filtered].sort((a, b) => {
    const dir = sortDir === 'asc' ? 1 : -1
    if (sortField === 'name') return dir * a.name.localeCompare(b.name)
    if (sortField === 'price') return dir * (a.price - b.price)
    if (sortField === 'stock') return dir * ((a.stock ?? a.inventory ?? 0) - (b.stock ?? b.inventory ?? 0))
    return dir * (new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
  })

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE)
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)

  const allSelected = paginated.length > 0 && paginated.every(p => selected.has(p.id))
  const toggleAll = () => {
    if (allSelected) {
      setSelected(prev => { const n = new Set(prev); paginated.forEach(p => n.delete(p.id)); return n })
    } else {
      setSelected(prev => { const n = new Set(prev); paginated.forEach(p => n.add(p.id)); return n })
    }
  }
  const toggleOne = (id: string) => {
    setSelected(prev => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 text-gray-600" />
    return sortDir === 'asc' ? <ArrowUp className="w-3 h-3 text-green-400" /> : <ArrowDown className="w-3 h-3 text-green-400" />
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('desc') }
  }

  // Stats
  const totalProducts = products.length
  const activeProducts = products.filter(p => p.isActive !== false).length
  const promoProducts = products.filter(p => p.promotion_active).length
  const outOfStock = products.filter(p => (p.stock ?? p.inventory ?? 0) === 0).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-white">Produits</h1>
          <p className="text-gray-500 text-sm mt-1">{totalProducts} produit{totalProducts > 1 ? 's' : ''} au total</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            onClick={exportCSV}
            className="flex items-center justify-center gap-1.5 rounded-lg border border-gray-700 px-3 py-2.5 text-sm text-gray-400 transition-colors hover:border-gray-500"
          >
            <Download className="w-4 h-4" />
            Exporter
          </button>
          <button
            onClick={() => setShowImport(true)}
            className="flex items-center justify-center gap-1.5 rounded-lg border border-gray-700 px-3 py-2.5 text-sm text-gray-400 transition-colors hover:border-gray-500"
          >
            <Link2 className="w-4 h-4" />
            Importer URL
          </button>
          <Link
            href="/admin/products/new"
            className="flex items-center justify-center gap-2 rounded-lg bg-green-500 px-4 py-2.5 text-sm font-bold text-black transition-colors hover:bg-green-600"
          >
            <Plus className="w-4 h-4" />
            Ajouter
          </Link>
        </div>
      </div>

      {showImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => !importing && setShowImport(false)}>
          <div
            className="w-full max-w-md rounded-xl border border-gray-800 bg-[#111827] p-6"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">Importer un produit Alibaba</h2>
              <button
                onClick={() => !importing && setShowImport(false)}
                className="text-gray-500 hover:text-white"
                disabled={importing}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleImport} className="space-y-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">URL du produit</label>
                <input
                  type="url"
                  value={importUrl}
                  onChange={e => setImportUrl(e.target.value)}
                  placeholder="https://www.alibaba.com/product-detail/..."
                  required
                  disabled={importing}
                  autoFocus
                  className="w-full rounded-lg border border-gray-800 bg-[#0b1220] px-3 py-2.5 text-sm text-white outline-none focus:border-green-500 disabled:opacity-50"
                />
              </div>
              {importError && (
                <p className="text-xs text-red-400 bg-red-500/10 rounded-lg px-3 py-2">{importError}</p>
              )}
              <p className="text-xs text-gray-500">
                Le produit sera cree en brouillon (inactif). Tu pourras l&apos;ajuster avant publication.
              </p>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowImport(false)}
                  disabled={importing}
                  className="px-4 py-2 text-sm text-gray-400 hover:text-white disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={importing || !importUrl.trim()}
                  className="flex items-center gap-2 rounded-lg bg-green-500 px-4 py-2 text-sm font-bold text-black hover:bg-green-600 disabled:opacity-50"
                >
                  {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
                  {importing ? 'Import en cours...' : 'Importer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Total', value: totalProducts, icon: Package, color: 'text-blue-400', bg: 'bg-blue-400/10' },
          { label: 'Actifs', value: activeProducts, icon: Eye, color: 'text-green-400', bg: 'bg-green-400/10' },
          { label: 'En promo', value: promoProducts, icon: Tag, color: 'text-orange-400', bg: 'bg-orange-400/10' },
          { label: 'Rupture', value: outOfStock, icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-400/10' },
        ].map(stat => (
          <div key={stat.label} className="bg-[#111827] border border-gray-800 rounded-xl p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg ${stat.bg} flex items-center justify-center`}>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <div>
              <p className="text-white text-xl font-bold">{stat.value}</p>
              <p className="text-gray-500 text-xs">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap">
        <div className="relative flex-1 min-w-0 sm:min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); setCurrentPage(1) }}
            placeholder="Rechercher un produit..."
            className="w-full bg-[#111827] border border-gray-800 rounded-lg pl-10 pr-4 py-2.5 text-white text-sm outline-none focus:border-green-500"
          />
        </div>
        <div className="relative w-full sm:w-auto">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <select
            value={categoryFilter}
            onChange={e => { setCategoryFilter(e.target.value); setCurrentPage(1) }}
            className="w-full appearance-none rounded-lg border border-gray-800 bg-[#111827] py-2.5 pl-10 pr-8 text-sm text-white outline-none focus:border-green-500 sm:w-auto"
          >
            <option value="">Toutes categories</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500 pointer-events-none" />
        </div>
        <div className="relative w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value as typeof statusFilter); setCurrentPage(1) }}
            className="w-full appearance-none rounded-lg border border-gray-800 bg-[#111827] px-4 py-2.5 pr-8 text-sm text-white outline-none focus:border-green-500 sm:w-auto"
          >
            <option value="">Tous statuts</option>
            <option value="active">Actifs</option>
            <option value="inactive">Inactifs</option>
            <option value="promo">En promo</option>
            <option value="outofstock">Rupture de stock</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500 pointer-events-none" />
        </div>
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="animate-fade-in flex flex-wrap items-center gap-3 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3">
          <span className="text-green-400 text-sm font-medium">{selected.size} selectionne(s)</span>
          <button onClick={() => handleBulkToggle(true)} className="text-xs text-gray-300 hover:text-white bg-gray-800 px-3 py-1.5 rounded-lg">
            Activer
          </button>
          <button onClick={() => handleBulkToggle(false)} className="text-xs text-gray-300 hover:text-white bg-gray-800 px-3 py-1.5 rounded-lg">
            Desactiver
          </button>
          <button
            onClick={handleBulkDelete}
            disabled={bulkDeleting}
            className="text-xs text-red-400 hover:text-red-300 bg-red-500/10 px-3 py-1.5 rounded-lg disabled:opacity-50"
          >
            {bulkDeleting ? 'Suppression...' : 'Supprimer'}
          </button>
          <button onClick={() => setSelected(new Set())} className="text-xs text-gray-500 hover:text-gray-300 sm:ml-auto">
            Tout deselectionner
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-[#111827] border border-gray-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 flex items-center justify-center gap-2 text-gray-500">
            <Loader2 className="w-5 h-5 animate-spin" /> Chargement...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Aucun produit trouve</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1120px]">
              <thead>
                <tr className="border-b border-gray-800 text-left">
                  <th className="px-4 py-3 w-10">
                    <button onClick={toggleAll} className="text-gray-500 hover:text-white">
                      {allSelected ? <CheckSquare className="w-4 h-4 text-green-400" /> : <Square className="w-4 h-4" />}
                    </button>
                  </th>
                  <th className="px-4 py-3">
                    <button onClick={() => handleSort('name')} className="flex items-center gap-1 text-xs text-gray-500 font-medium hover:text-white">
                      Produit {getSortIcon('name')}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-xs text-gray-500 font-medium">Categorie</th>
                  <th className="px-4 py-3">
                    <button onClick={() => handleSort('price')} className="flex items-center gap-1 text-xs text-gray-500 font-medium hover:text-white">
                      Prix {getSortIcon('price')}
                    </button>
                  </th>
                  <th className="px-4 py-3">
                    <button onClick={() => handleSort('stock')} className="flex items-center gap-1 text-xs text-gray-500 font-medium hover:text-white">
                      Stock {getSortIcon('stock')}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-xs text-gray-500 font-medium">Promo</th>
                  <th className="px-4 py-3 text-xs text-gray-500 font-medium">Statut</th>
                  <th className="px-4 py-3 text-xs text-gray-500 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map(product => {
                  const hasPromo = product.promotion_active && product.promotion_percentage
                  const stock = product.stock ?? product.inventory ?? 0
                  const isSelected = selected.has(product.id)

                  return (
                    <tr key={product.id} className={`border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors ${isSelected ? 'bg-green-500/5' : ''}`}>
                      <td className="px-4 py-3">
                        <button onClick={() => toggleOne(product.id)} className="text-gray-500 hover:text-white">
                          {isSelected ? <CheckSquare className="w-4 h-4 text-green-400" /> : <Square className="w-4 h-4" />}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/admin/products/${product.id}`} className="flex items-center gap-3 group">
                          <div className="relative w-11 h-11 rounded-lg overflow-hidden bg-gray-900 flex-shrink-0 border border-gray-700">
                            <Image src={product.image_url} alt="" fill className="object-cover" sizes="44px" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-white text-sm font-medium truncate max-w-[220px] group-hover:text-green-400 transition-colors">
                              {product.name}
                            </p>
                            {product.description && (
                              <p className="text-gray-600 text-xs truncate max-w-[220px]">{product.description}</p>
                            )}
                          </div>
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-gray-400 text-sm">{product.categories?.name || '—'}</span>
                      </td>
                      <td className="px-4 py-3">
                        {hasPromo ? (
                          <div>
                            <p className="text-green-400 text-sm font-bold">{formatPrice(product.price)}</p>
                            <p className="text-gray-600 text-xs line-through">{formatPrice(product.old_price)}</p>
                          </div>
                        ) : (
                          <p className="text-white text-sm font-medium">{formatPrice(product.price)}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-sm font-medium ${stock > 10 ? 'text-green-400' : stock > 0 ? 'text-yellow-400' : 'text-red-400'}`}>
                          {stock}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {hasPromo ? (
                          <div>
                            <span className="inline-flex items-center gap-1 text-[10px] text-orange-400 bg-orange-400/10 px-2 py-0.5 rounded-full font-medium">
                              <Tag className="w-2.5 h-2.5" />
                              -{product.promotion_percentage}%
                            </span>
                            {product.promotion_end_date && (
                              <p className="text-gray-600 text-[10px] mt-0.5">
                                Fin: {new Date(product.promotion_end_date).toLocaleDateString('fr-FR')}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-600 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggleActive(product)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                            product.isActive !== false
                              ? 'bg-green-400/10 text-green-400 hover:bg-green-400/20'
                              : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                          }`}
                        >
                          {product.isActive !== false ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                          {product.isActive !== false ? 'Actif' : 'Masque'}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/admin/products/${product.id}`}
                            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                            title="Modifier"
                          >
                            <Edit3 className="w-4 h-4" />
                          </Link>
                          <div className="relative">
                            <button
                              onClick={() => setOpenMenu(openMenu === product.id ? null : product.id)}
                              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </button>
                            {openMenu === product.id && (
                              <>
                                <div className="fixed inset-0 z-40" onClick={() => setOpenMenu(null)} />
                                <div className="absolute right-0 top-full mt-1 bg-[#1a2332] border border-gray-700 rounded-lg shadow-xl z-50 w-44 py-1">
                                  <Link
                                    href={`/products/${product.slug || product.id}`}
                                    target="_blank"
                                    onClick={() => setOpenMenu(null)}
                                    className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" /> Voir en boutique
                                  </Link>
                                  <button
                                    onClick={() => handleClone(product)}
                                    className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white w-full text-left"
                                  >
                                    <Copy className="w-3.5 h-3.5" /> Cloner
                                  </button>
                                  <button
                                    onClick={() => { handleDelete(product.id); setOpenMenu(null) }}
                                    disabled={deleting === product.id}
                                    className="flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-gray-800 w-full text-left disabled:opacity-50"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" /> Supprimer
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
    </div>
  )
}
