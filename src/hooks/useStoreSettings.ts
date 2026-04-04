'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { StoreSettings } from '@/lib/types'

let cachedSettings: StoreSettings | null = null

export function useStoreSettings() {
  const [settings, setSettings] = useState<StoreSettings | null>(cachedSettings)
  const [loading, setLoading] = useState(!cachedSettings)

  useEffect(() => {
    if (cachedSettings) return

    const fetch = async () => {
      const { data } = await supabase
        .from('store_settings')
        .select('*')
        .single()

      if (data) {
        cachedSettings = data as StoreSettings
        setSettings(data as StoreSettings)
      }
      setLoading(false)
    }

    fetch()
  }, [])

  return { settings, loading }
}
