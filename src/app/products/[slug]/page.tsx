import { supabase } from '@/lib/supabase'
import { Product, Review } from '@/lib/types'
import ProductDetailClient from './ProductDetailClient'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'

export const revalidate = 60

async function getProduct(slug: string) {
  // Try by slug first, then by ID
  let { data } = await supabase
    .from('products')
    .select('*, categories(*)')
    .eq('slug', slug)
    .single()

  if (!data) {
    const res = await supabase
      .from('products')
      .select('*, categories(*)')
      .eq('id', slug)
      .single()
    data = res.data
  }

  return data as Product | null
}

async function getReviews(productId: string) {
  const { data } = await supabase
    .from('reviews')
    .select('*')
    .eq('productId', productId)
    .order('created_at', { ascending: false })
  return (data || []) as Review[]
}

async function getSimilarProducts(categoryId: string, excludeId: string) {
  const { data } = await supabase
    .from('products')
    .select('*, categories(*)')
    .eq('category_id', categoryId)
    .eq('isActive', true)
    .neq('id', excludeId)
    .limit(4)
  return (data || []) as Product[]
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const product = await getProduct(slug)
  if (!product) return { title: 'Produit introuvable' }

  const price = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(product.price)
  const title = `${product.name} - ${price} | Kapital Stores`
  const description = product.description?.slice(0, 160) || `Achetez ${product.name} sur Kapital Stores. Livraison rapide a Dakar.`

  // Proxy image through Next.js for consistent format and caching
  const baseUrl = process.env.NEXT_PUBLIC_PRODUCTION_URL || 'https://kapitalstores.com'
  const ogImage = `${baseUrl}/_next/image?url=${encodeURIComponent(product.image_url)}&w=1200&q=80`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      siteName: 'Kapital Stores',
      locale: 'fr_FR',
      url: `${baseUrl}/products/${slug}`,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: product.name,
          type: 'image/jpeg',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
  }
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const product = await getProduct(slug)

  if (!product) notFound()

  const [reviews, similar] = await Promise.all([
    getReviews(product.id),
    product.category_id ? getSimilarProducts(product.category_id, product.id) : Promise.resolve([]),
  ])

  return <ProductDetailClient product={product} reviews={reviews} similarProducts={similar} />
}
