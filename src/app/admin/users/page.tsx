'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import {
  Users,
  Shield,
  Search,
  Loader2,
} from 'lucide-react'

interface Profile {
  id: string
  full_name: string
  email: string | null
  avatar_url: string | null
  is_admin: boolean | null
  created_at: string
}

export default function AdminUsers() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [toggling, setToggling] = useState<string | null>(null)

  useEffect(() => {
    supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setProfiles((data || []) as Profile[])
        setLoading(false)
      })
  }, [])

  const toggleAdmin = async (profile: Profile) => {
    setToggling(profile.id)
    const newAdmin = !profile.is_admin
    await supabase.from('profiles').update({ is_admin: newAdmin }).eq('id', profile.id)
    setProfiles(prev => prev.map(p => p.id === profile.id ? { ...p, is_admin: newAdmin } : p))
    setToggling(null)
  }

  const filtered = profiles.filter(p =>
    p.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    p.email?.toLowerCase().includes(search.toLowerCase())
  )

  const totalUsers = profiles.length
  const adminsCount = profiles.filter(p => p.is_admin).length

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-black text-white sm:text-3xl">Utilisateurs</h1>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-green-400 animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header with inline badges */}
      <div>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-black text-white sm:text-3xl">Utilisateurs</h1>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-400/10 text-blue-400">
              {totalUsers} utilisateur{totalUsers > 1 ? 's' : ''}
            </span>
            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-400/10 text-green-400">
              {adminsCount} admin{adminsCount > 1 ? 's' : ''}
            </span>
          </div>
        </div>
        <p className="text-gray-500 text-sm mt-1">Gestion des comptes utilisateurs</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher par nom ou email..."
          className="w-full bg-[#111827] border border-gray-800 rounded-lg pl-10 pr-4 py-3 text-white text-sm outline-none focus:border-green-500"
        />
      </div>

      {/* Table */}
      <div className="bg-[#111827] border border-gray-800 rounded-xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-8 text-center">
            <Users className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500">Aucun utilisateur trouve</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px]">
            <thead>
              <tr className="border-b border-gray-800 text-left">
                <th className="px-4 py-3 text-xs text-gray-500 font-medium">Utilisateur</th>
                <th className="px-4 py-3 text-xs text-gray-500 font-medium">Email</th>
                <th className="px-4 py-3 text-xs text-gray-500 font-medium">Inscrit le</th>
                <th className="px-4 py-3 text-xs text-gray-500 font-medium">Role</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(profile => (
                <tr key={profile.id} className="border-b border-gray-800/50 hover:bg-gray-800/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {profile.avatar_url ? (
                        <Image src={profile.avatar_url} alt="" width={32} height={32} className="rounded-full" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center text-green-400 text-xs font-bold">
                          {profile.full_name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                      )}
                      <span className="text-white text-sm font-medium">{profile.full_name || 'Sans nom'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-sm">{profile.email || '—'}</td>
                  <td className="px-4 py-3 text-gray-400 text-sm">
                    {profile.created_at
                      ? new Date(profile.created_at).toLocaleDateString('fr-FR')
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleAdmin(profile)}
                      disabled={toggling === profile.id}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors disabled:opacity-50 ${
                        profile.is_admin
                          ? 'bg-green-400/10 text-green-400'
                          : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                      }`}
                    >
                      <Shield className="w-3 h-3" />
                      {profile.is_admin ? 'Admin' : 'Client'}
                    </button>
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
