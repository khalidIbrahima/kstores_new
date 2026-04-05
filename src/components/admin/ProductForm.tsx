'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import {
  Save, ImagePlus, Tag, Percent, Palette, X, Plus, Upload, Loader2, Eye, EyeOff,
  CalendarDays, DollarSign, Package, Info
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Category } from '@/lib/types'
import { formatPrice, getDiscountedPrice } from '@/lib/utils'
import ProductVariantsManager, { Variant } from '@/components/admin/ProductVariantsManager'

export interface ProductFormData {
  name: string
  description: string
  price: string
  image_url: string
  image_url1: string
  image_url2: string
  image_url3: string
  image_url4: string
  category_id: string
  stock: string
  isActive: boolean
  promotion_active: boolean
  promotion_percentage: string
  promotion_start_date: string
  promotion_end_date: string
  colors: string[]
  variants: Variant[]
}

const EMPTY_FORM: ProductFormData = {
  name: '', description: '', price: '', image_url: '', image_url1: '', image_url2: '',
  image_url3: '', image_url4: '', category_id: '', stock: '', isActive: true,
  promotion_active: false, promotion_percentage: '', promotion_start_date: '',
  promotion_end_date: '', colors: [], variants: [],
}

interface Props {
  initialData?: ProductFormData
  onSubmit: (data: ProductFormData) => Promise<void>
  submitLabel: string
  onCancel: () => void
}

function ImageInput({ label, value, onChange, required, compact }: {
  label: string; value: string; onChange: (url: string) => void; required?: boolean; compact?: boolean
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [previewError, setPreviewError] = useState(false)

  const handleUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) return
    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `products/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const { error } = await supabase.storage.from('product-media').upload(path, file)
    if (!error) {
      const { data } = supabase.storage.from('product-media').getPublicUrl(path)
      onChange(data.publicUrl)
      setPreviewError(false)
    }
    setUploading(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleUpload(file)
  }

  if (compact) {
    return (
      <div>
        {value ? (
          <div className="relative aspect-square rounded-lg overflow-hidden bg-gray-900 border border-gray-700 group">
            {!previewError ? (
              <Image src={value} alt="" fill className="object-cover" sizes="120px" onError={() => setPreviewError(true)} />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-600 text-xs">Erreur</div>
            )}
            <button type="button" onClick={() => onChange('')}
              className="absolute top-1 right-1 bg-red-500/80 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true) }} onDragLeave={() => setDragOver(false)} onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            className={`aspect-square border-2 border-dashed rounded-lg flex flex-col items-center justify-center text-xs cursor-pointer transition-colors ${
              dragOver ? 'border-green-500 bg-green-500/5 text-green-400' : 'border-gray-700 text-gray-600 hover:border-gray-500 hover:text-gray-400'
            }`}
          >
            <Upload className="w-4 h-4 mb-1" />
            {label}
          </div>
        )}
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f) }} />
      </div>
    )
  }

  return (
    <div>
      <label className="block text-sm text-gray-400 mb-1">{label}{required && ' *'}</label>
      <div className="flex gap-2">
        <input type="url" value={value} onChange={e => { onChange(e.target.value); setPreviewError(false) }}
          placeholder="https://..." required={required}
          className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-green-500" />
        <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
          className="px-2.5 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-400 hover:text-white hover:border-gray-500 transition-colors disabled:opacity-50">
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f) }} />
      </div>
      {value && (
        <div className="mt-1.5 relative w-16 h-16 rounded-lg overflow-hidden bg-gray-900 border border-gray-700 group inline-block">
          {!previewError ? (
            <Image src={value} alt="" fill className="object-cover" sizes="64px" onError={() => setPreviewError(true)} />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-600 text-[10px]">Err</div>
          )}
          <button type="button" onClick={() => onChange('')}
            className="absolute top-0.5 right-0.5 bg-red-500/80 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <X className="w-2.5 h-2.5" />
          </button>
        </div>
      )}
    </div>
  )
}

export default function ProductForm({ initialData, onSubmit, submitLabel, onCancel }: Props) {
  const [form, setForm] = useState<ProductFormData>(initialData || EMPTY_FORM)
  const [categories, setCategories] = useState<Category[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase.from('categories').select('*').order('name').then(({ data }) => {
      if (data) setCategories(data as Category[])
    })
  }, [])

  const update = (field: string, value: string | boolean | string[]) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const promoPrice = form.promotion_active && form.price && form.promotion_percentage
    ? getDiscountedPrice(Number(form.price), Number(form.promotion_percentage))
    : null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try { await onSubmit(form) } catch { setSaving(false) }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* ═══ 2-COLUMN LAYOUT ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">

        {/* ─── LEFT COLUMN: Info + Pricing ─── */}
        <div className="space-y-4">
          {/* Basic Info */}
          <div className="bg-[#111827] border border-gray-800 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Package className="w-4 h-4 text-blue-400" />
              <h2 className="text-white font-bold text-sm">Informations generales</h2>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Nom du produit *</label>
                <input type="text" value={form.name} onChange={e => update('name', e.target.value)}
                  required placeholder="Ex: Casque Bluetooth Pro"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-green-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Description *</label>
                <textarea value={form.description} onChange={e => update('description', e.target.value)}
                  required rows={3} placeholder="Decrivez votre produit..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-green-500 resize-none" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Categorie</label>
                <select value={form.category_id} onChange={e => update('category_id', e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-green-500">
                  <option value="">Sans categorie</option>
                  {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Pricing + Stock + Status — single row */}
          <div className="bg-[#111827] border border-gray-800 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <DollarSign className="w-4 h-4 text-green-400" />
              <h2 className="text-white font-bold text-sm">Prix & Stock</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Prix (FCFA) *</label>
                <input type="number" value={form.price} onChange={e => update('price', e.target.value)}
                  required min={0} step="0.01"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-green-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Stock *</label>
                <input type="number" value={form.stock} onChange={e => update('stock', e.target.value)}
                  required min={0}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-green-500" />
              </div>
            </div>
            <div className="flex items-center gap-3 mt-3">
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={form.isActive} onChange={e => update('isActive', e.target.checked)} className="sr-only peer" />
                <div className="w-9 h-5 bg-gray-700 peer-checked:bg-green-500 rounded-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full" />
              </label>
              <span className="text-xs text-gray-400 flex items-center gap-1">
                {form.isActive ? <Eye className="w-3.5 h-3.5 text-green-400" /> : <EyeOff className="w-3.5 h-3.5" />}
                {form.isActive ? 'Visible' : 'Masque'}
              </span>
            </div>
          </div>

          {/* Promotion — collapsible */}
          <div className="bg-[#111827] border border-gray-800 rounded-xl p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-orange-400" />
                <h2 className="text-white font-bold text-sm">Promotion</h2>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={form.promotion_active} onChange={e => update('promotion_active', e.target.checked)} className="sr-only peer" />
                <div className="w-9 h-5 bg-gray-700 peer-checked:bg-orange-500 rounded-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full" />
              </label>
            </div>
            {form.promotion_active && (
              <div className="mt-3 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <input type="number" value={form.promotion_percentage} onChange={e => update('promotion_percentage', e.target.value)}
                      min={1} max={99} placeholder="25"
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-green-500" />
                    <Percent className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  </div>
                  {promoPrice !== null && (
                    <div className="bg-green-500/10 border border-green-500/30 rounded-lg px-3 py-2 text-center min-w-[130px]">
                      <p className="text-[9px] text-gray-500 uppercase tracking-wider">Nouveau prix</p>
                      <p className="text-green-400 font-bold">{formatPrice(promoPrice)}</p>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1 flex items-center gap-1"><CalendarDays className="w-3 h-3" /> Debut</label>
                    <input type="datetime-local" value={form.promotion_start_date} onChange={e => update('promotion_start_date', e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-green-500" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1 flex items-center gap-1"><CalendarDays className="w-3 h-3" /> Fin</label>
                    <input type="datetime-local" value={form.promotion_end_date} onChange={e => update('promotion_end_date', e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-green-500" />
                  </div>
                </div>
                <p className="text-gray-600 text-xs flex items-center gap-1"><Info className="w-3 h-3" /> Dates vides = promo permanente</p>
              </div>
            )}
          </div>
        </div>

        {/* ─── RIGHT COLUMN: Images + Colors ─── */}
        <div className="space-y-4">
          {/* Images */}
          <div className="bg-[#111827] border border-gray-800 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <ImagePlus className="w-4 h-4 text-cyan-400" />
              <h2 className="text-white font-bold text-sm">Images</h2>
            </div>
            <ImageInput label="Image principale" value={form.image_url} onChange={v => update('image_url', v)} required />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
              <ImageInput label="Image 2" value={form.image_url1} onChange={v => update('image_url1', v)} compact />
              <ImageInput label="Image 3" value={form.image_url2} onChange={v => update('image_url2', v)} compact />
              <ImageInput label="Image 4" value={form.image_url3} onChange={v => update('image_url3', v)} compact />
              <ImageInput label="Image 5" value={form.image_url4} onChange={v => update('image_url4', v)} compact />
            </div>
          </div>

          {/* Variants */}
          <div className="bg-[#111827] border border-gray-800 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Palette className="w-4 h-4 text-purple-400" />
              <h2 className="text-white font-bold text-sm">Variants</h2>
              {form.variants.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-400/10 text-purple-400">
                  {form.variants.length} type{form.variants.length > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <ProductVariantsManager
              variants={form.variants}
              onChange={v => setForm(prev => ({ ...prev, variants: v }))}
            />
          </div>
        </div>
      </div>

      {/* ═══ STICKY ACTIONS BAR ═══ */}
      <div className="sticky bottom-0 z-10 bg-[#0a0f1a]/95 backdrop-blur-sm border-t border-gray-800 -mx-4 px-4 sm:-mx-8 sm:px-8 py-3 flex gap-3">
        <button type="button" onClick={onCancel}
          className="flex-1 border border-gray-700 hover:border-gray-500 text-gray-300 py-2.5 rounded-lg text-center text-sm transition-colors">
          Annuler
        </button>
        <button type="submit" disabled={saving}
          className="flex-1 bg-green-500 hover:bg-green-600 text-black font-bold py-2.5 rounded-lg flex items-center justify-center gap-2 text-sm transition-colors disabled:opacity-50">
          <Save className="w-4 h-4" />
          {saving ? 'Enregistrement...' : submitLabel}
        </button>
      </div>
    </form>
  )
}
