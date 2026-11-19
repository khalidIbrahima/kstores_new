'use client'

import { useEffect } from 'react'
// Importé ici pour capter `beforeinstallprompt` le plus tôt possible (voir src/lib/pwa/install.ts).
import '@/lib/pwa/install'

/**
 * Enregistre le service worker de l'admin, portée « /admin ». Monté uniquement par src/app/admin/layout.tsx :
 * la boutique publique n'a pas de service worker.
 *
 * En développement, aucun worker n'est enregistré (le cache des fichiers /_next/static gênerait le
 * rechargement à chaud) et celui de l'admin est retiré s'il existe.
 */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    const sw = navigator.serviceWorker
    const origin = window.location.origin
    // Cache de l'ancienne version (pages admin comprises). Supprimé à chaque chargement de l'admin : l'ancien
    // worker, tant qu'il contrôle encore l'onglet, peut le recréer juste après sa désinscription.
    window.caches?.delete('ks-admin-v1').catch(() => {})

    sw.getRegistrations()
      .then((regs) =>
        Promise.all(
          regs.map((reg) => {
            const scope = new URL(reg.scope).pathname
            // Ancienne inscription « / » (version qui mettait toutes les pages en cache) : on la retire.
            if (scope === '/') return reg.unregister()
            if (process.env.NODE_ENV !== 'production' && reg.scope.startsWith(`${origin}/admin`)) return reg.unregister()
            return undefined
          }),
        ),
      )
      .then(() => {
        if (process.env.NODE_ENV !== 'production') return
        return sw.register('/sw.js', { scope: '/admin', updateViaCache: 'none' })
      })
      .catch(() => {
        // Échec d'enregistrement : non bloquant, l'admin fonctionne sans.
      })
  }, [])

  return null
}
