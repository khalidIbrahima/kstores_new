'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Save, Loader2, Store, CreditCard, Truck, Globe, Phone, Mail } from 'lucide-react'

interface SettingsData {
  id: string
  store_name: string
  store_url: string | null
  contact_email: string | null
  support_phone: string | null
  store_description: string | null
  currency: string | null
  tax_rate: number | null
  maintenance_mode: boolean | null
  payment_methods: {
    wave?: boolean
    paypal?: boolean
    credit_card?: boolean
    bank_transfer?: boolean
    orange_money?: boolean
  } | null
  shipping_options: {
    local_pickup?: boolean
    express_shipping_cost?: number
    standard_shipping_cost?: number
    free_shipping_threshold?: number
  } | null
  social_media: {
    twitter?: string
    facebook?: string
    instagram?: string
    youtube?: string
    linkedin?: string
  } | null
}

type Tab = 'boutique' | 'contact' | 'paiements' | 'livraison' | 'reseaux'

const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'boutique', label: 'Boutique', icon: <Store className="w-4 h-4" /> },
  { id: 'contact', label: 'Contact', icon: <Phone className="w-4 h-4" /> },
  { id: 'paiements', label: 'Paiements', icon: <CreditCard className="w-4 h-4" /> },
  { id: 'livraison', label: 'Livraison', icon: <Truck className="w-4 h-4" /> },
  { id: 'reseaux', label: 'Reseaux sociaux', icon: <Globe className="w-4 h-4" /> },
]

export default function AdminSettings() {
  const [settings, setSettings] = useState<SettingsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('boutique')

  useEffect(() => {
    supabase.from('store_settings').select('*').single().then(({ data }) => {
      if (data) setSettings(data as SettingsData)
      setLoading(false)
    })
  }, [])

  const handleSave = async () => {
    if (!settings) return
    setSaving(true)
    setSaved(false)

    const { id, ...updates } = settings
    await supabase.from('store_settings').update(updates).eq('id', id)

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const updateField = (field: string, value: unknown) => {
    setSettings(prev => prev ? { ...prev, [field]: value } : null)
  }

  const updatePayment = (key: string, enabled: boolean) => {
    setSettings(prev => {
      if (!prev) return null
      return {
        ...prev,
        payment_methods: { ...prev.payment_methods, [key]: enabled },
      }
    })
  }

  const updateShipping = (key: string, value: number | boolean) => {
    setSettings(prev => {
      if (!prev) return null
      return {
        ...prev,
        shipping_options: { ...prev.shipping_options, [key]: value },
      }
    })
  }

  const updateSocial = (key: string, value: string) => {
    setSettings(prev => {
      if (!prev) return null
      return {
        ...prev,
        social_media: { ...prev.social_media, [key]: value },
      }
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-green-400 animate-spin" />
      </div>
    )
  }

  if (!settings) return <p className="text-gray-500">Paramètres introuvables</p>

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white sm:text-3xl">Paramètres</h1>
        <p className="text-gray-500 text-sm mt-1">Configuration de votre boutique</p>
      </div>

      {/* Tab bar */}
      <div className="bg-[#0d1117] border border-gray-800 rounded-xl overflow-hidden">
        <div className="flex overflow-x-auto scrollbar-hide border-b border-gray-800">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'text-green-400 border-b-2 border-green-400'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="p-6">
          {/* Boutique tab */}
          {activeTab === 'boutique' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Nom de la boutique</label>
                  <input
                    type="text"
                    value={settings.store_name}
                    onChange={e => updateField('store_name', e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white text-sm outline-none focus:border-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">URL</label>
                  <input
                    type="url"
                    value={settings.store_url || ''}
                    onChange={e => updateField('store_url', e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white text-sm outline-none focus:border-green-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Description</label>
                <textarea
                  value={settings.store_description || ''}
                  onChange={e => updateField('store_description', e.target.value)}
                  rows={3}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white text-sm outline-none focus:border-green-500 resize-none"
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Devise</label>
                  <select
                    value={settings.currency || 'XOF'}
                    onChange={e => updateField('currency', e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white text-sm outline-none focus:border-green-500"
                  >
                    <option value="XOF">XOF (FCFA)</option>
                    <option value="EUR">EUR</option>
                    <option value="USD">USD</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Taux de taxe (%)</label>
                  <input
                    type="number"
                    value={settings.tax_rate ?? 0}
                    onChange={e => updateField('tax_rate', Number(e.target.value))}
                    min={0}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white text-sm outline-none focus:border-green-500"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.maintenance_mode || false}
                    onChange={e => updateField('maintenance_mode', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-gray-700 peer-checked:bg-yellow-500 rounded-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full" />
                </label>
                <span className="text-sm text-gray-400">Mode maintenance</span>
              </div>
            </div>
          )}

          {/* Contact tab */}
          {activeTab === 'contact' && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  <Mail className="w-3 h-3 inline mr-1" />Email de contact
                </label>
                <input
                  type="email"
                  value={settings.contact_email || ''}
                  onChange={e => updateField('contact_email', e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white text-sm outline-none focus:border-green-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  <Phone className="w-3 h-3 inline mr-1" />Téléphone
                </label>
                <input
                  type="tel"
                  value={settings.support_phone || ''}
                  onChange={e => updateField('support_phone', e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white text-sm outline-none focus:border-green-500"
                />
              </div>
            </div>
          )}

          {/* Paiements tab */}
          {activeTab === 'paiements' && (
            <div className="space-y-3">
              {[
                { key: 'wave', label: 'Wave' },
                { key: 'orange_money', label: 'Orange Money' },
                { key: 'credit_card', label: 'Carte bancaire' },
                { key: 'paypal', label: 'PayPal' },
                { key: 'bank_transfer', label: 'Virement bancaire' },
              ].map(method => (
                <div key={method.key} className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg">
                  <span className="text-gray-300 text-sm">{method.label}</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.payment_methods?.[method.key as keyof typeof settings.payment_methods] || false}
                      onChange={e => updatePayment(method.key, e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gray-700 peer-checked:bg-green-500 rounded-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full" />
                  </label>
                </div>
              ))}
            </div>
          )}

          {/* Livraison tab */}
          {activeTab === 'livraison' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Livraison standard (FCFA)</label>
                  <input
                    type="number"
                    value={settings.shipping_options?.standard_shipping_cost ?? 0}
                    onChange={e => updateShipping('standard_shipping_cost', Number(e.target.value))}
                    min={0}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white text-sm outline-none focus:border-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Livraison express (FCFA)</label>
                  <input
                    type="number"
                    value={settings.shipping_options?.express_shipping_cost ?? 0}
                    onChange={e => updateShipping('express_shipping_cost', Number(e.target.value))}
                    min={0}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white text-sm outline-none focus:border-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Seuil livraison gratuite (FCFA)</label>
                  <input
                    type="number"
                    value={settings.shipping_options?.free_shipping_threshold ?? 0}
                    onChange={e => updateShipping('free_shipping_threshold', Number(e.target.value))}
                    min={0}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white text-sm outline-none focus:border-green-500"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.shipping_options?.local_pickup || false}
                    onChange={e => updateShipping('local_pickup', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-gray-700 peer-checked:bg-green-500 rounded-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full" />
                </label>
                <span className="text-sm text-gray-400">Retrait en boutique</span>
              </div>
            </div>
          )}

          {/* Reseaux sociaux tab */}
          {activeTab === 'reseaux' && (
            <div className="space-y-4">
              {[
                { key: 'facebook', label: 'Facebook' },
                { key: 'instagram', label: 'Instagram' },
                { key: 'twitter', label: 'Twitter / X' },
                { key: 'youtube', label: 'YouTube' },
                { key: 'linkedin', label: 'LinkedIn' },
              ].map(social => (
                <div key={social.key}>
                  <label className="block text-sm text-gray-400 mb-1">{social.label}</label>
                  <input
                    type="url"
                    value={settings.social_media?.[social.key as keyof typeof settings.social_media] || ''}
                    onChange={e => updateSocial(social.key, e.target.value)}
                    placeholder="https://..."
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white text-sm outline-none focus:border-green-500"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Save button - always visible */}
      <div className="flex justify-stretch pb-8 sm:justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-500 px-8 py-3 font-bold text-black transition-colors hover:bg-green-600 disabled:opacity-50 sm:w-auto"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Enregistrement...' : saved ? 'Enregistré !' : 'Enregistrer les modifications'}
        </button>
      </div>
    </div>
  )
}
