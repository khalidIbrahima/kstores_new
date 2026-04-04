'use client'

import { useEffect } from 'react'
import { useStoreSettings } from '@/hooks/useStoreSettings'

export default function DynamicFavicon() {
  const { settings } = useStoreSettings()

  useEffect(() => {
    if (!settings?.favicon_url) return

    let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
    if (!link) {
      link = document.createElement('link')
      link.rel = 'icon'
      document.head.appendChild(link)
    }
    link.href = settings.favicon_url
  }, [settings?.favicon_url])

  return null
}
