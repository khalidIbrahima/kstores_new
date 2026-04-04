'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
  Truck,
  Plus,
  Trash2,
  Edit3,
  Save,
  X,
  Loader2,
  Phone,
  Mail,
  MapPin,
} from 'lucide-react'

interface ShippingAgency {
  id: string
  name: string
  phone: string | null
  email: string | null
  address: string | null
  created_at: string
}

const emptyForm = {
  name: '',
  phone: '',
  email: '',
  address: '',
}

export default function AdminShipping() {
  const [agencies, setAgencies] = useState<ShippingAgency[]>([])
  const [loading, setLoading] = useState(true)
  const [tableExists, setTableExists] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState<ShippingAgency | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  const fetchData = async () => {
    const { data, error } = await supabase
      .from('shipping_agencies')
      .select('*')
      .order('created_at', { ascending: false })

    if (error && error.message.includes('relation')) {
      setTableExists(false)
    } else {
      setAgencies((data || []) as ShippingAgency[])
    }
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const handleSave = async () => {
    if (!form.name.trim()) return
    setSaving(true)

    const payload = {
      name: form.name,
      phone: form.phone || null,
      email: form.email || null,
      address: form.address || null,
    }

    if (editingItem) {
      await supabase.from('shipping_agencies').update(payload).eq('id', editingItem.id)
      setAgencies(prev =>
        prev.map(a => a.id === editingItem.id ? { ...a, ...payload } : a)
      )
    } else {
      const { data } = await supabase
        .from('shipping_agencies')
        .insert(payload)
        .select()
        .single()
      if (data) setAgencies(prev => [data as ShippingAgency, ...prev])
    }

    setForm(emptyForm)
    setEditingItem(null)
    setShowForm(false)
    setSaving(false)
  }

  const handleEdit = (agency: ShippingAgency) => {
    setForm({
      name: agency.name,
      phone: agency.phone || '',
      email: agency.email || '',
      address: agency.address || '',
    })
    setEditingItem(agency)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette agence de livraison ?')) return
    setDeleting(id)
    await supabase.from('shipping_agencies').delete().eq('id', id)
    setAgencies(prev => prev.filter(a => a.id !== id))
    setDeleting(null)
  }

  const handleCancel = () => {
    setForm(emptyForm)
    setEditingItem(null)
    setShowForm(false)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-black text-white">Livraison</h1>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-green-400 animate-spin" />
        </div>
      </div>
    )
  }

  if (!tableExists) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-black text-white">Livraison</h1>
          <p className="text-gray-500 text-sm mt-1">Agences de livraison</p>
        </div>
        <div className="bg-[#111827] border border-gray-800 rounded-xl p-12 text-center">
          <Truck className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h2 className="text-white font-bold text-lg mb-2">Table non configuree</h2>
          <p className="text-gray-500 text-sm max-w-md mx-auto">
            La table <code className="text-green-400 bg-green-400/10 px-1.5 py-0.5 rounded">shipping_agencies</code> n&apos;existe pas encore dans votre base de donnees Supabase.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white">Livraison</h1>
          <p className="text-gray-500 text-sm mt-1">{agencies.length} agence{agencies.length > 1 ? 's' : ''} de livraison</p>
        </div>
        <button
          onClick={() => { setForm(emptyForm); setEditingItem(null); setShowForm(true) }}
          className="bg-green-500 hover:bg-green-600 text-black font-bold px-4 py-2.5 rounded-lg flex items-center gap-2 text-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          Ajouter
        </button>
      </div>

      {/* Modal Overlay */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm"
          onClick={handleCancel}
        >
          <div
            className="bg-[#111827] border border-gray-800 rounded-xl w-full max-w-lg mx-4 mt-20 p-6"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-white font-bold text-lg">{editingItem ? 'Modifier l\'agence' : 'Nouvelle agence'}</h2>
              <button onClick={handleCancel} className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Nom</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Nom de l'agence..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white text-sm outline-none focus:border-green-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Telephone</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={e => setForm(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="+225..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white text-sm outline-none focus:border-green-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="contact@..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white text-sm outline-none focus:border-green-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Adresse</label>
                <input
                  type="text"
                  value={form.address}
                  onChange={e => setForm(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Adresse..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white text-sm outline-none focus:border-green-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={handleCancel}
                className="px-4 py-2.5 rounded-lg text-gray-400 hover:text-white text-sm font-medium hover:bg-gray-800 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.name.trim()}
                className="bg-green-500 hover:bg-green-600 text-black font-bold px-5 py-2.5 rounded-lg flex items-center gap-2 text-sm transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Enregistrement...' : editingItem ? 'Modifier' : 'Ajouter'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Agency Cards */}
      {agencies.length === 0 ? (
        <div className="bg-[#111827] border border-gray-800 rounded-xl p-8 text-center">
          <Truck className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500">Aucune agence de livraison</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {agencies.map(agency => (
            <div key={agency.id} className="bg-[#111827] border border-gray-800 rounded-xl p-6 hover:border-gray-700 transition-colors">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-400/10 flex items-center justify-center">
                    <Truck className="w-5 h-5 text-green-400" />
                  </div>
                  <h3 className="text-white font-bold">{agency.name}</h3>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleEdit(agency)}
                    className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(agency.id)}
                    disabled={deleting === agency.id}
                    className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                {agency.phone && (
                  <div className="flex items-center gap-2 text-gray-400 text-sm">
                    <Phone className="w-3.5 h-3.5 text-gray-500" />
                    {agency.phone}
                  </div>
                )}
                {agency.email && (
                  <div className="flex items-center gap-2 text-gray-400 text-sm">
                    <Mail className="w-3.5 h-3.5 text-gray-500" />
                    {agency.email}
                  </div>
                )}
                {agency.address && (
                  <div className="flex items-center gap-2 text-gray-400 text-sm">
                    <MapPin className="w-3.5 h-3.5 text-gray-500" />
                    {agency.address}
                  </div>
                )}
                {!agency.phone && !agency.email && !agency.address && (
                  <p className="text-gray-600 text-sm">Aucune information de contact</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
