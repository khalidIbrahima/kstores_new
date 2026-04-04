'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { User, Mail, Phone, Save, Loader2, Package, Heart, ChevronRight } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'

export default function ProfilePage() {
  const { isAuthenticated, displayName, displayEmail, avatarUrl, profile, loading: authLoading } = useAuth()
  const router = useRouter()

  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [orderCount, setOrderCount] = useState(0)

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [authLoading, isAuthenticated, router])

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '')
    }
  }, [profile])

  // Fetch phone from profiles table and order count
  useEffect(() => {
    if (!profile?.id) return

    const fetchProfileData = async () => {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('phone')
        .eq('id', profile.id)
        .single()

      if (profileData && 'phone' in profileData) {
        setPhone((profileData as { phone: string | null }).phone || '')
      }

      const { count } = await supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', profile.id)

      setOrderCount(count || 0)
    }

    fetchProfileData()
  }, [profile?.id])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile?.id) return

    setSaving(true)
    setError(null)
    setSaved(false)

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        full_name: fullName.trim(),
        phone: phone.trim() || null,
      })
      .eq('id', profile.id)

    if (updateError) {
      setError('Erreur lors de la mise a jour du profil')
    } else {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }

    setSaving(false)
  }

  if (authLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <Loader2 className="w-8 h-8 text-green-400 animate-spin mx-auto" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-black italic text-white flex items-center gap-3">
          <User className="w-8 h-8 text-green-400" />
          Mon <span className="text-green-400">Profil</span>
        </h1>
      </div>

      {/* Avatar & Info */}
      <div className="bg-[#111827] border border-gray-800 rounded-xl p-6 mb-6">
        <div className="flex items-center gap-5">
          <div className="relative w-20 h-20 rounded-full overflow-hidden bg-gray-800 flex-shrink-0">
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt={displayName}
                fill
                className="object-cover"
                sizes="80px"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <User className="w-10 h-10 text-gray-600" />
              </div>
            )}
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">{displayName}</h2>
            <p className="text-gray-400 text-sm flex items-center gap-1.5 mt-1">
              <Mail className="w-3.5 h-3.5" />
              {displayEmail}
            </p>
          </div>
        </div>
      </div>

      {/* Edit Form */}
      <form onSubmit={handleSave} className="bg-[#111827] border border-gray-800 rounded-xl p-6 mb-6">
        <h2 className="text-white font-bold text-lg mb-4">Modifier mes informations</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Nom complet</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Votre nom complet"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-3 text-white text-sm outline-none focus:border-green-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Telephone</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+221 XX XXX XX XX"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-3 text-white text-sm outline-none focus:border-green-500"
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          {saved && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 text-green-400 text-sm">
              Profil mis a jour avec succes !
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="bg-green-500 hover:bg-green-600 text-black font-bold px-6 py-3 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </form>

      {/* Quick Links */}
      <div className="grid sm:grid-cols-2 gap-4">
        <Link
          href="/orders"
          className="bg-[#111827] border border-gray-800 rounded-xl p-6 hover:border-green-500/50 transition-all group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <Package className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-white font-medium group-hover:text-green-400 transition-colors">Mes Commandes</p>
                <p className="text-gray-500 text-sm">{orderCount} commande{orderCount > 1 ? 's' : ''}</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-green-400 transition-colors" />
          </div>
        </Link>

        <Link
          href="/favorites"
          className="bg-[#111827] border border-gray-800 rounded-xl p-6 hover:border-green-500/50 transition-all group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <Heart className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-white font-medium group-hover:text-green-400 transition-colors">Mes Favoris</p>
                <p className="text-gray-500 text-sm">Voir mes articles favoris</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-green-400 transition-colors" />
          </div>
        </Link>
      </div>
    </div>
  )
}
