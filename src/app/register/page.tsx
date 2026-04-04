'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { Mail, Lock, User, Eye, EyeOff, UserPlus } from 'lucide-react'

export default function RegisterPage() {
  const { isAuthenticated, signUpWithEmail, loading } = useAuth()
  const router = useRouter()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (isAuthenticated && !loading) router.push('/')
  }, [isAuthenticated, loading, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (!fullName.trim()) {
      setError('Veuillez entrer votre nom complet')
      return
    }

    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caracteres')
      return
    }

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas')
      return
    }

    setSubmitting(true)

    const result = await signUpWithEmail(email, password, fullName.trim())
    if (result.error) {
      setError(result.error)
    } else {
      setSuccess('Compte cree avec succes ! Verifiez votre email pour confirmer votre inscription.')
    }

    setSubmitting(false)
  }

  if (loading) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center text-gray-500">
        Chargement...
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="bg-[#111827] border border-gray-800 rounded-xl p-8">
        <div className="flex justify-center mb-4">
          <div className="w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center">
            <UserPlus className="w-7 h-7 text-green-400" />
          </div>
        </div>
        <h1 className="text-2xl font-black text-white text-center mb-2">
          Creer un compte
        </h1>
        <p className="text-gray-500 text-sm text-center mb-8">
          Inscrivez-vous pour profiter de tous nos services
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Nom complet</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Prenom Nom"
                required
                className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-3 text-white text-sm outline-none focus:border-green-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="votre@email.com"
                required
                className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-3 text-white text-sm outline-none focus:border-green-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Mot de passe</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Minimum 6 caracteres"
                required
                minLength={6}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-10 py-3 text-white text-sm outline-none focus:border-green-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Confirmer le mot de passe</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Retapez votre mot de passe"
                required
                minLength={6}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-10 py-3 text-white text-sm outline-none focus:border-green-500"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 text-green-400 text-sm">
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-green-500 hover:bg-green-600 text-black font-bold py-3 rounded-lg transition-colors disabled:opacity-50"
          >
            {submitting ? 'Creation en cours...' : 'Creer mon compte'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Deja un compte ?{' '}
          <Link href="/login" className="text-green-400 hover:text-green-300 font-medium">
            Se connecter
          </Link>
        </p>

        <Link
          href="/"
          className="block w-full mt-4 border border-gray-700 hover:border-gray-500 text-gray-400 py-3 rounded-lg transition-colors text-sm text-center"
        >
          Continuer sans inscription
        </Link>
      </div>
    </div>
  )
}
