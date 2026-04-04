import { supabase } from '@/lib/supabase'
import { Product, Category } from '@/lib/types'
import HeroSection from '@/components/home/HeroSection'
import FeaturedProducts from '@/components/home/FeaturedProducts'
import CategoriesShowcase from '@/components/home/CategoriesShowcase'
import FeaturesSection from '@/components/home/FeaturesSection'
import PromoCountdown from '@/components/home/PromoCountdown'
import NewsletterSection from '@/components/home/NewsletterSection'

export const revalidate = 60

async function getProducts() {
  const { data } = await supabase
    .from('products')
    .select('*, categories(*)')
    .eq('isActive', true)
    .order('created_at', { ascending: false })
    .limit(8)
  return (data || []) as Product[]
}

async function getCategories() {
  const { data } = await supabase
    .from('categories')
    .select('*')
    .order('name')
  return (data || []) as Category[]
}

async function getPromoProducts() {
  const { data } = await supabase
    .from('products')
    .select('*, categories(*)')
    .eq('isActive', true)
    .eq('promotion_active', true)
    .order('promotion_percentage', { ascending: false })
    .limit(4)
  return (data || []) as Product[]
}

export default async function HomePage() {
  const [products, categories, promoProducts] = await Promise.all([
    getProducts(),
    getCategories(),
    getPromoProducts(),
  ])

  return (
    <div>
      <HeroSection />
      <div className="hidden md:block">
        <FeaturesSection />
      </div>
      <FeaturedProducts products={products} />
      <CategoriesShowcase categories={categories} />
      <div className="md:hidden">
        <FeaturesSection />
      </div>
      {promoProducts.length > 0 && <PromoCountdown products={promoProducts} />}
      <NewsletterSection />
    </div>
  )
}
