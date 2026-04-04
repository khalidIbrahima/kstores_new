'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { Category } from '@/lib/types'
import { Plus, Trash2, Save, X, FolderOpen } from 'lucide-react'

export default function AdminCategories() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [form, setForm] = useState({ name: '', slug: '', cover_image_url: '' })
  const [saving, setSaving] = useState(false)

  const fetchCategories = async () => {
    const { data } = await supabase.from('categories').select('*').order('name')
    setCategories((data || []) as Category[])
    setLoading(false)
  }

  useEffect(() => { fetchCategories() }, [])

  const generateSlug = (name: string) =>
    name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

  const openNew = () => {
    setEditing(null)
    setForm({ name: '', slug: '', cover_image_url: '' })
    setShowForm(true)
  }

  const openEdit = (cat: Category) => {
    setEditing(cat)
    setForm({ name: cat.name, slug: cat.slug, cover_image_url: cat.cover_image_url || '' })
    setShowForm(true)
  }

  const closeModal = () => {
    setShowForm(false)
  }

  const handleSave = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    const slug = form.slug || generateSlug(form.name)

    if (editing) {
      await supabase
        .from('categories')
        .update({ name: form.name, slug, cover_image_url: form.cover_image_url || null })
        .eq('id', editing.id)
    } else {
      await supabase
        .from('categories')
        .insert({ name: form.name, slug, cover_image_url: form.cover_image_url || null })
    }

    setSaving(false)
    closeModal()
    fetchCategories()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette catégorie ? Les produits ne seront pas supprimés.')) return
    await supabase.from('categories').delete().eq('id', id)
    setCategories(prev => prev.filter(c => c.id !== id))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-black text-white">Catégories</h1>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-gray-700 text-gray-200">
            <FolderOpen className="w-3 h-3" />
            {categories.length}
          </span>
        </div>
        <button
          onClick={openNew}
          className="bg-green-500 hover:bg-green-600 text-black font-bold px-4 py-2.5 rounded-lg flex items-center gap-2 text-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          Ajouter
        </button>
      </div>

      {/* Modal overlay */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) closeModal() }}
        >
          <div className="bg-[#111827] border border-gray-800 rounded-xl w-full max-w-md mx-4 shadow-2xl">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-800">
              <h2 className="text-white font-bold text-lg">{editing ? 'Modifier' : 'Nouvelle'} catégorie</h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal body */}
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Nom *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value, slug: generateSlug(e.target.value) })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white text-sm outline-none focus:border-green-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Slug</label>
                <input
                  type="text"
                  value={form.slug}
                  onChange={e => setForm({ ...form, slug: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white text-sm outline-none focus:border-green-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Image de couverture (URL)</label>
                <input
                  type="url"
                  value={form.cover_image_url}
                  onChange={e => setForm({ ...form, cover_image_url: e.target.value })}
                  placeholder="https://..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white text-sm outline-none focus:border-green-500"
                />
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-end gap-3 px-6 pb-6 pt-2">
              <button
                onClick={closeModal}
                className="px-4 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.name.trim()}
                className="bg-green-500 hover:bg-green-600 text-black font-bold px-6 py-2.5 rounded-lg flex items-center gap-2 text-sm transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Enregistrement...' : editing ? 'Enregistrer' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Categories Grid */}
      {loading ? (
        <div className="text-center text-gray-500 py-8">Chargement...</div>
      ) : categories.length === 0 ? (
        <div className="bg-[#111827] border border-gray-800 rounded-xl p-8 text-center">
          <FolderOpen className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500">Aucune catégorie</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map(cat => (
            <div key={cat.id} className="bg-[#111827] border border-gray-800 rounded-xl overflow-hidden group">
              {cat.cover_image_url && (
                <div className="relative h-32 bg-gray-900">
                  <Image src={cat.cover_image_url} alt="" fill className="object-cover" sizes="300px" />
                </div>
              )}
              <div className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">{cat.name}</p>
                  <p className="text-gray-500 text-xs">{cat.slug}</p>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => openEdit(cat)}
                    className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors text-xs"
                  >
                    Modifier
                  </button>
                  <button
                    onClick={() => handleDelete(cat.id)}
                    className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
