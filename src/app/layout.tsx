import type { Metadata, Viewport } from "next"
import "./globals.css"
import LayoutShell from "@/components/LayoutShell"
import PostHogProvider from "@/components/PostHogProvider"
import { CartProvider } from "@/context/CartContext"
import { AuthProvider } from "@/context/AuthContext"
import { ToastProvider } from "@/components/ToastProvider"
import ScrollToTop from "@/components/ScrollToTop"
import MaintenanceGuard from "@/components/MaintenanceGuard"
import ErrorBoundary from "@/components/ErrorBoundary"
import AnalyticsTracker from "@/components/AnalyticsTracker"

export const metadata: Metadata = {
  title: "Kapital Stores - Boutique en ligne",
  description: "Boutique en ligne Kapital Stores - Produits tech, electronique et plus. Livraison rapide, prix bas, qualite garantie.",
  keywords: "boutique en ligne, produits tech, electronique, livraison rapide, Kapital Stores, gaming, Dakar, Sénégal",
  // Pas de manifeste ici : seule l'admin est installable (manifeste lié par src/app/admin/layout.tsx).
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '16x16 32x32 48x48' },
      { url: '/icons/favicon.svg', type: 'image/svg+xml' },
    ],
    apple: { url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
  },
  metadataBase: new URL('https://kapitalstores.com'),
  openGraph: {
    title: "Kapital Stores - Boutique en ligne",
    description: "Boutique en ligne Kapital Stores - Produits tech, electronique et plus. Livraison rapide, prix bas, qualite garantie.",
    locale: "fr_FR",
    type: "website",
    siteName: "Kapital Stores",
    url: "https://kapitalstores.com",
  },
  twitter: {
    card: "summary_large_image",
    site: "@kapital_stores",
  },
}

// Next 16 : le viewport se déclare par cet export (et non plus par une balise <meta> ou `metadata.viewport`).
// Le zoom n'est plus bloqué (ancien `maximum-scale=1, user-scalable=no`) : le zoom automatique d'iOS sur
// les champs de saisie est évité par une règle CSS dans globals.css.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0a0f1a",
  colorScheme: "dark",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <body className="antialiased">
        <AuthProvider>
          <CartProvider>
            <ToastProvider>
              <PostHogProvider>
                <ErrorBoundary>
                  <MaintenanceGuard>
                    <LayoutShell>{children}</LayoutShell>
                  </MaintenanceGuard>
                </ErrorBoundary>
                <ScrollToTop />
                <AnalyticsTracker />
              </PostHogProvider>
            </ToastProvider>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
