'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
  Package, Plus, Trash2, Edit3, Save, X, Loader2, ExternalLink, Search, Image as ImageIcon,
} from 'lucide-react'
import Image from 'next/image'

interface SupplierProduct {
  id: string
  name: string
  url: string | null
  supplier_name: string | null
  supplier_profile_url: string | null
  ref: string | null
  sku: string | null
  images: string[] | null
  created_at: string
}

const emptyForm = {
  name: '', url: '', supplier_name: '', supplier_profile_url: '', ref: '', sku: '', newImageUrl: '',
}

export default function AdminSuppliers() {
  const [items, setItems] = useState<SupplierProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [tableExists, setTableExists] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState<SupplierProduct | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [formImages, setFormImages] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    const load = async () => {
      const { data, error } = await supabase
        .from('supplier_product')
        .select('*')
        .order('created_at', { ascending: false })

      if (!active) return

      if (error && (error.message.includes('relation') || error.message.includes('does not exist'))) {
        setTableExists(false)
      } else {
        setItems((data || []) as SupplierProduct[])
      }
      setLoading(false)
    }

    void load()

    return () => {
      active = false
    }
  }, [])

  const handleSave = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    const payload = {
      name: form.name,
      url: form.url || null,
      supplier_name: form.supplier_name || null,
      supplier_profile_url: form.supplier_profile_url || null,
      ref: form.ref || null,
      sku: form.sku || null,
      images: formImages.length > 0 ? formImages : null,
    }

    if (editingItem) {
      await supabase.from('supplier_product').update(payload).eq('id', editingItem.id)
      setItems(prev => prev.map(i => i.id === editingItem.id ? { ...i, ...payload } as SupplierProduct : i))
    } else {
      const { data } = await supabase.from('supplier_product').insert(payload).select().single()
      if (data) setItems(prev => [data as SupplierProduct, ...prev])
    }
    setForm(emptyForm); setFormImages([]); setEditingItem(null); setShowForm(false); setSaving(false)
  }

  const handleEdit = (item: SupplierProduct) => {
    setForm({
      name: item.name, url: item.url || '', supplier_name: item.supplier_name || '',
      supplier_profile_url: item.supplier_profile_url || '', ref: item.ref || '', sku: item.sku || '',
      newImageUrl: '',
    })
    setFormImages(Array.isArray(item.images) ? item.images : [])
    setEditingItem(item); setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce produit fournisseur ?')) return
    setDeleting(id)
    await supabase.from('supplier_product').delete().eq('id', id)
    setItems(prev => prev.filter(i => i.id !== id))
    setDeleting(null)
  }

  const handleCancel = () => { setForm(emptyForm); setFormImages([]); setEditingItem(null); setShowForm(false) }

  const filtered = items.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    i.supplier_name?.toLowerCase().includes(search.toLowerCase()) ||
    i.ref?.toLowerCase().includes(search.toLowerCase()) ||
    i.sku?.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-black text-white">Produits fournisseurs</h1>
        <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-green-400 animate-spin" /></div>
      </div>
    )
  }

  if (!tableExists) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-black text-white">Produits fournisseurs</h1>
        <div className="bg-[#111827] border border-gray-800 rounded-xl p-12 text-center">
          <Package className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h2 className="text-white font-bold text-lg mb-2">Table non configuree</h2>
          <p className="text-gray-500 text-sm">La table <code className="text-green-400 bg-green-400/10 px-1.5 py-0.5 rounded">supplier_product</code> n&apos;existe pas encore.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-white sm:text-3xl">Produits fournisseurs</h1>
          <p className="text-gray-500 text-sm mt-1">{items.length} produit{items.length > 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => { setForm(emptyForm); setFormImages([]); setEditingItem(null); setShowForm(true) }}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-500 px-4 py-2.5 text-sm font-bold text-black transition-colors hover:bg-green-600 sm:w-auto">
          <Plus className="w-4 h-4" /> Ajouter
        </button>
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm" onClick={handleCancel}>
          <div className="bg-[#111827] border border-gray-800 rounded-xl w-full max-w-lg mx-4 mt-20 p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-bold text-lg">{editingItem ? 'Modifier' : 'Nouveau'} produit fournisseur</h2>
              <button onClick={handleCancel} className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-1">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Nom du produit *</label>
                <input type="text" value={form.name} onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Nom du produit..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-green-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Fournisseur *</label>
                <input type="text" value={form.supplier_name} onChange={e => setForm(prev => ({ ...prev, supplier_name: e.target.value }))}
                  placeholder="Nom du fournisseur"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-green-500" />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Reference</label>
                  <input type="text" value={form.ref} onChange={e => setForm(prev => ({ ...prev, ref: e.target.value }))}
                    placeholder="Ref produit"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-green-500" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">SKU</label>
                  <input type="text" value={form.sku} onChange={e => setForm(prev => ({ ...prev, sku: e.target.value }))}
                    placeholder="SKU"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-green-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">URL produit</label>
                <input type="url" value={form.url} onChange={e => setForm(prev => ({ ...prev, url: e.target.value }))}
                  placeholder="https://alibaba.com/..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-green-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">URL profil fournisseur</label>
                <input type="url" value={form.supplier_profile_url} onChange={e => setForm(prev => ({ ...prev, supplier_profile_url: e.target.value }))}
                  placeholder="https://..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-green-500" />
              </div>
              {/* Images management */}
              <div>
                <label className="block text-xs text-gray-400 mb-1">Images ({formImages.length})</label>
                {formImages.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {formImages.map((img, i) => (
                      <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden bg-gray-900 border border-gray-700 group">
                        <Image src={img} alt="" fill className="object-cover" sizes="64px" />
                        <button type="button" onClick={() => setFormImages(prev => prev.filter((_, j) => j !== i))}
                          className="absolute top-0.5 right-0.5 bg-red-500/80 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <input type="url" value={form.newImageUrl} onChange={e => setForm(prev => ({ ...prev, newImageUrl: e.target.value }))}
                    placeholder="https://image-url..."
                    onKeyDown={e => {
                      if (e.key === 'Enter' && form.newImageUrl.trim()) {
                        e.preventDefault()
                        setFormImages(prev => [...prev, form.newImageUrl.trim()])
                        setForm(prev => ({ ...prev, newImageUrl: '' }))
                      }
                    }}
                    className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-green-500" />
                  <button type="button" onClick={() => {
                    if (form.newImageUrl.trim()) {
                      setFormImages(prev => [...prev, form.newImageUrl.trim()])
                      setForm(prev => ({ ...prev, newImageUrl: '' }))
                    }
                  }}
                    className="bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 px-3 py-2 rounded-lg text-sm transition-colors">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-5">
              <button onClick={handleCancel} className="px-4 py-2 rounded-lg text-gray-400 hover:text-white text-sm hover:bg-gray-800">Annuler</button>
              <button onClick={handleSave} disabled={saving || !form.name.trim()}
                className="bg-green-500 hover:bg-green-600 text-black font-bold px-5 py-2 rounded-lg flex items-center gap-2 text-sm disabled:opacity-50">
                <Save className="w-4 h-4" /> {saving ? '...' : editingItem ? 'Modifier' : 'Ajouter'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher par nom, fournisseur, ref..."
          className="w-full bg-[#111827] border border-gray-800 rounded-lg pl-10 pr-4 py-2.5 text-white text-sm outline-none focus:border-green-500" />
      </div>

      {/* Table */}
      <div className="bg-[#111827] border border-gray-800 rounded-xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-8 text-center">
            <Package className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500">Aucun produit fournisseur</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
            <thead>
              <tr className="border-b border-gray-800 text-left">
                <th className="px-4 py-3 text-xs text-gray-500 font-medium">Produit</th>
                <th className="px-4 py-3 text-xs text-gray-500 font-medium">Fournisseur</th>
                <th className="px-4 py-3 text-xs text-gray-500 font-medium">Ref</th>
                <th className="px-4 py-3 text-xs text-gray-500 font-medium">SKU</th>
                <th className="px-4 py-3 text-xs text-gray-500 font-medium">Lien</th>
                <th className="px-4 py-3 text-xs text-gray-500 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => (
                <tr key={item.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {item.images && item.images[0] ? (
                        <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-gray-900 flex-shrink-0 border border-gray-700">
                          <Image src={item.images[0]} alt="" fill className="object-cover" sizes="40px" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center flex-shrink-0 border border-gray-700">
                          <ImageIcon className="w-4 h-4 text-gray-600" />
                        </div>
                      )}
                      <span className="text-white text-sm font-medium truncate max-w-[200px]">{item.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-sm">{item.supplier_name || '—'}</td>
                  <td className="px-4 py-3 text-gray-400 text-sm font-mono">{item.ref || '—'}</td>
                  <td className="px-4 py-3 text-gray-400 text-sm font-mono">{item.sku || '—'}</td>
                  <td className="px-4 py-3">
                    {item.url ? (
                      <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-green-400 hover:text-green-300">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    ) : <span className="text-gray-600">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => handleEdit(item)} className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors">
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(item.id)} disabled={deleting === item.id}
                        className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
