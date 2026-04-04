'use client'

import { useState } from 'react'
import { Send } from 'lucide-react'

export default function NewsletterSection() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Erreur lors de l'inscription")
      }
      setSubmitted(true)
      setEmail('')
      setTimeout(() => setSubmitted(false), 5000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'inscription.")
    }
    setLoading(false)
  }

  return (
    <section className="py-16 bg-gradient-to-r from-green-900/10 via-[#060a13] to-green-900/10">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl sm:text-4xl font-black italic text-white">
          Restez <span className="text-green-400">informé</span>
        </h2>
        <p className="text-gray-500 mt-3">
          Abonnez-vous à notre newsletter pour recevoir des mises à jour, des offres exclusives et plus encore !
        </p>

        <form onSubmit={handleSubmit} className="mt-8 flex max-w-md mx-auto">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Entrez votre email"
            required
            className="flex-1 bg-gray-800 border border-gray-700 rounded-l-lg px-4 py-3 text-white outline-none focus:border-green-500 text-sm"
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-green-500 hover:bg-green-600 text-black font-bold px-6 rounded-r-lg transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">S&apos;abonner</span>
          </button>
        </form>

        {submitted && (
          <p className="text-green-400 text-sm mt-3 animate-fade-in">
            Merci pour votre inscription !
          </p>
        )}
        {error && (
          <p className="text-red-400 text-sm mt-3 animate-fade-in">{error}</p>
        )}
      </div>
    </section>
  )
}
