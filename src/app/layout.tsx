import type { Metadata } from "next"
import "./globals.css"
import LayoutShell from "@/components/LayoutShell"
import PostHogProvider from "@/components/PostHogProvider"
import { CartProvider } from "@/context/CartContext"
import { AuthProvider } from "@/context/AuthContext"
import { ToastProvider } from "@/components/ToastProvider"
import ScrollToTop from "@/components/ScrollToTop"
import DynamicFavicon from "@/components/DynamicFavicon"
import MaintenanceGuard from "@/components/MaintenanceGuard"
import ErrorBoundary from "@/components/ErrorBoundary"

export const metadata: Metadata = {
  title: "Kapital Stores - Boutique en ligne",
  description: "Boutique en ligne Kapital Stores - Produits tech, electronique et plus. Livraison rapide, prix bas, qualite garantie.",
  keywords: "boutique en ligne, produits tech, electronique, livraison rapide, Kapital Stores, gaming, Dakar, Sénégal",
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: "Kapital Stores - Boutique en ligne",
    description: "Boutique en ligne Kapital Stores - Produits tech, electronique et plus. Livraison rapide, prix bas, qualite garantie.",
    locale: "fr_FR",
    type: "website",
    siteName: "Kapital Stores",
  },
  twitter: {
    site: "@kapital_stores",
  },
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
                <DynamicFavicon />
              </PostHogProvider>
            </ToastProvider>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
