'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Product } from '@/lib/types'
import { formatPrice, getDiscountedPrice } from '@/lib/utils'
import {
  ArrowLeft, Loader2, ExternalLink, Copy, Check, Trash2,
  Eye, EyeOff, Tag, Package, BarChart3, Star, Calendar,
  ShoppingCart, Edit3
} from 'lucide-react'
import ProductForm, { ProductFormData } from '@/components/admin/ProductForm'
import type { Variant } from '@/components/admin/ProductVariantsManager'

type Tab = 'overview' | 'edit'

interface ReviewStats {
  count: number
  avg: number
}

interface OrderCount {
  count: number
}

export default function EditProduct({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [product, setProduct] = useState<Product | null>(null)
  const [initialData, setInitialData] = useState<ProductFormData | null>(null)
  const [tab, setTab] = useState<Tab>('overview')
  const [cloning, setCloning] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [copied, setCopied] = useState(false)
  const [reviewStats, setReviewStats] = useState<ReviewStats>({ count: 0, avg: 0 })
  const [orderCount, setOrderCount] = useState(0)
  const [selectedImage, setSelectedImage] = useState(0)

  useEffect(() => {
    const fetchAll = async () => {
      const [prodRes, reviewRes, orderRes, variantsRes] = await Promise.all([
        supabase.from('products').select('*, categories(name, slug)').eq('id', id).single(),
        supabase.from('reviews').select('rate').eq('productId', id),
        supabase.from('order_items').select('id', { count: 'exact', head: true }).eq('product_id', id),
        supabase.from('product_variants').select('*, product_variant_options(*)').eq('product_id', id).order('display_order'),
      ])

      if (prodRes.data) {
        const p = prodRes.data as Product
        setProduct(p)
        setInitialData({
          name: p.name,
          description: p.description || '',
          price: String(p.price),
          image_url: p.image_url,
          image_url1: p.image_url1 || '',
          image_url2: p.image_url2 || '',
          image_url3: p.image_url3 || '',
          image_url4: p.image_url4 || '',
          category_id: p.category_id || '',
          stock: String(p.stock ?? p.inventory ?? 0),
          isActive: p.isActive !== false,
          promotion_active: p.promotion_active || false,
          promotion_percentage: p.promotion_percentage ? String(p.promotion_percentage) : '',
          promotion_start_date: p.promotion_start_date || '',
          promotion_end_date: p.promotion_end_date || '',
          colors: Array.isArray(p.colors) ? (p.colors as string[]) : [],
          variants: (variantsRes.data || []).map((v: Record<string, unknown>) => ({
            id: v.id as string,
            name: v.name as string,
            display_order: (v.display_order as number) || 0,
            options: ((v.product_variant_options as Record<string, unknown>[]) || []).map((o: Record<string, unknown>) => ({
              id: o.id as string,
              name: o.name as string,
              image_url: (o.image_url as string) || '',
              display_order: (o.display_order as number) || 0,
              stock: o.stock != null ? Number(o.stock) : null,
            })),
          })) as Variant[],
        })
      }

      if (reviewRes.data && reviewRes.data.length > 0) {
        const rates = reviewRes.data.map(r => Number(r.rate) || 0)
        setReviewStats({ count: rates.length, avg: rates.reduce((a, b) => a + b, 0) / rates.length })
      }

      setOrderCount((orderRes as OrderCount).count || 0)
      setLoading(false)
    }
    fetchAll()
  }, [id])

  const generateSlug = (name: string) =>
    name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

  const handleSubmit = async (form: ProductFormData) => {
    const { error } = await supabase
      .from('products')
      .update({
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
        promotion_percentage: form.promotion_active ? Number(form.promotion_percentage) : null,
        promotion_start_date: form.promotion_start_date || null,
        promotion_end_date: form.promotion_end_date || null,
        colors: form.colors.length > 0 ? form.colors : null,
        slug: generateSlug(form.name),
      })
      .eq('id', id)

    if (error) { alert('Erreur: ' + error.message); throw error }

    // Save variants
    await saveVariants(id, form.variants)

    router.push('/admin/products')
  }

  const saveVariants = async (productId: string, variants: Variant[]) => {
    // Get existing variants
    const { data: existing } = await supabase.from('product_variants').select('id').eq('product_id', productId)
    const existingIds = new Set((existing || []).map(v => v.id))

    // Track which IDs we keep
    const keptVariantIds = new Set<string>()
    const variantIdMap: Record<string, string> = {}

    for (const variant of variants) {
      const isTemp = variant.id.startsWith('temp-')

      let variantId: string
      if (isTemp) {
        // Insert new variant
        const { data } = await supabase.from('product_variants').insert({
          product_id: productId, name: variant.name, display_order: variant.display_order,
        }).select('id').single()
        if (!data) continue
        variantId = data.id
        variantIdMap[variant.id] = variantId
      } else {
        // Update existing variant
        await supabase.from('product_variants').update({
          name: variant.name, display_order: variant.display_order,
        }).eq('id', variant.id)
        variantId = variant.id
      }
      keptVariantIds.add(variantId)

      // Process options
      const { data: existingOpts } = await supabase.from('product_variant_options').select('id').eq('variant_id', variantId)
      const keptOptionIds = new Set<string>()

      for (const option of variant.options) {
        const isOptTemp = option.id.startsWith('temp-')
        const stockVal = option.stock != null ? Math.max(0, Math.floor(Number(option.stock))) : null

        if (isOptTemp) {
          const { data } = await supabase.from('product_variant_options').insert({
            variant_id: variantId, name: option.name, image_url: option.image_url || null,
            display_order: option.display_order, stock: stockVal,
          }).select('id').single()
          if (data) keptOptionIds.add(data.id)
        } else {
          await supabase.from('product_variant_options').update({
            name: option.name, image_url: option.image_url || null,
            display_order: option.display_order, stock: stockVal,
          }).eq('id', option.id)
          keptOptionIds.add(option.id)
        }
      }

      // Delete removed options
      const removedOpts = (existingOpts || []).filter(o => !keptOptionIds.has(o.id)).map(o => o.id)
      if (removedOpts.length > 0) {
        await supabase.from('product_variant_options').delete().in('id', removedOpts)
      }
    }

    // Delete removed variants
    const removedVariants = [...existingIds].filter(vid => !keptVariantIds.has(vid))
    if (removedVariants.length > 0) {
      await supabase.from('product_variant_options').delete().in('variant_id', removedVariants)
      await supabase.from('product_variants').delete().in('id', removedVariants)
    }
  }

  const handleClone = async () => {
    if (!initialData) return
    setCloning(true)
    const cloneName = `${initialData.name} (Clone)`
    const { data, error } = await supabase.from('products').insert({
      name: cloneName, description: initialData.description || null,
      price: Number(initialData.price), image_url: initialData.image_url,
      image_url1: initialData.image_url1 || null, image_url2: initialData.image_url2 || null,
      image_url3: initialData.image_url3 || null, image_url4: initialData.image_url4 || null,
      category_id: initialData.category_id || null,
      stock: Number(initialData.stock) || 0, inventory: Number(initialData.stock) || 0,
      isActive: false, promotion_active: false,
      colors: initialData.colors.length > 0 ? initialData.colors : null,
      slug: generateSlug(cloneName),
    }).select().single()
    setCloning(false)
    if (error) { alert('Erreur: ' + error.message); return }
    if (data) router.push(`/admin/products/${data.id}`)
  }

  const handleDelete = async () => {
    if (!confirm('Supprimer definitivement ce produit ?')) return
    setDeleting(true)
    await supabase.from('products').delete().eq('id', id)
    router.push('/admin/products')
  }

  const toggleActive = async () => {
    if (!product) return
    const newActive = !product.isActive
    await supabase.from('products').update({ isActive: newActive }).eq('id', id)
    setProduct(prev => prev ? { ...prev, isActive: newActive } : null)
    if (initialData) setInitialData({ ...initialData, isActive: newActive })
  }

  const copyId = () => {
    navigator.clipboard.writeText(id)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-green-400 animate-spin" />
      </div>
    )
  }

  if (!product || !initialData) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">Produit introuvable</p>
        <Link href="/admin/products" className="text-green-400 hover:text-green-300 text-sm mt-2 inline-block">
          Retour aux produits
        </Link>
      </div>
    )
  }

  const images = [product.image_url, product.image_url1, product.image_url2, product.image_url3, product.image_url4].filter(Boolean) as string[]
  const stock = product.stock ?? product.inventory ?? 0
  const hasPromo = product.promotion_active && product.promotion_percentage
  const finalPrice = hasPromo ? getDiscountedPrice(product.price, product.promotion_percentage) : product.price
  const slug = product.slug || product.id

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/admin/products" className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-gray-800">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="text-lg sm:text-2xl font-black text-white truncate">{product.name}</h1>
            <button
              onClick={toggleActive}
              className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                product.isActive !== false
                  ? 'bg-green-400/10 text-green-400 hover:bg-green-400/20'
                  : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
              }`}
            >
              {product.isActive !== false ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
              {product.isActive !== false ? 'Actif' : 'Masque'}
            </button>
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <button onClick={copyId} className="text-gray-600 hover:text-gray-400 text-xs flex items-center gap-1 font-mono">
              {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
              {id.slice(0, 8)}
            </button>
            {product.categories && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-400/10 text-blue-400">{product.categories.name}</span>
            )}
            {hasPromo && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-orange-400/10 text-orange-400 flex items-center gap-1">
                <Tag className="w-2.5 h-2.5" />-{product.promotion_percentage}%
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href={`/products/${slug}`}
            target="_blank"
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 rounded-lg transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Boutique
          </Link>
          <button
            onClick={handleClone}
            disabled={cloning}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-purple-400 border border-purple-500/30 hover:border-purple-500/50 rounded-lg transition-colors disabled:opacity-50"
          >
            <Copy className="w-3.5 h-3.5" /> {cloning ? '...' : 'Cloner'}
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-red-400 border border-red-500/30 hover:border-red-500/50 rounded-lg transition-colors disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" /> {deleting ? '...' : 'Supprimer'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-[#0d1117] border border-gray-800 rounded-lg p-1">
        {([
          { key: 'overview' as Tab, label: 'Apercu', icon: Package },
          { key: 'edit' as Tab, label: 'Modifier', icon: Edit3 },
        ]).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === t.key ? 'bg-[#111827] text-green-400' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {tab === 'overview' && (
        <div className="grid lg:grid-cols-3 gap-4">
          {/* Left — Images */}
          <div className="lg:col-span-1">
            <div className="bg-[#111827] border border-gray-800 rounded-xl overflow-hidden">
              <div className="relative aspect-square bg-gray-900">
                <Image src={images[selectedImage] || product.image_url} alt="" fill className="object-cover" sizes="400px" />
                {hasPromo && (
                  <span className="absolute top-3 left-3 bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-md">
                    -{product.promotion_percentage}%
                  </span>
                )}
              </div>
              {images.length > 1 && (
                <div className="flex gap-1 p-2">
                  {images.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedImage(i)}
                      className={`relative w-14 h-14 rounded-lg overflow-hidden border-2 transition-all flex-shrink-0 ${
                        selectedImage === i ? 'border-green-500' : 'border-gray-700 hover:border-gray-500'
                      }`}
                    >
                      <Image src={img} alt="" fill className="object-cover" sizes="56px" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right — Info */}
          <div className="lg:col-span-2 space-y-4">
            {/* Price + Stock Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-[#111827] border border-gray-800 rounded-xl p-4">
                <p className="text-gray-500 text-xs mb-1">Prix</p>
                <p className="text-green-400 font-bold text-lg">{formatPrice(finalPrice)}</p>
                {hasPromo && <p className="text-gray-600 text-xs line-through">{formatPrice(product.price)}</p>}
              </div>
              <div className="bg-[#111827] border border-gray-800 rounded-xl p-4">
                <p className="text-gray-500 text-xs mb-1">Stock</p>
                <p className={`font-bold text-lg ${stock > 10 ? 'text-green-400' : stock > 0 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {stock}
                </p>
                <p className="text-gray-600 text-xs">{stock === 0 ? 'Rupture' : stock < 10 ? 'Faible' : 'En stock'}</p>
              </div>
              <div className="bg-[#111827] border border-gray-800 rounded-xl p-4">
                <p className="text-gray-500 text-xs mb-1">Avis</p>
                <div className="flex items-center gap-1.5">
                  <Star className={`w-4 h-4 ${reviewStats.count > 0 ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'}`} />
                  <span className="text-white font-bold text-lg">{reviewStats.count > 0 ? reviewStats.avg.toFixed(1) : '—'}</span>
                </div>
                <p className="text-gray-600 text-xs">{reviewStats.count} avis</p>
              </div>
              <div className="bg-[#111827] border border-gray-800 rounded-xl p-4">
                <p className="text-gray-500 text-xs mb-1">Ventes</p>
                <div className="flex items-center gap-1.5">
                  <ShoppingCart className="w-4 h-4 text-blue-400" />
                  <span className="text-white font-bold text-lg">{orderCount}</span>
                </div>
                <p className="text-gray-600 text-xs">commandes</p>
              </div>
            </div>

            {/* Description */}
            <div className="bg-[#111827] border border-gray-800 rounded-xl p-5">
              <h3 className="text-white font-bold text-sm mb-2">Description</h3>
              <p className="text-gray-400 text-sm leading-relaxed whitespace-pre-line line-clamp-6">
                {product.description || 'Aucune description'}
              </p>
            </div>

            {/* Details Grid */}
            <div className="bg-[#111827] border border-gray-800 rounded-xl p-5">
              <h3 className="text-white font-bold text-sm mb-3">Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Categorie</span>
                  <span className="text-white">{product.categories?.name || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Slug</span>
                  <span className="text-gray-400 font-mono text-xs">{slug}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Cree le</span>
                  <span className="text-gray-400">{new Date(product.created_at).toLocaleDateString('fr-FR')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Statut</span>
                  <span className={product.isActive !== false ? 'text-green-400' : 'text-gray-500'}>
                    {product.isActive !== false ? 'Actif' : 'Masque'}
                  </span>
                </div>
                {hasPromo && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Promo</span>
                      <span className="text-orange-400">-{product.promotion_percentage}%</span>
                    </div>
                    {product.promotion_end_date && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Fin promo</span>
                        <span className="text-gray-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(product.promotion_end_date).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Colors */}
              {Array.isArray(product.colors) && product.colors.length > 0 && (
                <div className="mt-4 pt-3 border-t border-gray-800">
                  <p className="text-gray-500 text-xs mb-2">Couleurs</p>
                  <div className="flex gap-2">
                    {(product.colors as string[]).map((color, i) => (
                      <div key={i} className="w-7 h-7 rounded-full border-2 border-gray-600" style={{ backgroundColor: color }} title={color} />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Quick Edit Button */}
            <button
              onClick={() => setTab('edit')}
              className="w-full bg-green-500 hover:bg-green-600 text-black font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors"
            >
              <Edit3 className="w-4 h-4" /> Modifier ce produit
            </button>
          </div>
        </div>
      )}

      {/* Edit Tab */}
      {tab === 'edit' && (
        <div>
          <ProductForm
            initialData={initialData}
            submitLabel="Enregistrer"
            onSubmit={handleSubmit}
            onCancel={() => setTab('overview')}
          />
        </div>
      )}
    </div>
  )
}
