import type { Metadata, Viewport } from 'next'
import AdminShell from './AdminShell'
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister'

// Layout serveur : il ne fait qu'exporter les métadonnées PWA de l'admin. L'interface (barre, menu, garde
// d'accès) est inchangée dans AdminShell (composant client).
// L'admin est la seule application installable : manifeste, service worker (portée /admin) et méta iOS ici.
export const metadata: Metadata = {
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    title: 'KS Admin',
    // « black » : barre d'état opaque, le contenu commence sous elle (lisible, pas de chevauchement).
    statusBarStyle: 'black',
  },
  // Next 16 émet seulement `mobile-web-app-capable` ; iOS < 16.4 lit encore la variante préfixée.
  other: { 'apple-mobile-web-app-capable': 'yes' },
}

export const viewport: Viewport = {
  themeColor: '#111827',
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ServiceWorkerRegister />
      <AdminShell>{children}</AdminShell>
    </>
  )
}
