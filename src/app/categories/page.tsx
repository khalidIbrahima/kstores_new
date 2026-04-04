'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { LayoutGrid, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Category } from '@/lib/types'

interface CategoryWithCount extends Category {
  product_count: number
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<CategoryWithCount[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchCategories = async () => {
      const { data: cats } = await supabase
        .from('categories')
        .select('*')
        .order('name')

      if (!cats || cats.length === 0) {
        setCategories([])
        setLoading(false)
        return
      }

      // Fetch product counts per category
      const { data: products } = await supabase
        .from('products')
        .select('category_id')
        .eq('isActive', true)

      const countMap: Record<string, number> = {}
      ;(products || []).forEach((p: { category_id: string | null }) => {
        if (p.category_id) {
          countMap[p.category_id] = (countMap[p.category_id] || 0) + 1
        }
      })

      const categoriesWithCount: CategoryWithCount[] = (cats as Category[]).map(cat => ({
        ...cat,
        product_count: countMap[cat.id] || 0,
      }))

      setCategories(categoriesWithCount)
      setLoading(false)
    }

    fetchCategories()
  }, [])

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <Loader2 className="w-8 h-8 text-green-400 animate-spin mx-auto" />
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-black italic text-white flex items-center gap-3">
          <LayoutGrid className="w-8 h-8 text-green-400" />
          Nos <span className="text-green-400">Categories</span>
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          {categories.length} categorie{categories.length > 1 ? 's' : ''} disponible{categories.length > 1 ? 's' : ''}
        </p>
      </div>

      {categories.length === 0 ? (
        <div className="bg-[#111827] border border-gray-800 rounded-xl p-12 text-center">
          <LayoutGrid className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500">Aucune categorie disponible pour le moment</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map(category => (
            <Link
              key={category.id}
              href={`/products?category=${category.slug}`}
              className="group bg-[#111827] border border-gray-800 rounded-xl overflow-hidden hover:border-green-500/50 transition-all"
            >
              <div className="relative h-48 bg-gray-900">
                {category.cover_image_url ? (
                  <Image
                    src={category.cover_image_url}
                    alt={category.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <LayoutGrid className="w-12 h-12 text-gray-700" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              </div>
              <div className="p-5">
                <h2 className="text-white font-bold text-lg group-hover:text-green-400 transition-colors">
                  {category.name}
                </h2>
                <p className="text-gray-500 text-sm mt-1">
                  {category.product_count} produit{category.product_count > 1 ? 's' : ''}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
