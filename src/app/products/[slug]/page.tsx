import { supabase } from '@/lib/supabase'
import { Product, Review } from '@/lib/types'
import ProductDetailClient from './ProductDetailClient'
import { notFound } from 'next/navigation'

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
