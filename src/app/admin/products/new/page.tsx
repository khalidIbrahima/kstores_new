'use client'

import { useRouter } from 'next/navigation'
import { adminFetch } from '@/lib/admin-fetch'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import ProductForm, { ProductFormData } from '@/components/admin/ProductForm'

export default function NewProduct() {
  const router = useRouter()

  const generateSlug = (name: string) =>
    name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

  const handleSubmit = async (form: ProductFormData) => {
    const res = await adminFetch('/api/admin/products', {
      method: 'POST',
      body: JSON.stringify({
        name: form.name,
        description: form.description || null,
        price: Number(form.price),
        image_url: form.image_url,
        image_url1: form.image_url1 || null,
        image_url2: form.image_url2 || null,
        image_url3: form.image_url3 || null,
        image_url4: form.image_url4 || null,
        category_id: form.category_id || null,
        stock: Number(form.stock) || 0,
        inventory: Number(form.stock) || 0,
        isActive: form.isActive,
        promotion_active: form.promotion_active,
        promotion_percentage: form.promotion_active && form.promotion_percentage ? parseInt(String(form.promotion_percentage)) : null,
        promotion_start_date: form.promotion_active && form.promotion_start_date ? form.promotion_start_date : null,
        promotion_end_date: form.promotion_active && form.promotion_end_date ? form.promotion_end_date : null,
        colors: form.colors.length > 0 ? form.colors : null,
        slug: generateSlug(form.name),
      }),
    })
    const json = await res.json().catch(() => ({})) as { id?: string; error?: string }
    if (!res.ok || !json.id) {
      alert('Erreur: ' + (json.error || `${res.status}`))
      throw new Error(json.error || `${res.status}`)
    }

    if (form.variants.length > 0) {
      for (const variant of form.variants) {
        const vRes = await adminFetch('/api/admin/product-variants', {
          method: 'POST',
          body: JSON.stringify({ product_id: json.id, name: variant.name, display_order: variant.display_order }),
        })
        const vJson = await vRes.json().catch(() => ({})) as { variant?: { id: string } }
        if (vRes.ok && vJson.variant) {
          const options = variant.options.filter(o => o.name.trim()).map(o => ({
            variant_id: vJson.variant!.id,
            name: o.name,
            image_url: o.image_url || null,
            display_order: o.display_order,
            stock: o.stock != null ? Math.max(0, Math.floor(Number(o.stock))) : null,
          }))
          if (options.length > 0) {
            await adminFetch('/api/admin/product-variant-options', {
              method: 'POST',
              body: JSON.stringify({ options }),
            })
          }
        }
      }
    }

    router.push('/admin/products')
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Link href="/admin/products" className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-gray-800">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl sm:text-3xl font-black text-white">Nouveau produit</h1>
          <p className="text-gray-500 text-sm mt-1">Ajouter un produit a votre catalogue</p>
        </div>
      </div>

      <ProductForm
        submitLabel="Creer le produit"
        onSubmit={handleSubmit}
        onCancel={() => router.push('/admin/products')}
      />
    </div>
  )
}
