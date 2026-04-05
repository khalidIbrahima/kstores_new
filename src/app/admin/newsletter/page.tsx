'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
  Mail, Search, Loader2, Trash2, Send, Users, UserMinus, UserPlus,
  Download, Plus, X, Save, CheckCircle2,
} from 'lucide-react'

interface Subscriber {
  id: string
  email: string
  status: string
  source: string | null
  subscribed_at: string
  unsubscribed_at: string | null
}

export default function AdminNewsletter() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([])
  const [loading, setLoading] = useState(true)
  const [tableExists, setTableExists] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'unsubscribed'>('all')
  const [showAddForm, setShowAddForm] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  // Campaign state
  const [showCampaign, setShowCampaign] = useState(false)
  const [campaignSubject, setCampaignSubject] = useState('')
  const [campaignBody, setCampaignBody] = useState('')
  const [sending, setSending] = useState(false)
  const [sendResult, setSendResult] = useState<{ sent: number; failed: number } | null>(null)

  const fetchData = async () => {
    const { data, error } = await supabase
      .from('newsletter_subscribers')
      .select('*')
      .order('subscribed_at', { ascending: false })

    if (error && (error.message.includes('relation') || error.message.includes('does not exist'))) {
      setTableExists(false)
    } else {
      setSubscribers((data || []) as Subscriber[])
    }
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const handleAdd = async () => {
    if (!newEmail.trim()) return
    setSaving(true)
    const { data, error } = await supabase
      .from('newsletter_subscribers')
      .upsert({ email: newEmail.trim().toLowerCase(), status: 'active', source: 'admin' }, { onConflict: 'email' })
      .select()
      .single()

    if (!error && data) {
      setSubscribers(prev => {
        const exists = prev.find(s => s.email === data.email)
        if (exists) return prev.map(s => s.email === data.email ? data as Subscriber : s)
        return [data as Subscriber, ...prev]
      })
    }
    setNewEmail(''); setShowAddForm(false); setSaving(false)
  }

  const handleToggleStatus = async (sub: Subscriber) => {
    const newStatus = sub.status === 'active' ? 'unsubscribed' : 'active'
    const update: Record<string, unknown> = { status: newStatus }
    if (newStatus === 'unsubscribed') update.unsubscribed_at = new Date().toISOString()
    else update.unsubscribed_at = null

    await supabase.from('newsletter_subscribers').update(update).eq('id', sub.id)
    setSubscribers(prev => prev.map(s => s.id === sub.id ? { ...s, ...update } as Subscriber : s))
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer definitivement cet abonne ?')) return
    setDeleting(id)
    await supabase.from('newsletter_subscribers').delete().eq('id', id)
    setSubscribers(prev => prev.filter(s => s.id !== id))
    setDeleting(null)
  }

  const exportCSV = () => {
    const activeOnly = subscribers.filter(s => s.status === 'active')
    const rows = ['Email,Date inscription,Source']
    activeOnly.forEach(s => {
      rows.push(`${s.email},${new Date(s.subscribed_at).toLocaleDateString('fr-FR')},${s.source || 'website'}`)
    })
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `newsletter-subscribers-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  const handleSendCampaign = async () => {
    if (!campaignSubject.trim() || !campaignBody.trim()) return
    const activeEmails = subscribers.filter(s => s.status === 'active').map(s => s.email)
    if (activeEmails.length === 0) { alert('Aucun abonne actif'); return }
    if (!confirm(`Envoyer a ${activeEmails.length} abonne(s) ?`)) return

    setSending(true)
    setSendResult(null)
    let sent = 0, failed = 0

    // Send in batches of 5
    for (let i = 0; i < activeEmails.length; i += 5) {
      const batch = activeEmails.slice(i, i + 5)
      const results = await Promise.allSettled(
        batch.map(email =>
          fetch('/api/newsletter/campaign', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, subject: campaignSubject, body: campaignBody }),
          })
        )
      )
      results.forEach(r => { if (r.status === 'fulfilled') sent++; else failed++ })
    }

    setSendResult({ sent, failed })
    setSending(false)
  }

  const total = subscribers.length
  const active = subscribers.filter(s => s.status === 'active').length
  const unsubscribed = subscribers.filter(s => s.status === 'unsubscribed').length

  const filtered = subscribers.filter(s => {
    if (statusFilter !== 'all' && s.status !== statusFilter) return false
    if (search && !s.email.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-lg sm:text-2xl font-black text-white">Newsletter</h1>
        <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-green-400 animate-spin" /></div>
      </div>
    )
  }

  if (!tableExists) {
    return (
      <div className="space-y-4">
        <h1 className="text-lg sm:text-2xl font-black text-white">Newsletter</h1>
        <div className="bg-[#111827] border border-gray-800 rounded-xl p-12 text-center">
          <Mail className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h2 className="text-white font-bold text-lg mb-2">Table non configuree</h2>
          <p className="text-gray-500 text-sm max-w-md mx-auto mb-4">
            Creez la table <code className="text-green-400 bg-green-400/10 px-1.5 py-0.5 rounded">newsletter_subscribers</code> dans Supabase.
          </p>
          <pre className="text-left text-xs text-gray-400 bg-[#0a0f1a] border border-gray-800 rounded-lg p-4 max-w-lg mx-auto overflow-x-auto">{`CREATE TABLE newsletter_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  status text DEFAULT 'active',
  source text DEFAULT 'website',
  subscribed_at timestamptz DEFAULT now(),
  unsubscribed_at timestamptz
);

ALTER TABLE newsletter_subscribers
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all_insert"
  ON newsletter_subscribers FOR INSERT
  WITH CHECK (true);
CREATE POLICY "allow_all_select"
  ON newsletter_subscribers FOR SELECT
  USING (true);
CREATE POLICY "allow_all_update"
  ON newsletter_subscribers FOR UPDATE
  USING (true);
CREATE POLICY "allow_all_delete"
  ON newsletter_subscribers FOR DELETE
  USING (true);`}</pre>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-2xl font-black text-white">Newsletter</h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-400/10 text-green-400">{active} actifs</span>
            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-700 text-gray-300">{unsubscribed} desinscrits</span>
            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-400/10 text-blue-400">{total} total</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-400 border border-gray-700 hover:border-gray-500 rounded-lg transition-colors">
            <Download className="w-4 h-4" /> Exporter
          </button>
          <button onClick={() => setShowCampaign(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-purple-400 border border-purple-500/30 hover:border-purple-500/50 rounded-lg transition-colors">
            <Send className="w-4 h-4" /> Campagne
          </button>
          <button onClick={() => setShowAddForm(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-sm bg-green-500 hover:bg-green-600 text-black font-bold rounded-lg transition-colors">
            <Plus className="w-4 h-4" /> Ajouter
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par email..."
            className="w-full bg-[#111827] border border-gray-800 rounded-lg pl-10 pr-4 py-2.5 text-white text-sm outline-none focus:border-green-500" />
        </div>
        <div className="flex gap-1 bg-[#0d1117] border border-gray-800 rounded-lg p-1">
          {(['all', 'active', 'unsubscribed'] as const).map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${statusFilter === s ? 'bg-[#111827] text-green-400' : 'text-gray-500 hover:text-gray-300'}`}>
              {s === 'all' ? 'Tous' : s === 'active' ? 'Actifs' : 'Desinscrits'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#111827] border border-gray-800 rounded-xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-8 text-center">
            <Mail className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500">Aucun abonne</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800 text-left">
                  <th className="px-4 py-3 text-xs text-gray-500 font-medium">Email</th>
                  <th className="px-4 py-3 text-xs text-gray-500 font-medium">Source</th>
                  <th className="px-4 py-3 text-xs text-gray-500 font-medium">Date</th>
                  <th className="px-4 py-3 text-xs text-gray-500 font-medium">Statut</th>
                  <th className="px-4 py-3 text-xs text-gray-500 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(sub => (
                  <tr key={sub.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 group">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
                          <Mail className="w-3.5 h-3.5 text-green-400" />
                        </div>
                        <span className="text-white text-sm font-medium">{sub.email}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-700 text-gray-300">{sub.source || 'website'}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-sm">
                      {new Date(sub.subscribed_at).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => handleToggleStatus(sub)}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                          sub.status === 'active' ? 'bg-green-400/10 text-green-400 hover:bg-green-400/20' : 'bg-red-400/10 text-red-400 hover:bg-red-400/20'
                        }`}>
                        {sub.status === 'active' ? <><UserPlus className="w-3 h-3" /> Actif</> : <><UserMinus className="w-3 h-3" /> Desinscrit</>}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleDelete(sub.id)} disabled={deleting === sub.id}
                          className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-gray-800 rounded transition-colors disabled:opacity-50">
                          <Trash2 className="w-3.5 h-3.5" />
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

      {/* Add subscriber modal */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowAddForm(false)}>
          <div className="bg-[#111827] border border-gray-800 rounded-xl w-full max-w-md mx-4 mt-10 sm:mt-20 p-4 sm:p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold">Ajouter un abonne</h3>
              <button onClick={() => setShowAddForm(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Email *</label>
              <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)}
                placeholder="email@example.com"
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-green-500" />
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => setShowAddForm(false)} className="px-4 py-2 text-gray-400 text-sm hover:text-white">Annuler</button>
              <button onClick={handleAdd} disabled={saving || !newEmail.trim()}
                className="bg-green-500 hover:bg-green-600 text-black font-bold px-5 py-2 rounded-lg flex items-center gap-2 text-sm disabled:opacity-50">
                <Save className="w-4 h-4" /> {saving ? '...' : 'Ajouter'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Campaign modal */}
      {showCampaign && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm" onClick={() => { setShowCampaign(false); setSendResult(null) }}>
          <div className="bg-[#111827] border border-gray-800 rounded-xl w-full max-w-lg mx-4 mt-16 p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold flex items-center gap-2">
                <Send className="w-4 h-4 text-purple-400" /> Envoyer une campagne
              </h3>
              <button onClick={() => { setShowCampaign(false); setSendResult(null) }} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-gray-500 text-xs mb-4">Sera envoye a {active} abonne{active > 1 ? 's' : ''} actif{active > 1 ? 's' : ''}</p>

            {sendResult ? (
              <div className="text-center py-6">
                <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-3" />
                <p className="text-white font-bold">Campagne envoyee !</p>
                <p className="text-green-400 text-sm mt-1">{sendResult.sent} envoye{sendResult.sent > 1 ? 's' : ''}</p>
                {sendResult.failed > 0 && <p className="text-red-400 text-sm">{sendResult.failed} echec{sendResult.failed > 1 ? 's' : ''}</p>}
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Sujet *</label>
                  <input type="text" value={campaignSubject} onChange={e => setCampaignSubject(e.target.value)}
                    placeholder="Nouveautes, offres speciales..."
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-green-500" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Contenu *</label>
                  <textarea value={campaignBody} onChange={e => setCampaignBody(e.target.value)}
                    rows={6} placeholder="Ecrivez votre message ici... (HTML supporte)"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-green-500 resize-none" />
                </div>
                <div className="flex justify-end gap-3 mt-4">
                  <button onClick={() => setShowCampaign(false)} className="px-4 py-2 text-gray-400 text-sm hover:text-white">Annuler</button>
                  <button onClick={handleSendCampaign} disabled={sending || !campaignSubject.trim() || !campaignBody.trim()}
                    className="bg-purple-500 hover:bg-purple-600 text-white font-bold px-5 py-2 rounded-lg flex items-center gap-2 text-sm disabled:opacity-50">
                    <Send className="w-4 h-4" /> {sending ? 'Envoi en cours...' : `Envoyer a ${active} abonnes`}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
