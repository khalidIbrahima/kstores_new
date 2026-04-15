'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ShoppingCart, Heart, Check } from 'lucide-react'
import { useState } from 'react'
import { Product } from '@/lib/types'
import { formatPrice } from '@/lib/utils'
import { useCart } from '@/context/CartContext'
import { useFavorites } from '@/hooks/useFavorites'
import PromotionBadge from '@/components/PromotionBadge'

export default function ProductCard({ product }: { product: Product }) {
  const { addToCart } = useCart()
  const { isFavorite, toggleFavorite, isAuthenticated } = useFavorites()
  const router = useRouter()
  const hasPromo = product.promotion_active && product.promotion_percentage && product.old_price && product.old_price > product.price
  const liked = isFavorite(product.id)
  const [added, setAdded] = useState(false)

  const handleAddToCart = () => {
    addToCart(product)
    setAdded(true)
    setTimeout(() => setAdded(false), 1200)
  }

  const handleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!isAuthenticated) { router.push('/login'); return }
    await toggleFavorite(product.id)
  }

  return (
    <div className="group bg-[#111827] border border-gray-800 rounded-xl overflow-hidden hover:border-green-500/30 transition-all duration-300">
      <div className="relative aspect-square overflow-hidden bg-gray-900">
        <Link href={`/products/${product.slug || product.id}`} className="absolute inset-0">
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 768px) 50vw, 25vw"
          />
        </Link>
        {hasPromo && (
          <PromotionBadge percentage={product.promotion_percentage!} className="top-3 left-3" />
        )}
        <button
          onClick={handleFavorite}
          className={`absolute top-3 right-3 p-2 rounded-full transition-all ${
            liked
              ? 'bg-red-500 text-white opacity-100'
              : 'bg-gray-900/70 hover:bg-green-500 text-gray-400 hover:text-black opacity-0 group-hover:opacity-100'
          }`}
        >
          <Heart className={`w-4 h-4 ${liked ? 'fill-current' : ''}`} />
        </button>
      </div>

      <div className="p-4">
        <Link href={`/products/${product.slug || product.id}`}>
          <h3 className="text-white font-semibold text-sm line-clamp-2 hover:text-green-400 transition-colors">
            {product.name}
          </h3>
        </Link>

        {product.categories && (
          <p className="text-gray-500 text-xs mt-1">{product.categories.name}</p>
        )}

        <div className="flex items-end justify-between mt-3 gap-2">
          <div className="min-w-0">
            <span className="text-green-400 font-bold text-base block truncate">{formatPrice(product.price)}</span>
            {hasPromo && (
              <span className="text-gray-500 text-xs line-through block truncate">
                {formatPrice(product.old_price)}
              </span>
            )}
          </div>
          <button
            onClick={handleAddToCart}
            className={`p-2 rounded-lg transition-all shrink-0 ${
              added
                ? 'bg-green-600 text-white scale-110'
                : 'bg-green-500 hover:bg-green-600 text-black'
            }`}
          >
            {added ? <Check className="w-4 h-4" /> : <ShoppingCart className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  )
}
