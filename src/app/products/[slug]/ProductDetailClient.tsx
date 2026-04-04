'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ShoppingCart, Heart, Star, ChevronRight, ChevronDown, ChevronUp, Minus, Plus, Zap, Truck, Shield } from 'lucide-react'
import { Product, Review } from '@/lib/types'
import { formatPrice, getDiscountedPrice } from '@/lib/utils'
import { useCart } from '@/context/CartContext'
import { useFavorites } from '@/hooks/useFavorites'
import ProductCard from '@/components/ProductCard'
import ProductReviews from '@/components/ProductReviews'
import ProductVariantSelector from '@/components/ProductVariantSelector'
import SocialShareButtons from '@/components/SocialShareButtons'

export default function ProductDetailClient({
  product,
  reviews,
  similarProducts,
}: {
  product: Product
  reviews: Review[]
  similarProducts: Product[]
}) {
  const { addToCart } = useCart()
  const { isFavorite, toggleFavorite, isAuthenticated } = useFavorites()
  const router = useRouter()
  const [quantity, setQuantity] = useState(1)
  const [selectedImage, setSelectedImage] = useState(0)
  const [addedToCart, setAddedToCart] = useState(false)
  const [selectedColor, setSelectedColor] = useState<string>((product.colors?.[0] as string) || '')
  const [selectedProperties, setSelectedProperties] = useState<Record<string, string>>({})
  const [descriptionExpanded, setDescriptionExpanded] = useState(false)
  const [reviewsExpanded, setReviewsExpanded] = useState(false)
  const liked = isFavorite(product.id)

  const hasPromo = product.promotion_active && product.promotion_percentage
  const finalPrice = hasPromo
    ? getDiscountedPrice(product.price, product.promotion_percentage)
    : product.price
  const savings = hasPromo ? product.price - finalPrice : 0

  const images = [
    product.image_url,
    product.image_url1,
    product.image_url2,
    product.image_url3,
    product.image_url4,
  ].filter(Boolean) as string[]

  const avgRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + (r.rate || 0), 0) / reviews.length
    : 0

  const handleAddToCart = () => {
    addToCart(product, quantity)
    setAddedToCart(true)
    setTimeout(() => setAddedToCart(false), 2000)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link href="/" className="hover:text-white">Accueil</Link>
        <ChevronRight className="w-3 h-3" />
        {product.categories && (
          <>
            <Link href={`/products?category=${product.categories.slug}`} className="hover:text-white">
              {product.categories.name}
            </Link>
            <ChevronRight className="w-3 h-3" />
          </>
        )}
        <span className="text-green-400">{product.name}</span>
      </nav>

      {/* Main Product Section */}
      <div className="grid lg:grid-cols-2 gap-6 mb-10">
        {/* Image Gallery */}
        <div>
          <div className="relative aspect-square rounded-xl overflow-hidden bg-gray-900 border border-gray-800">
            <Image
              src={images[selectedImage]}
              alt={product.name}
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
              priority
            />
            {hasPromo && (
              <div className="absolute top-4 left-4 flex gap-2">
                <span className="bg-green-500 text-black text-xs font-bold px-3 py-1 rounded-md">NOUVEAU</span>
                <span className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-md">
                  -{product.promotion_percentage}%
                </span>
              </div>
            )}
          </div>

          {/* Thumbnails */}
          {images.length > 1 && (
            <div className="flex gap-3 mt-3">
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedImage(i)}
                  className={`relative w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                    selectedImage === i ? 'border-green-500' : 'border-gray-700 hover:border-gray-500'
                  }`}
                >
                  <Image src={img} alt="" fill className="object-cover" sizes="80px" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="flex flex-col gap-4">
          <h1 className="text-2xl sm:text-3xl font-black italic text-white">{product.name}</h1>

          {/* Rating */}
          {reviews.length > 0 && (
            <div className="flex items-center gap-2">
              <div className="flex">
                {[1, 2, 3, 4, 5].map(star => (
                  <Star
                    key={star}
                    className={`w-4 h-4 ${star <= avgRating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'}`}
                  />
                ))}
              </div>
              <span className="text-gray-400 text-sm">({reviews.length} avis)</span>
              <span className="text-green-400 text-sm">En stock</span>
            </div>
          )}

          {/* Description — collapsible, 4 lines by default */}
          <div>
            <p className={`text-gray-400 text-sm leading-relaxed ${!descriptionExpanded ? 'line-clamp-4' : ''}`}>
              {product.description}
            </p>
            {product.description && product.description.length > 200 && (
              <button
                onClick={() => setDescriptionExpanded(!descriptionExpanded)}
                className="text-green-400 text-sm mt-1 hover:underline flex items-center gap-1"
              >
                {descriptionExpanded ? 'Voir moins' : 'Voir plus'}
                {descriptionExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            )}
          </div>

          {/* Variants — compact, no extra wrapper spacing */}
          {((product.colors && product.colors.length > 0) || product.properties) && (
            <ProductVariantSelector
              colors={product.colors as string[] | undefined}
              properties={product.properties as Record<string, string[]> | undefined}
              selectedColor={selectedColor}
              selectedProperties={selectedProperties}
              onColorChange={setSelectedColor}
              onPropertyChange={(key, value) => setSelectedProperties(prev => ({ ...prev, [key]: value }))}
            />
          )}

          {/* Price Box */}
          <div className="bg-[#111827] border border-gray-800 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl font-black text-green-400">{formatPrice(finalPrice)}</span>
              {hasPromo && (
                <>
                  <span className="text-gray-500 text-lg line-through">{formatPrice(product.price)}</span>
                  <span className="bg-red-500/20 text-red-400 text-sm font-bold px-3 py-1 rounded-md">
                    Économie: {formatPrice(savings)}
                  </span>
                </>
              )}
            </div>

            <ul className="mt-2 space-y-1 text-sm text-gray-400">
              <li className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-green-400 shrink-0" />
                Livraison gratuite à Dakar pour +50 000 F CFA
              </li>
              <li className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-green-400 shrink-0" />
                Paiement sécurisé (Wave, Orange Money, CB)
              </li>
            </ul>

            {/* Quantity + Cart */}
            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-400">Quantité:</span>
                <div className="flex items-center bg-gray-800 rounded-lg">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="p-2 text-gray-400 hover:text-white"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="px-4 text-white font-medium">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="p-2 text-gray-400 hover:text-white"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <button
                onClick={handleAddToCart}
                className={`w-full py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                  addedToCart
                    ? 'bg-green-600 text-white'
                    : 'bg-green-500 hover:bg-green-600 text-black'
                }`}
              >
                <ShoppingCart className="w-4 h-4" />
                {addedToCart ? 'Ajouté au panier !' : 'Ajouter au panier'}
              </button>

              <Link
                href="/cart"
                className="w-full py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 transition-all border border-yellow-500/30"
              >
                <Zap className="w-4 h-4" />
                Acheter maintenant
              </Link>

              <button
                onClick={async () => {
                  if (!isAuthenticated) { router.push('/login'); return }
                  await toggleFavorite(product.id)
                }}
                className={`w-full py-3 rounded-lg text-sm flex items-center justify-center gap-2 border transition-all ${
                  liked
                    ? 'border-red-500/50 text-red-400 bg-red-500/10 hover:bg-red-500/20'
                    : 'border-gray-700 text-gray-400 hover:border-gray-500 hover:text-white'
                }`}
              >
                <Heart className={`w-4 h-4 ${liked ? 'fill-current' : ''}`} />
                {liked ? 'Retirer des favoris' : 'Ajouter aux favoris'}
              </button>
            </div>

            {/* Share — compact single row */}
            <div className="mt-3 pt-3 border-t border-gray-700 flex items-center gap-3">
              <span className="text-sm text-gray-400 shrink-0">Partager</span>
              <SocialShareButtons
                url={typeof window !== 'undefined' ? window.location.href : ''}
                title={product.name}
                image={product.image_url}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Full Description — collapsible */}
      {product.description && (
        <section className="mb-10">
          <button
            onClick={() => setDescriptionExpanded(!descriptionExpanded)}
            className="flex items-center gap-2 w-full text-left mb-3"
          >
            <h2 className="text-2xl font-black italic text-white">
              Description <span className="text-green-400">complète</span>
            </h2>
            {descriptionExpanded ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </button>
          {descriptionExpanded && (
            <div className="bg-[#111827] border border-gray-800 rounded-xl p-5">
              <div className="text-gray-400 text-sm leading-relaxed whitespace-pre-line">
                {product.description}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Reviews — collapsible */}
      <section className="mb-10">
        <button
          onClick={() => setReviewsExpanded(!reviewsExpanded)}
          className="flex items-center gap-2 w-full text-left mb-3"
        >
          <h2 className="text-2xl font-black italic text-white">
            Avis <span className="text-green-400">clients</span>
            {reviews.length > 0 && (
              <span className="text-base font-normal text-gray-400 ml-2">({reviews.length})</span>
            )}
          </h2>
          {reviewsExpanded ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </button>
        {reviewsExpanded && (
          <div className="bg-[#111827] border border-gray-800 rounded-xl p-4 max-h-[500px] overflow-y-auto">
            <ProductReviews productId={product.id} />
          </div>
        )}
        {!reviewsExpanded && (
          <button
            onClick={() => setReviewsExpanded(true)}
            className="text-green-400 text-sm hover:underline flex items-center gap-1"
          >
            Voir les avis
            <ChevronDown className="w-3 h-3" />
          </button>
        )}
      </section>

      {/* Similar Products — compact, max 4 items, single row */}
      {similarProducts.length > 0 && (
        <section className="mb-10">
          <h2 className="text-2xl font-black italic text-white mb-4">
            Produits <span className="text-green-400">Similaires</span>
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {similarProducts.slice(0, 4).map(p => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
