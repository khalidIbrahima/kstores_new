'use client'

import { useState, useEffect, useCallback } from 'react'
import { MessageSquare, Send, LogIn } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import StarRating from '@/components/StarRating'

interface ReviewWithProfile {
  id: string
  productId: string
  userId: string | null
  rate: number
  comment: string | null
  created_at: string
  profiles: {
    full_name: string
    avatar_url: string | null
  } | null
}

interface ProductReviewsProps {
  productId: string
}

export default function ProductReviews({ productId }: ProductReviewsProps) {
  const { isAuthenticated, profile, displayName } = useAuth()
  const [reviews, setReviews] = useState<ReviewWithProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [newRate, setNewRate] = useState(0)
  const [newComment, setNewComment] = useState('')
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState(false)

  const fetchReviews = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('reviews')
      .select('id, productId, userId, rate, comment, created_at, profiles(full_name, avatar_url)')
      .eq('productId', productId)
      .order('created_at', { ascending: false })

    if (!error && data) {
      setReviews(data as unknown as ReviewWithProfile[])
    }
    setLoading(false)
  }, [productId])

  useEffect(() => {
    fetchReviews()
  }, [fetchReviews])

  const averageRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + (r.rate || 0), 0) / reviews.length
      : 0

  const ratingDistribution = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rate === star).length,
  }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError(null)

    if (newRate === 0) {
      setSubmitError('Veuillez sélectionner une note')
      return
    }

    if (!profile?.id) {
      setSubmitError('Vous devez être connecté')
      return
    }

    setSubmitting(true)

    const { error } = await supabase.from('reviews').insert({
      productId,
      userId: profile.id,
      rate: newRate,
      comment: newComment.trim() || null,
    })

    if (error) {
      setSubmitError('Erreur lors de l\'envoi de l\'avis. Réessayez.')
    } else {
      setNewRate(0)
      setNewComment('')
      setSubmitSuccess(true)
      setTimeout(() => setSubmitSuccess(false), 3000)
      await fetchReviews()
    }

    setSubmitting(false)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div className="space-y-8">
      {/* Summary Section */}
      <div className="bg-[#111827] border border-gray-800 rounded-xl p-6">
        <div className="flex flex-col sm:flex-row gap-6">
          {/* Average Rating */}
          <div className="flex flex-col items-center justify-center sm:min-w-[160px]">
            <span className="text-5xl font-black text-white">
              {averageRating > 0 ? averageRating.toFixed(1) : '—'}
            </span>
            <StarRating rating={averageRating} size={20} />
            <span className="text-gray-400 text-sm mt-1">
              {reviews.length} {reviews.length > 1 ? 'avis' : 'avis'}
            </span>
          </div>

          {/* Rating Distribution */}
          <div className="flex-1 space-y-2">
            {ratingDistribution.map(({ star, count }) => {
              const percentage = reviews.length > 0 ? (count / reviews.length) * 100 : 0
              return (
                <div key={star} className="flex items-center gap-2 text-sm">
                  <span className="text-gray-400 w-8 text-right">{star} ★</span>
                  <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-yellow-400 rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="text-gray-500 w-8 text-right">{count}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Review Form */}
      <div className="bg-[#111827] border border-gray-800 rounded-xl p-6">
        <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-green-400" />
          Laisser un avis
        </h3>

        {isAuthenticated ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Star Rating Input */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">Votre note</label>
              <StarRating
                rating={newRate}
                size={28}
                interactive
                onChange={setNewRate}
              />
            </div>

            {/* Comment */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">
                Votre commentaire (optionnel)
              </label>
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Partagez votre expérience avec ce produit..."
                rows={4}
                className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-4 py-3 text-sm placeholder-gray-500 focus:outline-none focus:border-green-500 transition-colors resize-none"
              />
            </div>

            {submitError && (
              <p className="text-red-400 text-sm">{submitError}</p>
            )}

            {submitSuccess && (
              <p className="text-green-400 text-sm">Merci pour votre avis !</p>
            )}

            <button
              type="submit"
              disabled={submitting || newRate === 0}
              className="bg-green-500 hover:bg-green-600 disabled:bg-gray-700 disabled:text-gray-500 text-black disabled:cursor-not-allowed font-bold text-sm px-6 py-2.5 rounded-lg transition-colors flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              {submitting ? 'Envoi...' : 'Envoyer'}
            </button>
          </form>
        ) : (
          <div className="text-center py-6">
            <LogIn className="w-8 h-8 text-gray-600 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">
              Connectez-vous pour laisser un avis
            </p>
          </div>
        )}
      </div>

      {/* Reviews List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-[#111827] border border-gray-800 rounded-xl p-5 animate-pulse"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-gray-700" />
                <div className="space-y-2">
                  <div className="h-3 w-24 bg-gray-700 rounded" />
                  <div className="h-2 w-16 bg-gray-800 rounded" />
                </div>
              </div>
              <div className="h-3 w-full bg-gray-800 rounded" />
              <div className="h-3 w-2/3 bg-gray-800 rounded mt-2" />
            </div>
          ))}
        </div>
      ) : reviews.length > 0 ? (
        <div className="space-y-4">
          {reviews.map((review) => {
            const name = review.profiles?.full_name || 'Utilisateur'
            const avatarUrl = review.profiles?.avatar_url

            return (
              <div
                key={review.id}
                className="bg-[#111827] border border-gray-800 rounded-xl p-5"
              >
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={name}
                      className="w-10 h-10 rounded-full object-cover border border-gray-700"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-green-400 font-bold text-sm">
                      {getInitials(name)}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                      <span className="text-white text-sm font-medium">{name}</span>
                      <span className="text-gray-600 text-xs">
                        {formatDate(review.created_at)}
                      </span>
                    </div>
                    <div className="mt-1">
                      <StarRating rating={review.rate || 0} size={14} />
                    </div>
                    {review.comment && (
                      <p className="text-gray-400 text-sm mt-2 leading-relaxed">
                        &quot;{review.comment}&quot;
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="bg-[#111827] border border-gray-800 rounded-xl p-8 text-center">
          <MessageSquare className="w-10 h-10 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">
            Aucun avis pour le moment. Soyez le premier à donner votre avis !
          </p>
        </div>
      )}
    </div>
  )
}
