'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { adminFetch } from '@/lib/admin-fetch'
import { Save, Loader2, Store, CreditCard, Truck, Globe, Phone, Mail, Bot, Check, X, KeyRound } from 'lucide-react'

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
  ai_provider: 'groq' | 'anthropic' | null
}

type Tab = 'boutique' | 'contact' | 'paiements' | 'livraison' | 'reseaux' | 'ia'

const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'boutique', label: 'Boutique', icon: <Store className="w-4 h-4" /> },
  { id: 'contact', label: 'Contact', icon: <Phone className="w-4 h-4" /> },
  { id: 'paiements', label: 'Paiements', icon: <CreditCard className="w-4 h-4" /> },
  { id: 'livraison', label: 'Livraison', icon: <Truck className="w-4 h-4" /> },
  { id: 'reseaux', label: 'Reseaux sociaux', icon: <Globe className="w-4 h-4" /> },
  { id: 'ia', label: 'IA', icon: <Bot className="w-4 h-4" /> },
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
    const res = await adminFetch('/api/admin/store-settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, updates }),
    })

    setSaving(false)
    if (res.ok) {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } else {
      const payload = await res.json().catch(() => ({}))
      alert(`Erreur: ${payload.error || 'Echec de l\'enregistrement'}`)
    }
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

          {/* IA tab */}
          {activeTab === 'ia' && (
            <AiSection
              settingsId={settings.id}
              provider={settings.ai_provider || 'groq'}
              onProviderChange={value => updateField('ai_provider', value)}
            />
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

interface KeyStatus {
  anthropic: boolean
  groq: boolean
}

function AiSection({
  settingsId,
  provider,
  onProviderChange,
}: {
  settingsId: string
  provider: 'groq' | 'anthropic'
  onProviderChange: (value: 'groq' | 'anthropic') => void
}) {
  const [status, setStatus] = useState<KeyStatus | null>(null)
  const [loadingStatus, setLoadingStatus] = useState(true)
  const [savingProvider, setSavingProvider] = useState<'groq' | 'anthropic' | null>(null)
  const [providerError, setProviderError] = useState<string | null>(null)

  const refreshStatus = async () => {
    try {
      const res = await adminFetch('/api/admin/ai-keys')
      const data = await res.json()
      if (res.ok) setStatus({ anthropic: !!data.anthropic, groq: !!data.groq })
    } finally {
      setLoadingStatus(false)
    }
  }

  useEffect(() => {
    refreshStatus()
  }, [])

  const selectProvider = async (value: 'groq' | 'anthropic') => {
    if (value === provider) return
    setSavingProvider(value)
    setProviderError(null)
    onProviderChange(value)

    const res = await adminFetch('/api/admin/store-settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: settingsId, updates: { ai_provider: value } }),
    })

    if (!res.ok) {
      const payload = await res.json().catch(() => ({}))
      setProviderError(payload.error || 'Echec de l\'enregistrement')
      onProviderChange(provider)
    }
    setSavingProvider(null)
  }

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm text-gray-400 mb-2">Fournisseur actif</label>
        <div className="grid grid-cols-2 gap-3">
          {[
            { key: 'groq' as const, label: 'Groq', sub: 'LLaMA 3.3 70B' },
            { key: 'anthropic' as const, label: 'Anthropic', sub: 'Claude Haiku 4.5' },
          ].map(opt => (
            <button
              key={opt.key}
              type="button"
              onClick={() => selectProvider(opt.key)}
              disabled={savingProvider !== null}
              className={`p-4 rounded-lg border-2 text-left transition-colors disabled:opacity-60 ${
                provider === opt.key
                  ? 'border-green-500 bg-green-500/10'
                  : 'border-gray-800 bg-gray-800/30 hover:border-gray-700'
              }`}
            >
              <p className="text-white font-bold text-sm">{opt.label}</p>
              <p className="text-gray-500 text-xs mt-0.5">{opt.sub}</p>
              {provider === opt.key && (
                <p className="text-green-400 text-xs mt-2 flex items-center gap-1">
                  {savingProvider === opt.key ? (
                    <><Loader2 className="w-3 h-3 animate-spin" /> Enregistrement...</>
                  ) : (
                    <><Check className="w-3 h-3" /> Actif</>
                  )}
                </p>
              )}
            </button>
          ))}
        </div>
        {providerError && (
          <p className="text-red-400 text-xs mt-2">Erreur: {providerError}</p>
        )}
      </div>

      <div className="border-t border-gray-800 pt-6">
        <div className="flex items-center gap-2 mb-1">
          <KeyRound className="w-4 h-4 text-purple-400" />
          <h3 className="text-white font-bold text-sm">Cles API (stockees dans Supabase Vault)</h3>
        </div>
        <p className="text-gray-500 text-xs mb-4">
          Les cles sont chiffrees au repos. Elles ne sont jamais renvoyees au navigateur — seul le statut &laquo; configuree &raquo; est affiche.
        </p>

        <div className="space-y-3">
          <KeyInput
            name="anthropic_api_key"
            label="Anthropic API Key"
            placeholder="sk-ant-..."
            isSet={status?.anthropic ?? false}
            loadingStatus={loadingStatus}
            onSaved={refreshStatus}
          />
          <KeyInput
            name="groq_api_key"
            label="Groq API Key"
            placeholder="gsk_..."
            isSet={status?.groq ?? false}
            loadingStatus={loadingStatus}
            onSaved={refreshStatus}
          />
        </div>
      </div>
    </div>
  )
}

function KeyInput({
  name,
  label,
  placeholder,
  isSet,
  loadingStatus,
  onSaved,
}: {
  name: 'anthropic_api_key' | 'groq_api_key'
  label: string
  placeholder: string
  isSet: boolean
  loadingStatus: boolean
  onSaved: () => void | Promise<void>
}) {
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedOk, setSavedOk] = useState(false)

  const handleSave = async () => {
    if (value.trim().length < 10) {
      setError('Cle trop courte')
      return
    }
    setBusy(true)
    setError(null)
    setSavedOk(false)
    try {
      const res = await adminFetch('/api/admin/ai-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, value }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Erreur')
      setValue('')
      setSavedOk(true)
      await onSaved()
      setTimeout(() => setSavedOk(false), 2500)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="bg-gray-800/30 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-gray-300 text-sm font-medium">{label}</span>
        {loadingStatus ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-500" />
        ) : isSet ? (
          <span className="inline-flex items-center gap-1 text-xs text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full">
            <Check className="w-3 h-3" /> Configuree
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-700/40 px-2 py-0.5 rounded-full">
            <X className="w-3 h-3" /> Non configuree
          </span>
        )}
      </div>
      <div className="flex gap-2">
        <input
          type="password"
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder={isSet ? 'Remplacer la cle existante...' : placeholder}
          className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm font-mono outline-none focus:border-purple-500"
          autoComplete="off"
        />
        <button
          type="button"
          onClick={handleSave}
          disabled={busy || value.trim().length < 10}
          className="bg-purple-500 hover:bg-purple-600 text-white text-sm font-bold px-4 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5"
        >
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : savedOk ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
          {savedOk ? 'OK' : 'Enregistrer'}
        </button>
      </div>
      {error && <p className="text-red-400 text-xs mt-1.5">{error}</p>}
    </div>
  )
}
