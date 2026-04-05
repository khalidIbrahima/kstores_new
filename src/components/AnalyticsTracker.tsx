'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { trackPageVisit } from '@/lib/analytics'

export default function AnalyticsTracker() {
  const pathname = usePathname()
  const lastPath = useRef('')

  useEffect(() => {
    // Only track if path changed (avoid double-fires)
    if (pathname === lastPath.current) return
    lastPath.current = pathname
    trackPageVisit(pathname)
  }, [pathname])

  return null
}
