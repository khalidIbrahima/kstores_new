'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Heart, Loader2 } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { Product } from '@/lib/types'
import ProductCard from '@/components/ProductCard'
import Pagination from '@/components/Pagination'

const ITEMS_PER_PAGE = 12

export default function FavoritesPage() {
  const { isAuthenticated, profile, loading: authLoading } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    if (authLoading) return
    if (!profile?.id) { setLoading(false); return }

    const fetchFavorites = async () => {
      const { data: favs } = await supabase
        .from('favorites')
        .select('product_id')
        .eq('user_id', profile.id)

      if (!favs || favs.length === 0) {
        setProducts([])
        setLoading(false)
        return
      }

      const ids = favs.map(f => f.product_id)
      const { data: prods } = await supabase
        .from('products')
        .select('*, categories(name, slug)')
        .in('id', ids)

      setProducts((prods || []) as Product[])
      setLoading(false)
    }

    fetchFavorites()
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
        <Heart className="w-16 h-16 text-gray-600 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-white mb-2">Vos favoris</h1>
        <p className="text-gray-500 mb-6">Connectez-vous pour voir vos articles favoris</p>
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
          <Heart className="w-8 h-8 text-green-400" />
          Mes <span className="text-green-400">Favoris</span>
        </h1>
        <p className="text-gray-500 text-sm mt-1">{products.length} article{products.length > 1 ? 's' : ''}</p>
      </div>

      {products.length === 0 ? (
        <div className="bg-[#111827] border border-gray-800 rounded-xl p-12 text-center">
          <Heart className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 mb-4">Vous n&apos;avez pas encore de favoris</p>
          <Link
            href="/products"
            className="inline-flex bg-green-500 hover:bg-green-600 text-black font-bold px-6 py-3 rounded-lg"
          >
            Découvrir nos produits
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
          <Pagination
            currentPage={currentPage}
            totalPages={Math.ceil(products.length / ITEMS_PER_PAGE)}
            onPageChange={p => { setCurrentPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
          />
        </>
      )}
    </div>
  )
}
