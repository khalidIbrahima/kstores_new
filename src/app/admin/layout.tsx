'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { useEffect, useState } from 'react'
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  FolderOpen,
  Users,
  Settings,
  ArrowLeft,
  LogOut,
  Loader2,
  BarChart3,
  Boxes,
  CreditCard,
  FileText,
  Truck,
  Factory,
  ClipboardList,
  HeadphonesIcon,
  Menu,
} from 'lucide-react'

const sidebarLinks = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { label: 'Statistiques', href: '/admin/analytics', icon: BarChart3 },
  { label: 'Produits', href: '/admin/products', icon: Package },
  { label: 'Inventaire', href: '/admin/inventory', icon: Boxes },
  { label: 'Commandes', href: '/admin/orders', icon: ShoppingCart },
  { label: 'Paiements', href: '/admin/payments', icon: CreditCard },
  { label: 'Catégories', href: '/admin/categories', icon: FolderOpen },
  { label: 'Clients', href: '/admin/customers', icon: Users },
  { label: 'Clients invites', href: '/admin/guest-customers', icon: Users },
  { label: 'Fournisseurs', href: '/admin/suppliers', icon: Factory },
  { label: 'Commandes fournisseurs', href: '/admin/supplier-orders', icon: ClipboardList },
  { label: 'Livraison', href: '/admin/shipping', icon: Truck },
  { label: 'Rapports', href: '/admin/reports', icon: FileText },
  { label: 'Utilisateurs', href: '/admin/users', icon: Users },
  { label: 'Support', href: '/admin/support', icon: HeadphonesIcon },
  { label: 'Paramètres', href: '/admin/settings', icon: Settings },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { isAdmin, loading, displayName, signOut } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  // While auth is loading, show spinner — NEVER show "Accès refusé"
  // Once loading is done, if user is not admin, silently redirect to home
  useEffect(() => {
    if (!loading && !isAdmin) {
      router.replace('/')
    }
  }, [loading, isAdmin, router])

  // Show spinner while loading OR while redirect is pending for non-admins
  if (loading || !isAdmin) {
    return (
      <div className="min-h-screen bg-[#0a0f1a] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-green-400 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0f1a]">
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-gray-800 bg-[#111827]/95 px-4 py-3 backdrop-blur lg:hidden">
        <button
          onClick={() => setMobileNavOpen(true)}
          className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
          aria-label="Ouvrir le menu admin"
        >
          <Menu className="h-5 w-5" />
        </button>
        <Link href="/admin" className="flex items-center gap-2">
          <img src="/logo.svg" alt="" className="w-8 h-8" />
          <span className="text-base font-black italic"><span className="text-white">KAPITAL</span><span className="text-green-400">STORES</span></span>
        </Link>
        <button
          onClick={() => { signOut(); router.push('/') }}
          className="rounded-lg px-3 py-2 text-xs font-medium text-red-400 transition-colors hover:bg-gray-800"
        >
          Sortir
        </button>
      </div>

      {mobileNavOpen && (
        <button
          aria-label="Fermer le menu admin"
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      <aside className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-gray-800 bg-[#111827] transition-transform duration-200 lg:w-64 lg:translate-x-0 ${mobileNavOpen ? 'translate-x-0' : '-translate-x-full'} lg:z-40`}>
        <div className="p-6 border-b border-gray-800">
          <Link href="/admin" className="flex items-center gap-2.5" onClick={() => setMobileNavOpen(false)}>
            <img src="/logo.svg" alt="" className="w-9 h-9" />
            <div>
              <span className="text-base font-black italic tracking-tight">
                <span className="text-white">KAPITAL</span><span className="text-green-400">STORES</span>
              </span>
              <p className="text-gray-500 text-[10px] mt-0.5">Administration</p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {sidebarLinks.map(link => {
            const isActive = pathname === link.href || (link.href !== '/admin' && pathname.startsWith(link.href))
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileNavOpen(false)}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-green-500/10 text-green-400'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                <link.icon className="w-5 h-5" />
                {link.label}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-gray-800 space-y-2">
          <Link
            href="/"
            onClick={() => setMobileNavOpen(false)}
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Retour boutique
          </Link>
          <button
            onClick={() => { setMobileNavOpen(false); signOut(); router.push('/') }}
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-red-400 hover:bg-gray-800 w-full transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Déconnexion
          </button>
          <div className="px-4 py-2">
            <p className="text-white text-xs font-medium truncate">{displayName}</p>
            <p className="text-gray-600 text-[10px]">Administrateur</p>
          </div>
        </div>
      </aside>

      <main className="min-w-0 px-4 py-4 sm:px-6 sm:py-6 lg:ml-64 lg:p-8">
        {children}
      </main>
    </div>
  )
}
