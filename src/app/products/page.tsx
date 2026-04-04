import { Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import { Product, Category } from '@/lib/types'
import ProductsClient from './ProductsClient'

export const revalidate = 60

async function getProducts() {
  const { data } = await supabase
    .from('products')
    .select('*, categories(*)')
    .eq('isActive', true)
    .order('created_at', { ascending: false })
  return (data || []) as Product[]
}

async function getCategories() {
  const { data } = await supabase.from('categories').select('*').order('name')
  return (data || []) as Category[]
}

export default async function ProductsPage() {
  const [products, categories] = await Promise.all([getProducts(), getCategories()])

  return (
    <Suspense fallback={<div className="max-w-7xl mx-auto px-4 py-20 text-center text-gray-500">Chargement...</div>}>
      <ProductsClient products={products} categories={categories} />
    </Suspense>
  )
}
