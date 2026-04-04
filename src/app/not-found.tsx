'use client'

import Link from 'next/link'
import { SearchX, Home, ShoppingBag } from 'lucide-react'

export default function NotFoundPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-20 text-center">
      <div className="w-24 h-24 bg-[#111827] border border-gray-800 rounded-full flex items-center justify-center mx-auto mb-8">
        <SearchX className="w-12 h-12 text-green-400" />
      </div>

      <h1 className="text-6xl font-black text-white mb-4">
        4<span className="text-green-400">0</span>4
      </h1>

      <h2 className="text-2xl font-bold text-white mb-3">Page introuvable</h2>

      <p className="text-gray-500 max-w-md mx-auto mb-10">
        Oups ! La page que vous recherchez n&apos;existe pas ou a ete deplacee.
        Pas de panique, vous pouvez revenir a l&apos;accueil ou explorer nos produits.
      </p>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 text-black font-bold px-8 py-3 rounded-lg transition-colors"
        >
          <Home className="w-4 h-4" />
          Retour a l&apos;accueil
        </Link>
        <Link
          href="/products"
          className="inline-flex items-center gap-2 border border-gray-700 hover:border-gray-500 text-gray-300 px-8 py-3 rounded-lg transition-colors"
        >
          <ShoppingBag className="w-4 h-4" />
          Voir nos produits
        </Link>
      </div>
    </div>
  )
}
