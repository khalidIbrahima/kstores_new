'use client'

import { useState, useEffect, useCallback } from 'react'
import { Mail, Phone, MapPin, Send } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import Turnstile from '@/components/Turnstile'

export default function ContactPage() {
  const { isAuthenticated, displayName, displayEmail } = useAuth()
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' })
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  // Pre-fill from session
  useEffect(() => {
    if (!isAuthenticated) return
    setForm(prev => ({
      ...prev,
      name: prev.name || displayName,
      email: prev.email || displayEmail,
    }))
  }, [isAuthenticated, displayName, displayEmail])

  const [error, setError] = useState('')
  const [turnstileToken, setTurnstileToken] = useState('')

  const handleTurnstile = useCallback((token: string) => setTurnstileToken(token), [])
  const handleTurnstileExpire = useCallback(() => setTurnstileToken(''), [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSending(true)
    setError('')
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, turnstileToken }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Erreur lors de l'envoi")
      }
      setSent(true)
      setForm(prev => ({ ...prev, subject: '', message: '' }))
      setTimeout(() => setSent(false), 5000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'envoi du message.")
    }
    setSending(false)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-12">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black italic text-white">
          Contactez-<span className="text-green-400">nous</span>
        </h1>
        <p className="text-gray-500 mt-2 max-w-lg mx-auto">
          Nous sommes là pour vous aider ! Envoyez-nous un message et nous vous répondrons dès que possible.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Contact Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="bg-[#111827] border border-gray-800 rounded-xl p-6 space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Votre Nom</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white outline-none focus:border-green-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Adresse Email</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white outline-none focus:border-green-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Sujet</label>
              <input
                type="text"
                required
                value={form.subject}
                onChange={e => setForm({ ...form, subject: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white outline-none focus:border-green-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Message</label>
              <textarea
                required
                rows={5}
                value={form.message}
                onChange={e => setForm({ ...form, message: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white outline-none focus:border-green-500 resize-none"
              />
            </div>
            <Turnstile onVerify={handleTurnstile} onExpire={handleTurnstileExpire} />
            <button
              type="submit"
              disabled={sending}
              className="bg-green-500 hover:bg-green-600 text-black font-bold px-8 py-3 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              {sending ? 'Envoi en cours...' : 'Envoyer le Message'}
            </button>
            {sent && (
              <p className="text-green-400 text-sm animate-fade-in">Message envoyé avec succès !</p>
            )}
            {error && (
              <p className="text-red-400 text-sm animate-fade-in">{error}</p>
            )}
          </form>
        </div>

        {/* Contact Info */}
        <div className="space-y-4">
          <div className="bg-[#111827] border border-gray-800 rounded-xl p-6">
            <h2 className="text-white font-bold text-lg mb-4">Nous Contacter</h2>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-green-400 mt-0.5" />
                <div>
                  <p className="text-white font-medium text-sm">Email</p>
                  <a href="mailto:support@kapitalstores.com" className="text-gray-400 text-sm hover:text-green-400">
                    support@kapitalstores.com
                  </a>
                  <br />
                  <a href="mailto:sales@kapitalstores.com" className="text-gray-400 text-sm hover:text-green-400">
                    sales@kapitalstores.com
                  </a>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-green-400 mt-0.5" />
                <div>
                  <p className="text-white font-medium text-sm">Téléphone</p>
                  <a href="tel:+221761800649" className="text-gray-400 text-sm hover:text-green-400">
                    +221 76 180 06 49
                  </a>
                  <p className="text-gray-600 text-xs mt-0.5">Lun-Ven 9h à 18h</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-green-400 mt-0.5" />
                <div>
                  <p className="text-white font-medium text-sm">Adresse</p>
                  <p className="text-gray-400 text-sm">  Dakar</p>
                  <p className="text-gray-400 text-sm">Sénégal</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
