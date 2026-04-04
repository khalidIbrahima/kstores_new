'use client'

import { useState, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { Product, Category } from '@/lib/types'
import ProductCard from '@/components/ProductCard'
import Pagination from '@/components/Pagination'
import { LayoutGrid, List, SlidersHorizontal, X } from 'lucide-react'

type SortOption = 'newest' | 'price-asc' | 'price-desc' | 'popular'

const ITEMS_PER_PAGE = 12

export default function ProductsClient({
  products,
  categories,
}: {
  products: Product[]
  categories: Category[]
}) {
  const searchParams = useSearchParams()
  const initialCategory = searchParams.get('category') || ''
  const initialSearch = searchParams.get('search') || ''

  const [selectedCategory, setSelectedCategory] = useState(initialCategory)
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 200000])
  const [sortBy, setSortBy] = useState<SortOption>('newest')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [search, setSearch] = useState(initialSearch)
  const [showFilters, setShowFilters] = useState(false)
  const [promoOnly, setPromoOnly] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)

  const filtered = useMemo(() => {
    let result = [...products]

    if (search) {
      const q = search.toLowerCase()
      result = result.filter(p => p.name.toLowerCase().includes(q))
    }

    if (selectedCategory) {
      result = result.filter(p => p.categories?.slug === selectedCategory)
    }

    result = result.filter(p => p.price >= priceRange[0] && p.price <= priceRange[1])

    if (promoOnly) {
      result = result.filter(p => p.promotion_active)
    }

    switch (sortBy) {
      case 'price-asc':
        result.sort((a, b) => a.price - b.price)
        break
      case 'price-desc':
        result.sort((a, b) => b.price - a.price)
        break
      case 'newest':
        result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        break
    }

    return result
  }, [products, search, selectedCategory, priceRange, sortBy, promoOnly])

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE)
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const resetFilters = () => {
    setSelectedCategory('')
    setPriceRange([0, 200000])
    setPromoOnly(false)
    setSearch('')
    setCurrentPage(1)
  }

  // Reset page when filters change
  const handleFilterChange = (setter: () => void) => {
    setter()
    setCurrentPage(1)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black italic text-white">
            Produits <span className="text-green-400">Gaming</span>
          </h1>
          <p className="text-gray-500 text-sm mt-1">{filtered.length} produits trouvés</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={sortBy}
            onChange={e => { setSortBy(e.target.value as SortOption); setCurrentPage(1) }}
            className="bg-gray-800 border border-gray-700 text-gray-300 text-sm rounded-lg px-3 py-2 outline-none focus:border-green-500"
          >
            <option value="newest">Trier par nouveauté</option>
            <option value="popular">Trier par popularité</option>
            <option value="price-asc">Prix croissant</option>
            <option value="price-desc">Prix décroissant</option>
          </select>
          <div className="hidden sm:flex border border-gray-700 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 ${viewMode === 'grid' ? 'bg-gray-700 text-white' : 'text-gray-500'}`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 ${viewMode === 'list' ? 'bg-gray-700 text-white' : 'text-gray-500'}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="lg:hidden bg-gray-800 border border-gray-700 p-2 rounded-lg text-gray-400"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Sidebar Filters */}
        <aside className={`${showFilters ? 'fixed inset-0 z-40 bg-black/50 lg:static lg:bg-transparent' : 'hidden lg:block'} lg:w-64 flex-shrink-0`}>
          <div className={`${showFilters ? 'fixed right-0 top-0 h-full w-72 bg-[#0a0f1a] p-6 overflow-y-auto z-50' : ''} lg:static lg:p-0`}>
            {showFilters && (
              <button
                onClick={() => setShowFilters(false)}
                className="lg:hidden absolute top-4 right-4 text-gray-400"
              >
                <X className="w-5 h-5" />
              </button>
            )}

            <div className="flex items-center justify-between mb-6">
              <h2 className="text-green-400 font-bold text-lg">Filtres</h2>
              <button onClick={resetFilters} className="text-gray-500 text-sm hover:text-white">
                Réinitialiser
              </button>
            </div>

            {/* Search */}
            <div className="mb-6">
              <input
                type="text"
                value={search}
                onChange={e => handleFilterChange(() => setSearch(e.target.value))}
                placeholder="Rechercher..."
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-green-500"
              />
            </div>

            {/* Category */}
            <div className="mb-6">
              <h3 className="text-white font-semibold text-sm mb-3">Catégorie</h3>
              <div className="space-y-2">
                {categories.map(cat => (
                  <label key={cat.id} className="flex items-center gap-2 text-sm text-gray-400 hover:text-white cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedCategory === cat.slug}
                      onChange={() => handleFilterChange(() => setSelectedCategory(selectedCategory === cat.slug ? '' : cat.slug))}
                      className="rounded bg-gray-700 border-gray-600 text-green-500 focus:ring-green-500"
                    />
                    {cat.name}
                  </label>
                ))}
              </div>
            </div>

            {/* Price */}
            <div className="mb-6">
              <h3 className="text-white font-semibold text-sm mb-3">Prix</h3>
              <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                <span>0 XOF</span>
                <span className="text-green-400">Max: {priceRange[1].toLocaleString('fr-FR')} XOF</span>
              </div>
              <input
                type="range"
                min={0}
                max={200000}
                step={5000}
                value={priceRange[1]}
                onChange={e => { setPriceRange([0, Number(e.target.value)]); setCurrentPage(1) }}
                className="w-full"
              />
              <div className="flex gap-2 mt-3">
                <input
                  type="number"
                  value={priceRange[0]}
                  onChange={e => { setPriceRange([Number(e.target.value), priceRange[1]]); setCurrentPage(1) }}
                  placeholder="Min"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-white outline-none"
                />
                <input
                  type="number"
                  value={priceRange[1]}
                  onChange={e => { setPriceRange([priceRange[0], Number(e.target.value)]); setCurrentPage(1) }}
                  placeholder="Max"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-white outline-none"
                />
              </div>
            </div>

            {/* Promo filter */}
            <div className="mb-6">
              <label className="flex items-center gap-2 text-sm text-gray-400 hover:text-white cursor-pointer">
                <input
                  type="checkbox"
                  checked={promoOnly}
                  onChange={() => handleFilterChange(() => setPromoOnly(!promoOnly))}
                  className="rounded bg-gray-700 border-gray-600 text-green-500 focus:ring-green-500"
                />
                Promotions uniquement
              </label>
            </div>
          </div>
        </aside>

        {/* Products Grid */}
        <div className="flex-1">
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {paginated.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {paginated.map(product => (
                <ListProductCard key={product.id} product={product} />
              ))}
            </div>
          )}

          {filtered.length === 0 && (
            <div className="text-center py-20">
              <p className="text-gray-500 text-lg">Aucun produit trouvé</p>
              <button
                onClick={resetFilters}
                className="mt-4 text-green-400 hover:text-green-300 text-sm"
              >
                Réinitialiser les filtres
              </button>
            </div>
          )}

          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
        </div>
      </div>
    </div>
  )
}

function ListProductCard({ product }: { product: Product }) {
  const hasPromo = product.promotion_active && product.promotion_percentage
  const finalPrice = hasPromo
    ? Math.round(product.price * (1 - (product.promotion_percentage || 0) / 100))
    : product.price

  return (
    <div className="flex gap-4 bg-[#111827] border border-gray-800 rounded-xl p-4 hover:border-green-500/30 transition-all">
      <div className="relative w-32 h-32 flex-shrink-0 rounded-lg overflow-hidden bg-gray-900">
        <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
        {hasPromo && (
          <span className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded">
            PROMO
          </span>
        )}
      </div>
      <div className="flex-1 flex flex-col justify-between">
        <div>
          <h3 className="text-white font-semibold">{product.name}</h3>
          {product.categories && (
            <p className="text-gray-500 text-xs mt-1">{product.categories.name}</p>
          )}
          <p className="text-gray-400 text-sm mt-2 line-clamp-2">{product.description}</p>
        </div>
        <div className="flex items-center justify-between mt-2">
          <div>
            <span className="text-green-400 font-bold text-xl">
              {finalPrice.toLocaleString('fr-FR')} XOF
            </span>
            {hasPromo && (
              <span className="text-gray-500 text-sm line-through ml-2">
                {product.price.toLocaleString('fr-FR')} XOF
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
