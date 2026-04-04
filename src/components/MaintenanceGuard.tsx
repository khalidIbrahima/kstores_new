'use client'

import { useEffect, ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useStoreSettings } from '@/hooks/useStoreSettings'

interface Props {
  children: ReactNode
}

export default function MaintenanceGuard({ children }: Props) {
  const { settings, loading } = useStoreSettings()
  const pathname = usePathname()
  const router = useRouter()

  const isAdminRoute = pathname.startsWith('/admin')
  const isMaintenancePage = pathname === '/maintenance'
  const maintenanceMode = !!(settings as Record<string, unknown> | null)?.maintenance_mode

  useEffect(() => {
    if (loading) return
    if (maintenanceMode && !isAdminRoute && !isMaintenancePage) {
      router.replace('/maintenance')
    }
  }, [loading, maintenanceMode, isAdminRoute, isMaintenancePage, router])

  if (loading) return <>{children}</>
  if (maintenanceMode && !isAdminRoute && !isMaintenancePage) return null

  return <>{children}</>
}
