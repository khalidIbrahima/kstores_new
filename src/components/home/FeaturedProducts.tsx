'use client'

import { useState } from 'react'
import { Product } from '@/lib/types'
import ProductCard from '@/components/ProductCard'

const tabs = ['Tous', 'Gaming', 'Electronique', 'Bureau', 'Maison', 'Mode', 'Sports']
const categorySlugMap: Record<string, string> = {
  Gaming: 'gaming',
  Electronique: 'electronics',
  Bureau: 'bureau',
  Maison: 'home-living',
  Mode: 'fashion',
  Sports: 'sports',
}

export default function FeaturedProducts({ products }: { products: Product[] }) {
  const [activeTab, setActiveTab] = useState('Tous')

  const filtered = activeTab === 'Tous'
    ? products
    : products.filter(p => p.categories?.slug === categorySlugMap[activeTab])

  return (
    <section className="py-16 sm:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black italic text-white">
            Articles en <span className="text-green-400">vedette</span>
          </h2>
          <p className="text-gray-500 mt-2">Découvrez nos nouveautés et nos articles les plus populaires</p>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 justify-center mb-8">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab
                  ? 'bg-green-500 text-black'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {filtered.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        {filtered.length === 0 && (
          <p className="text-center text-gray-500 py-12">Aucun article dans cette catégorie</p>
        )}
      </div>
    </section>
  )
}
