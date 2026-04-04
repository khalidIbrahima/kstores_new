'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'

export function useFavorites() {
  const { profile, isAuthenticated } = useAuth()
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  const fetchFavorites = useCallback(async () => {
    if (!profile?.id) {
      setFavoriteIds(new Set())
      setLoading(false)
      return
    }
    const { data } = await supabase
      .from('favorites')
      .select('product_id')
      .eq('user_id', profile.id)
    setFavoriteIds(new Set((data || []).map(f => f.product_id)))
    setLoading(false)
  }, [profile?.id])

  useEffect(() => { fetchFavorites() }, [fetchFavorites])

  const toggleFavorite = async (productId: string) => {
    if (!profile?.id) return false

    if (favoriteIds.has(productId)) {
      setFavoriteIds(prev => { const s = new Set(prev); s.delete(productId); return s })
      await supabase
        .from('favorites')
        .delete()
        .eq('user_id', profile.id)
        .eq('product_id', productId)
    } else {
      setFavoriteIds(prev => new Set(prev).add(productId))
      await supabase
        .from('favorites')
        .insert({ user_id: profile.id, product_id: productId })
    }
    return true
  }

  const isFavorite = (productId: string) => favoriteIds.has(productId)

  return { favoriteIds, loading, toggleFavorite, isFavorite, isAuthenticated }
}
