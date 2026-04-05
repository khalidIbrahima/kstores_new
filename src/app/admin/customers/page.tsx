'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { Search, Users, Shield } from 'lucide-react'
import Pagination from '@/components/Pagination'

const ITEMS_PER_PAGE = 10

interface Profile {
  id: string
  full_name: string
  email: string | null
  avatar_url: string | null
  google_id: string | null
  is_admin: boolean | null
  created_at: string
}

export default function AdminCustomers() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

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
    const newAdmin = !profile.is_admin
    await supabase.from('profiles').update({ is_admin: newAdmin }).eq('id', profile.id)
    setProfiles(prev => prev.map(p => p.id === profile.id ? { ...p, is_admin: newAdmin } : p))
  }

  const filtered = profiles.filter(p =>
    p.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    p.email?.toLowerCase().includes(search.toLowerCase())
  )
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE)
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)

  const googleCount = profiles.filter(p => p.google_id).length
  const emailCount = profiles.filter(p => !p.google_id).length

  return (
    <div className="space-y-4">
      {/* Header with inline badges */}
      <div>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-black text-white sm:text-3xl">Clients</h1>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-400/10 text-blue-400">
              {profiles.length} total
            </span>
            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-400/10 text-blue-400">
              {googleCount} Google
            </span>
            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-700 text-gray-300">
              {emailCount} Email
            </span>
          </div>
        </div>
        <p className="text-gray-500 text-sm mt-1">{profiles.length} utilisateur{profiles.length > 1 ? 's' : ''}</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input
          type="text"
          value={search}
          onChange={e => { setSearch(e.target.value); setCurrentPage(1) }}
          placeholder="Rechercher par nom ou email..."
          className="w-full bg-[#111827] border border-gray-800 rounded-lg pl-10 pr-4 py-3 text-white text-sm outline-none focus:border-green-500"
        />
      </div>

      <div className="bg-[#111827] border border-gray-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Chargement...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center">
            <Users className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500">Aucun client trouvé</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
            <thead>
              <tr className="border-b border-gray-800 text-left">
                <th className="px-4 py-3 text-xs text-gray-500 font-medium">Utilisateur</th>
                <th className="px-4 py-3 text-xs text-gray-500 font-medium">Email</th>
                <th className="px-4 py-3 text-xs text-gray-500 font-medium">Méthode</th>
                <th className="px-4 py-3 text-xs text-gray-500 font-medium">Inscrit le</th>
                <th className="px-4 py-3 text-xs text-gray-500 font-medium">Rôle</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map(profile => (
                <tr key={profile.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
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
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      profile.google_id ? 'bg-blue-400/10 text-blue-400' : 'bg-gray-700 text-gray-400'
                    }`}>
                      {profile.google_id ? 'Google' : 'Email'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-sm">
                    {profile.created_at
                      ? new Date(profile.created_at).toLocaleDateString('fr-FR')
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleAdmin(profile)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
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
      <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
    </div>
  )
}
